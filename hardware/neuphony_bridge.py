"""
NeuroStride — Neuphony EXG Synapse Bridge
==========================================
Reads EMG/EEG data from Neuphony EXG Synapse (ESP32-based board).

The Arduino sketch on the board applies:
  - EMG filter: Band-pass Butterworth 75.5–149.5 Hz @ 500 Hz sample rate
  - EEG filter: Band-pass Butterworth 0.5–47.0 Hz @ 250 Hz sample rate
  - ECG filter: Band-pass Butterworth 0.5–40.5 Hz @ 250 Hz sample rate
  - AC notch:   Band-stop 49–51 Hz (50 Hz India) or 59–61 Hz (60 Hz US)

The board sends serial data in one of two formats:
  Format A (default EMG sketch): single integer per line  →  "512\n"
  Format B (multi-channel):      comma-separated          →  "512,498,501\n"

Usage:
    python neuphony_bridge.py --port COM3          # Windows
    python neuphony_bridge.py --port /dev/ttyUSB0  # Linux/Mac
    python neuphony_bridge.py --simulate            # No hardware
    python neuphony_bridge.py                       # Auto-detect port

Install:
    pip install pyserial websockets numpy
"""

import serial
import serial.tools.list_ports
import threading
import time
import math
import random
import json
import argparse
import asyncio
import websockets
from collections import deque
from datetime import datetime

# ── Config ─────────────────────────────────────────────────────────────────
BAUD_RATE     = 115200
SAMPLE_RATE   = 500        # Hz — Neuphony EMG sketch default
BUFFER_SIZE   = 1000       # rolling sample buffer
WS_HOST       = "0.0.0.0"
WS_PORT       = 8765

# EMG intent threshold — signal above this = muscle contraction detected
# Neuphony filtered EMG output range is roughly 0–800 ADC units
# Adjust this based on your patient's muscle strength
EMG_THRESHOLD = 150        # for filtered EMG (post band-pass, centred near 0)

# Servo commands
SERVO_OPEN_CMD  = "OPEN"
SERVO_CLOSE_CMD = "CLOSE"


# ── Python-side IIR filters (mirror the Arduino Synapse.h filters) ──────────
class SynapseFilters:
    """
    Mirrors the exact IIR filter coefficients from Synapse.h.
    Applied on the Python side when the board sends RAW ADC values.
    If the board already applies filters (default), skip these.
    """

    # EMG: Band-pass 75.5–149.5 Hz @ 500 Hz
    def emg_filter(self, input_val: float) -> float:
        return self._biquad_chain(input_val, self._emg_state, self._emg_coeffs)

    # EEG: Band-pass 0.5–47.0 Hz @ 250 Hz
    def eeg_filter(self, input_val: float) -> float:
        return self._biquad_chain(input_val, self._eeg_state, self._eeg_coeffs)

    # ECG: Band-pass 0.5–40.5 Hz @ 250 Hz
    def ecg_filter(self, input_val: float) -> float:
        return self._biquad_chain(input_val, self._ecg_state, self._ecg_coeffs)

    # 50 Hz notch
    def notch_50(self, input_val: float) -> float:
        return self._biquad_chain(input_val, self._n50_state, self._n50_coeffs)

    def apply_emg(self, x: float) -> float:
        return self.notch_50(self.emg_filter(x))

    def apply_eeg(self, x: float) -> float:
        return self.notch_50(self.eeg_filter(x))

    def _biquad_chain(self, x, states, coeffs):
        output = float(x)
        for i, (b0, b1, b2, a1, a2) in enumerate(coeffs):
            z1, z2 = states[i]
            xn = output - a1 * z1 - a2 * z2
            output = b0 * xn + b1 * z1 + b2 * z2
            states[i] = [xn, z1]
        return output

    # EMG filter coefficients (from Synapse.h emg_filter)
    # Format: (b0, b1, b2, a1, a2)
    _emg_coeffs = [
        ( 0.01777130,  0.03554260,  0.01777130,  0.05615394, -0.37044590),
        ( 1.00000000, -2.00000000,  1.00000000,  0.52642081, -0.40238318),
        ( 1.00000000,  2.00000000,  1.00000000, -0.47444498, -0.71086010),
        ( 1.00000000, -2.00000000,  1.00000000,  0.98462817, -0.74630556),
    ]
    _emg_state = [[0.0, 0.0]] * 4

    # EEG filter coefficients (from Synapse.h eeg_filter)
    _eeg_coeffs = [
        ( 0.03701685,  0.07403370,  0.03701685,  0.42615248, -0.08290189),
        ( 1.00000000,  2.00000000,  1.00000000,  0.56685322, -0.48368568),
        ( 1.00000000, -2.00000000,  1.00000000,  1.97658291, -0.97674412),
        ( 1.00000000, -2.00000000,  1.00000000,  1.99039779, -0.99055580),
    ]
    _eeg_state = [[0.0, 0.0]] * 4

    # ECG filter coefficients (from Synapse.h ecg_filter)
    _ecg_coeffs = [
        ( 0.02287021,  0.04574042,  0.02287021,  0.60733220, -0.12650924),
        ( 1.00000000,  2.00000000,  1.00000000,  0.79989305, -0.51645386),
        ( 1.00000000, -2.00000000,  1.00000000,  1.97652009, -0.97668236),
        ( 1.00000000, -2.00000000,  1.00000000,  1.99042357, -0.99058175),
    ]
    _ecg_state = [[0.0, 0.0]] * 4

    # 50 Hz notch coefficients (from Synapse.h remove_AC_noise type=50)
    _n50_coeffs = [
        ( 0.93642755, -0.57892689,  0.93642755,  0.58621390, -0.95447062),
        ( 1.00000000, -0.61822923,  1.00000000,  0.62207340, -0.95474810),
        ( 1.00000000, -0.61822923,  1.00000000,  0.56822557, -0.98081132),
        ( 1.00000000, -0.61822923,  1.00000000,  0.65580392, -0.98109606),
    ]
    _n50_state = [[0.0, 0.0]] * 4


# ── EEG Frequency Band Analyser (FFT) ───────────────────────────────────────
class BandAnalyser:
    """
    Computes EEG/EMG frequency band powers using FFT.
    Uses numpy for accuracy. Falls back to RMS-based estimate if unavailable.

    Bands:
        Delta  0.5–4 Hz   — deep recovery
        Theta  4–8  Hz    — relaxed focus
        Alpha  8–13 Hz    — calm alertness
        Beta   13–30 Hz   — active motor intent (KEY band for BCI)
        Gamma  30–100 Hz  — high concentration / motor burst
    """
    BANDS = {
        'delta': (0.5, 4),
        'theta': (4,   8),
        'alpha': (8,  13),
        'beta':  (13, 30),
        'gamma': (30, 100),
    }
    WINDOW = 512    # ~1s of data at 500Hz

    def __init__(self, sample_rate=SAMPLE_RATE):
        self.fs = sample_rate
        try:
            import numpy
            self._numpy = numpy
            print("[BandAnalyser] numpy available — using FFT band analysis")
        except ImportError:
            self._numpy = None
            print("[BandAnalyser] numpy not found — using RMS fallback. Run: pip install numpy")

    def compute(self, samples: list) -> dict:
        if not samples:
            return {k: 0.0 for k in self.BANDS}
        if self._numpy:
            return self._fft_bands(samples)
        return self._rms_fallback(samples)

    def _fft_bands(self, samples: list) -> dict:
        np  = self._numpy
        sig = np.array(samples[-self.WINDOW:], dtype=float)
        # Apply Hanning window to reduce spectral leakage
        win = np.hanning(len(sig))
        sig = sig * win
        fft_vals = np.abs(np.fft.rfft(sig)) ** 2
        freqs    = np.fft.rfftfreq(len(sig), d=1.0 / self.fs)
        total    = fft_vals.sum() or 1.0
        result   = {}
        for band, (lo, hi) in self.BANDS.items():
            mask = (freqs >= lo) & (freqs < hi)
            result[band] = round(float(fft_vals[mask].sum() / total), 4)
        return result

    def _rms_fallback(self, samples: list) -> dict:
        recent = samples[-50:]
        rms    = math.sqrt(sum(v**2 for v in recent) / max(len(recent), 1))
        base   = min(1.0, rms / 800.0)
        return {
            'delta': round(max(0.01, 0.35 + base * 0.10 + random.gauss(0,.02)), 3),
            'theta': round(max(0.01, 0.20 + base * 0.08 + random.gauss(0,.015)), 3),
            'alpha': round(max(0.01, 0.15 - base * 0.05 + random.gauss(0,.01)), 3),
            'beta':  round(max(0.01, 0.20 + base * 0.18 + random.gauss(0,.02)), 3),
            'gamma': round(max(0.01, 0.10 + base * 0.14 + random.gauss(0,.015)), 3),
        }


# ── Shared sensor buffer ─────────────────────────────────────────────────────
class SensorBuffer:
    def __init__(self):
        self._lock              = threading.Lock()
        self._raw               = deque(maxlen=BUFFER_SIZE)     # raw ADC
        self._filtered          = deque(maxlen=BUFFER_SIZE)     # filtered EMG
        self.emg_rms            = 0.0
        self.intent_detected    = False
        self.contraction_count  = 0
        self.mode               = 'simulation'
        self._last_intent_time  = 0.0
        self._band_analyser     = BandAnalyser()
        self._filters           = SynapseFilters()
        self._bands             = {'delta':.35,'theta':.2,'alpha':.15,'beta':.2,'gamma':.1}
        self._band_update_t     = 0.0

    def push_raw(self, adc_value: float, apply_filter: bool = False):
        """
        Push one raw ADC sample from the Neuphony board.
        apply_filter=True if board sends unfiltered ADC (raw mode).
        apply_filter=False if board already applied Synapse.h filters.
        """
        filtered = self._filters.apply_emg(adc_value) if apply_filter else adc_value
        with self._lock:
            self._raw.append({'v': adc_value,  't': time.time()})
            self._filtered.append({'v': filtered, 't': time.time()})
        self._update_stats(filtered)

    def _update_stats(self, val: float):
        # Rolling RMS over last 100 samples
        with self._lock:
            recent = [s['v'] for s in list(self._filtered)[-100:]]
        if not recent:
            return
        rms = math.sqrt(sum(v**2 for v in recent) / len(recent))
        self.emg_rms = round(rms, 2)

        # Debounced intent detection (500ms cooldown)
        now = time.time()
        if rms > EMG_THRESHOLD:
            if now - self._last_intent_time > 0.5:
                self.intent_detected    = True
                self.contraction_count += 1
                self._last_intent_time  = now
        else:
            self.intent_detected = False

        # Update band powers every 200ms (not every sample)
        if now - self._band_update_t > 0.2:
            with self._lock:
                samples = [s['v'] for s in list(self._filtered)[-512:]]
            self._bands = self._band_analyser.compute(samples)
            self._band_update_t = now

    def snapshot(self) -> dict:
        with self._lock:
            recent = [s['v'] for s in list(self._filtered)[-100:]]
        return {
            'timestamp':    datetime.utcnow().isoformat(),
            'samples':      recent[-50:],      # last 50 filtered values
            'emg_rms':      self.emg_rms,
            'intent':       self.intent_detected,
            'contractions': self.contraction_count,
            'bands':        dict(self._bands),
            'threshold':    EMG_THRESHOLD,
            'mode':         self.mode,
        }


buffer = SensorBuffer()


# ── Hardware reader ──────────────────────────────────────────────────────────
class NeuphonyReader(threading.Thread):
    """
    Reads from Neuphony EXG Synapse over USB serial.

    The default Neuphony Arduino sketch (EMG_Filter example) sends one
    filtered integer per line at SAMPLE_RATE Hz, e.g.:
        "512\n"   or   "512,498\n"   (multi-channel boards)

    To use raw ADC mode, set apply_filter=True so Python applies
    the same Synapse.h IIR filters.
    """
    def __init__(self, port: str, baud: int = BAUD_RATE, apply_filter: bool = False):
        super().__init__(daemon=True)
        self.port         = port
        self.baud         = baud
        self.apply_filter = apply_filter
        self.running      = True

    def run(self):
        try:
            ser = serial.Serial(self.port, self.baud, timeout=2)
            buffer.mode = 'live'
            print(f"[Neuphony] ✓ Connected on {self.port} @ {self.baud} baud")
            print(f"[Neuphony] Sample rate: {SAMPLE_RATE} Hz | Threshold: {EMG_THRESHOLD}")
            time.sleep(2)   # Wait for ESP32 reset after serial open

            while self.running:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if not line:
                    continue
                try:
                    parts = line.split(',')
                    value = float(parts[0])   # channel 0 (EMG electrode)
                    buffer.push_raw(value, apply_filter=self.apply_filter)
                except (ValueError, IndexError):
                    pass    # skip header lines / malformed packets

        except serial.SerialException as e:
            print(f"[Neuphony] ✗ Serial error: {e}")
            print("[Neuphony] Switching to simulation mode")
            SimulationReader().run_inline()
        finally:
            try: ser.close()
            except: pass

    def stop(self):
        self.running = False


# ── Simulation ───────────────────────────────────────────────────────────────
class SimulationReader(threading.Thread):
    """
    Generates synthetic EMG signal that matches Neuphony output characteristics:
    - Baseline: Gaussian noise centred at 0 (post filter removes DC bias)
    - Contractions: Sine burst envelope every 3s, amplitude ~300–400 ADC units
    - Duration: ~0.5s per contraction (realistic for finger flexion)
    """
    def __init__(self):
        super().__init__(daemon=True)
        self.running = True

    def run(self):
        self.run_inline()

    def run_inline(self):
        buffer.mode = 'simulation'
        print("[Simulation] Generating synthetic Neuphony EMG signal @ 500 Hz")
        print(f"[Simulation] Threshold: {EMG_THRESHOLD} | Contractions every ~3s")
        t = 0.0
        contraction_phase = False
        phase_timer = 0.0

        while self.running:
            noise = random.gauss(0, 20)     # baseline noise ~±20 ADC (post-filter)

            # Toggle contraction every 3s, each contraction lasts 0.5s
            phase_timer += 1.0 / SAMPLE_RATE
            if phase_timer >= (0.5 if contraction_phase else 3.0):
                contraction_phase = not contraction_phase
                phase_timer = 0.0

            if contraction_phase:
                # Realistic EMG burst: sine * exponential envelope
                burst_t = phase_timer
                burst = (350 * math.sin(2 * math.pi * 120 * burst_t) *
                         math.exp(-((burst_t - 0.25) / 0.12) ** 2))
            else:
                burst = 0.0

            value = noise + burst
            buffer.push_raw(value, apply_filter=False)

            t += 1.0 / SAMPLE_RATE
            time.sleep(1.0 / SAMPLE_RATE)

    def stop(self):
        self.running = False


# ── Servo controller ─────────────────────────────────────────────────────────
class ServoController:
    """
    Sends OPEN/CLOSE commands to the 3D-printed robotic arm via serial.
    Connect the servo controller Arduino to a second COM port.
    """
    def __init__(self, port: str = None, baud: int = 9600):
        self.state = 'closed'
        self.ser   = None
        if port:
            try:
                self.ser = serial.Serial(port, baud, timeout=1)
                print(f"[Servo] ✓ Connected on {port}")
            except serial.SerialException as e:
                print(f"[Servo] ✗ Could not open {port}: {e} — commands printed only")

    def open_hand(self):
        if self.state == 'open': return
        self.state = 'open'
        self._send(SERVO_OPEN_CMD)
        print("[Servo] ▲ HAND OPEN")

    def close_hand(self):
        if self.state == 'closed': return
        self.state = 'closed'
        self._send(SERVO_CLOSE_CMD)
        print("[Servo] ▼ HAND CLOSED")

    def _send(self, cmd: str):
        if self.ser and self.ser.is_open:
            self.ser.write((cmd + '\n').encode())
        else:
            print(f"[Servo] CMD: {cmd}")


def intent_control_loop(servo: ServoController):
    """Drives servo based on live intent detection at 20 Hz."""
    while True:
        if buffer.intent_detected:
            servo.open_hand()
        else:
            servo.close_hand()
        time.sleep(0.05)


# ── WebSocket server ──────────────────────────────────────────────────────────
async def ws_handler(websocket):
    """Streams sensor data to the frontend at 20 fps."""
    addr = getattr(websocket, 'remote_address', 'unknown')
    print(f"[WS] ✓ Client connected: {addr}")
    try:
        while True:
            await websocket.send(json.dumps(buffer.snapshot()))
            await asyncio.sleep(0.05)
    except websockets.exceptions.ConnectionClosed:
        print(f"[WS] Client disconnected: {addr}")


async def start_ws_server():
    async with websockets.serve(ws_handler, WS_HOST, WS_PORT):
        print(f"[WS] ✓ WebSocket running on ws://localhost:{WS_PORT}")
        print(f"[WS]   Frontend sensor page will auto-connect\n")
        await asyncio.Future()


# ── Port auto-detection ───────────────────────────────────────────────────────
def detect_neuphony_port() -> str | None:
    """
    Scans COM ports for Neuphony EXG Synapse.
    The board uses CP2102 or CH340 USB-UART chip on ESP32.
    """
    KNOWN_CHIPS = ['cp210', 'ch340', 'ch341', 'ft232', 'esp32', 'uart', 'usb serial', 'silicon labs']
    for port in serial.tools.list_ports.comports():
        desc = (port.description or '') + (port.manufacturer or '')
        if any(chip in desc.lower() for chip in KNOWN_CHIPS):
            print(f"[Neuphony] Auto-detected: {port.device} ({port.description})")
            return port.device
    # List all ports if detection fails
    ports = list(serial.tools.list_ports.comports())
    if ports:
        print(f"[Neuphony] Available ports: {[p.device for p in ports]}")
        print(f"[Neuphony] Specify with --port COM3 (Windows) or --port /dev/ttyUSB0 (Linux)")
    return None


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='NeuroStride — Neuphony EXG Synapse Bridge',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python neuphony_bridge.py                      # Auto-detect Neuphony port
  python neuphony_bridge.py --port COM3          # Windows
  python neuphony_bridge.py --port /dev/ttyUSB0  # Linux
  python neuphony_bridge.py --simulate           # No hardware
  python neuphony_bridge.py --port COM3 --servo COM4  # With servo arm
  python neuphony_bridge.py --port COM3 --raw    # Board sends raw ADC (apply Python filters)
        """
    )
    parser.add_argument('--port',     type=str,  help='Neuphony serial port')
    parser.add_argument('--servo',    type=str,  help='Servo arm serial port (optional)')
    parser.add_argument('--simulate', action='store_true', help='Simulation mode')
    parser.add_argument('--raw',      action='store_true', help='Board sends raw ADC — apply Python-side IIR filters')
    parser.add_argument('--threshold',type=int,  default=EMG_THRESHOLD, help=f'Intent threshold (default: {EMG_THRESHOLD})')
    parser.add_argument('--baud',     type=int,  default=BAUD_RATE, help=f'Baud rate (default: {BAUD_RATE})')
    args = parser.parse_args()

    # Apply CLI threshold
    EMG_THRESHOLD = args.threshold

    print("=" * 55)
    print("  NeuroStride — Neuphony EXG Synapse Bridge")
    print("=" * 55)

    # Start data reader
    if args.simulate:
        reader = SimulationReader()
    else:
        port = args.port or detect_neuphony_port()
        if not port:
            print("[!] No port found → simulation mode")
            reader = SimulationReader()
        else:
            reader = NeuphonyReader(port, baud=args.baud, apply_filter=args.raw)

    reader.start()

    # Start servo
    servo = ServoController(servo_port=args.servo)
    servo_thread = threading.Thread(target=intent_control_loop, args=(servo,), daemon=True)
    servo_thread.start()

    # Start WebSocket
    print(f"\n[NeuroStride] Sensor page: http://localhost:3000/patient/sensor")
    print(f"[NeuroStride] WebSocket:   ws://localhost:{WS_PORT}")
    print(f"[NeuroStride] Threshold:   {EMG_THRESHOLD} ADC units")
    print(f"[NeuroStride] Mode:        {'simulation' if args.simulate else 'hardware'}\n")
    asyncio.run(start_ws_server())
