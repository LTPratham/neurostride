# NeuroStride — System Architecture Document

> **Document Version:** 1.0.0  
> **Status:** Active  
> **Created:** 2026-08-11  
> **Owner:** Prathmesh (LTPratham)  
> **Classification:** Internal — Confidential  

---

## 1. Architecture Overview

NeuroStride is an integrated AI-powered neurorehabilitation ecosystem consisting of four primary technical layers:

```
+-----------------------------------------------------------------------------------+
|                                 USER PORTALS                                      |
|   +-------------------+    +--------------------+    +------------------------+   |
|   |  Doctor Portal    |    |   Patient Portal   |    |   PharmaMind Portal    |   |
|   | (Next.js/React)   |    |  (Next.js/React)   |    |    (Next.js/React)     |   |
|   +---------+---------+    +---------+----------+    +-----------+------------+   |
+-------------|------------------------|---------------------------|----------------+
              |                        |                           |
              +------------------------+---------------------------+
                                       | HTTPS / WSS
                                       v
+-----------------------------------------------------------------------------------+
|                              BACKEND API LAYER                                    |
|   +---------------------------------------------------------------------------+   |
|   |                     FastAPI REST & WebSocket Server                       |   |
|   |   - Auth & RBAC (JWT)             - Patient & Session Engine                  |   |
|   |   - Prescription & Orders         - Groq LLM Chatbot & Report Service         |   |
|   |   - Real-time Sensor WSS Bridge   - PyTesseract OCR Scanner                   |   |
|   +---------------------------------------------------------------------------+   |
+--------------------------------------|--------------------------------------------+
                                       | SPI / Serial / Bluetooth
                                       v
+-----------------------------------------------------------------------------------+
|                             HARDWARE & BIOSIGNAL LAYER                            |
|   +------------------------------------+  +-----------------------------------+   |
|   |  Phase 1 MVP Hardware              |  | Phase 3 Commercial Hardware       |   |
|   |  - ESP32-WROOM-32D Board           |  | - ADS1299 8-Channel ESP Kit       |   |
|   |  - Neuphony EXG Synapse            |  | - 24-bit Low-Noise AFE            |   |
|   |  - MG996R Servo Exoskeleton Arm    |  | - Active EEG Headband + EMG Glove |   |
|   +------------------------------------+  +-----------------------------------+   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Component Details

### 2.1 Frontend (Next.js 14 / React 18)
- **Framework:** Next.js 14 App Router, React 18, Tailwind CSS, Lucide Icons, Recharts.
- **Portals:**
  1. **Doctor Portal:** Clinical overview, patient roster, custom exercise plan assignment, prescription writing, AI report generation.
  2. **Patient Portal:** Interactive exercise player, live EMG signal monitor, multilingual AI recovery chatbot, progress analytics.
  3. **PharmaMind Portal:** Automatic incoming order queue, inventory stock management, OCR prescription scanner, GST invoice generator.

### 2.2 Backend (FastAPI / Python 3.11)
- **Framework:** FastAPI, Uvicorn, SQLAlchemy, Alembic.
- **Services:**
  - **Auth:** JWT token authentication with Role-Based Access Control (`DOCTOR`, `PATIENT`, `PHARMACIST`).
  - **AI Engine:** Groq API (`llama-3.3-70b-versatile`) for instant response chatbot and weekly clinical progress report drafting.
  - **Sensor Bridge:** WebSocket server streaming EMG/EEG frequency bands (Delta, Theta, Alpha, Beta, Gamma) at ~20 Hz.
  - **Document Service:** `python-docx` for automated clinical report export and tax-compliant invoice generation.

### 2.3 Hardware & Embedded Bridge
- **Phase 1 MVP:** ESP32 microcontroller receiving raw analog EMG signals, running IIR notch (50Hz) and bandpass filters, executing FFT, and controlling MG996R servo motors for intent-driven finger flexing.
- **Phase 3 Production:** Custom PCB featuring the ADS1299 24-bit ADC, galvanic isolation (ISO7741), battery power management, and ergonomic 3D-printed exoskeleton glove with individual finger motors.
