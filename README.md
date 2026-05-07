<p align="center">
  <img src="https://img.shields.io/badge/NeuroStride-AI%20Neurorehabilitation-6C63FF?style=for-the-badge&logo=brain&logoColor=white" alt="NeuroStride" />
</p>

<h1 align="center">🧠 NeuroStride</h1>
<h3 align="center">AI-Powered Neurorehabilitation Platform</h3>

<p align="center">
  <em>Empowering stroke & neurological disorder recovery through real-time EMG/EEG biofeedback, LLM-driven clinical intelligence, and an integrated pharmacy management system.</em>
</p>

<p align="center">
  <a href="https://github.com/LTPratham/neurostride/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" />
  </a>
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Groq-LLM-FF6B35?style=flat-square" />
  <img src="https://img.shields.io/badge/Hardware-Neuphony%20EXG-00B4D8?style=flat-square" />
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square" />
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Hardware Setup](#hardware-setup-optional)
- [API Reference](#-api-reference)
- [User Roles & Credentials](#-user-roles--test-credentials)
- [Future Scope](#-future-scope)
- [Patent](#-patent)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**NeuroStride** is an end-to-end neurorehabilitation platform built for stroke survivors, patients with cerebral palsy, traumatic brain injuries, and other neurological conditions. It bridges clinical care with cutting-edge AI and biosignal hardware to deliver personalized, data-driven recovery journeys.

The platform connects three roles — **Doctor**, **Patient**, and **Pharmacist** — in a unified ecosystem, backed by a real-time EMG/EEG biosignal pipeline from the **Neuphony EXG Synapse** board and LLM-powered intelligence via **Groq**.

> 🏆 Built for **LPU Ideathon 2026** — demonstrating how AI can transform neurological rehabilitation in India.

---

## ✨ Key Features

### 🩺 Doctor Portal
- View and manage all assigned patients
- Create personalized exercise plans with repetitions, sets, and goals
- Write digital prescriptions that auto-sync to the pharmacy system
- Review and approve AI-generated progress reports with one click
- Download clinical reports as formatted Word documents

### 🧑‍🦽 Patient Portal
- **Live Sensor Feed** — Real-time EMG waveform visualization with intent detection
- **Guided Exercise Sessions** — Start/end sessions with automatic metric logging
- **AI Chatbot** — Multilingual rehab assistant (English, Hindi) powered by Groq LLM
- **Progress Dashboard** — Recharts-based analytics of rehab trends and milestones
- **Prescription History** — Track medications and pharmacy order status

### 💊 Pharmacist Portal (PharmaMind)
- Auto-receives orders from doctor prescriptions
- Inventory management with low-stock alerts
- Process and dispense orders with status tracking
- Generate itemized tax invoices (PDF/DOCX) with GST calculation

### 🔌 Hardware Integration
- **Neuphony EXG Synapse (ESP32)** — Reads raw EMG/EEG/ECG signals via USB serial
- **Python-side IIR Filters** — Mirror of Synapse.h filter coefficients for offline processing
- **FFT Band Analyser** — Delta / Theta / Alpha / Beta / Gamma power in real-time
- **Servo Arm Control** — Intent-triggered robotic hand (for assistive therapy)
- **WebSocket Bridge** — Streams sensor data to the frontend at 20 fps
- **Simulation Mode** — Realistic synthetic EMG signal for demos without hardware

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         NeuroStride                             │
│                                                                 │
│  ┌──────────────┐     ┌─────────────────┐    ┌──────────────┐  │
│  │  Next.js 14  │────▶│   FastAPI Core  │────│  SQLite /    │  │
│  │  Frontend    │◀────│   (Port 8000)   │    │  PostgreSQL  │  │
│  │  (Port 3000) │     └────────┬────────┘    └──────────────┘  │
│  └──────────────┘              │                                │
│                          ┌─────┴──────┐                        │
│                     ┌────┴───┐   ┌────┴────┐                   │
│                     │  Groq  │   │Langfuse │                   │
│                     │  LLM   │   │Observ.  │                   │
│                     └────────┘   └─────────┘                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Hardware Layer (Optional)                              │   │
│  │  Neuphony EXG ──serial──▶ neuphony_bridge.py            │   │
│  │     (ESP32)               WebSocket :8765 ──▶ Frontend  │   │
│  │                           Servo Controller ──▶ Arm       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer       | Technology                                         |
|-------------|---------------------------------------------------|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy, SQLite/PostgreSQL |
| **Auth**    | JWT (python-jose), Passlib/bcrypt                  |
| **AI**      | Groq (Llama 3.3 / Mixtral), Langfuse observability |
| **Frontend**| Next.js 14, React 18, Recharts, Axios              |
| **Hardware**| Neuphony EXG Synapse (ESP32), PySerial, WebSockets |
| **Docs**    | python-docx (DOCX report & invoice generation)     |
| **Deploy**  | Render (backend), Vercel (frontend)                |

---

## 🚀 Getting Started

### Prerequisites

| Tool       | Version  | Download |
|------------|----------|----------|
| Python     | 3.11+    | [python.org](https://python.org) |
| Node.js    | 20+      | [nodejs.org](https://nodejs.org) |
| Git        | any      | [git-scm.com](https://git-scm.com) |

### Backend Setup

```powershell
# 1. Clone the repo
git clone https://github.com/LTPratham/neurostride.git
cd neurostride

# 2. Create a virtual environment
cd backend
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # Linux / macOS

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
copy .env.example .env           # Windows
# cp .env.example .env           # Linux / macOS
# → Edit .env and fill in your GROQ_API_KEY, SECRET_KEY, etc.

# 5. Seed demo data (first run only)
python seed_data.py

# 6. Start the API server
uvicorn main:app --reload --port 8000
```

**API is running at:** `http://localhost:8000`  
**Swagger docs:** `http://localhost:8000/docs`

---

### Frontend Setup

```powershell
# In a new terminal
cd neurostride/frontend
npm install
npm run dev
```

**Frontend at:** `http://localhost:3000`

---

### Hardware Setup (Optional)

> Skip this if you want to run in simulation mode — the platform works fully without physical hardware.

#### 1. Flash the Arduino Sketch

1. Download [Arduino IDE](https://arduino.cc)
2. Clone the [Neuphony EXG Synapse repo](https://github.com/Neuphony/EXG-Synapse)
3. Open `EXG-Synapse/src/EMG/serial/EMG_serial.ino`
4. Select **Board:** `ESP32 Dev Module`
5. Select **Port:** your COM port (check Device Manager → Ports)
6. Upload the sketch
7. Verify in Serial Monitor at **115200 baud** — you should see numbers streaming

#### 2. Start the Hardware Bridge

```powershell
cd neurostride/hardware

# With real hardware:
python neuphony_bridge.py --port COM3 --servo COM4

# Without hardware (simulation mode):
python neuphony_bridge.py --simulate

# Auto-detect port:
python neuphony_bridge.py
```

**Sensor WebSocket:** `ws://localhost:8765`

---

## 📡 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register` | POST | Register a new user |
| `/api/auth/login` | POST | Login and receive JWT |
| `/api/auth/me` | GET | Get current user info |
| `/api/patients` | GET | List all patients (Doctor/Pharmacist) |
| `/api/patients/{id}` | GET/PUT | Get or update patient profile |
| `/api/sessions` | POST | Start a rehab session |
| `/api/sessions/{id}/end` | PUT | End session with metrics |
| `/api/exercise-plans` | POST | Create exercise plan (Doctor) |
| `/api/prescriptions` | POST | Create prescription (Doctor) |
| `/api/pharmacy/orders` | GET | List pharmacy orders |
| `/api/pharmacy/inventory` | GET | Get medicine inventory |
| `/api/reports/patient/{id}` | GET | Get progress reports |
| `/api/reports/{id}/download` | GET | Download report as DOCX |
| `/ws/sensor/{patient_id}` | WS | Live sensor data stream |

Full interactive documentation: `http://localhost:8000/docs`

---

## 👥 User Roles & Test Credentials

After running `python seed_data.py`:

| Role        | Email                          | Password      |
|-------------|-------------------------------|---------------|
| Doctor      | `dr.sharma@neurostride.in`     | `doctor123`   |
| Pharmacist  | `pharmacy@neurostride.in`      | `pharmacy123` |
| Patient 1   | `ravi@neurostride.in`          | `patient123`  |
| Patient 2   | `sunita@neurostride.in`        | `patient123`  |
| Patient 3   | `arjun@neurostride.in`         | `patient123`  |

---

## 🔭 Future Scope

NeuroStride is built with extensibility at its core. Here's the roadmap for what comes next:

### 🤖 AI & Intelligence
- [ ] **Adaptive Exercise Plans** — LLM automatically adjusts difficulty based on session performance trends
- [ ] **Predictive Recovery Timelines** — ML model trained on session data to forecast recovery milestones
- [ ] **Anomaly Detection** — Alert doctors when EMG/EEG patterns deviate significantly from baseline
- [ ] **Voice-Controlled Interface** — Hands-free navigation for patients with limited motor function
- [ ] **Multi-modal AI** — Integrate computer vision (MediaPipe pose estimation) alongside EMG for form scoring

### 📱 Mobile & Accessibility
- [ ] **React Native App** — Cross-platform mobile app for patients to log sessions remotely
- [ ] **Offline Mode** — PWA support so patients can use the app without internet
- [ ] **Multilingual Expansion** — Add Tamil, Telugu, Bengali, Marathi support to the AI assistant
- [ ] **Accessibility Audit** — WCAG 2.1 AA compliance for visually impaired users

### 🔌 Hardware & Biosignals
- [ ] **Multi-Channel EEG Support** — Upgrade to 8-channel EXG board for full brain mapping
- [ ] **Wireless Streaming** — ESP32 Wi-Fi/BLE mode to eliminate USB cable dependency
- [ ] **3D-Printed Exoskeleton** — Full-hand exoskeleton with individual finger servo control
- [ ] **Wearable Form Factor** — Miniaturized PCB that attaches to the patient's forearm
- [ ] **ECG Monitoring** — Heart rate variability (HRV) tracking during rehab sessions

### 🏥 Clinical & Compliance
- [ ] **ABDM Integration** — Link with India's Ayushman Bharat Digital Mission for health ID interoperability
- [ ] **HIPAA / DPDPA Compliance** — Encrypt PHI at rest, audit logs, data retention policies
- [ ] **Telemedicine Module** — In-platform video consultation between doctor and patient
- [ ] **HL7 FHIR Export** — Standardized health data export for interoperability with hospital systems
- [ ] **Clinical Trial Dashboard** — Aggregate de-identified data for research and outcome studies

### ⚡ Platform & DevOps
- [ ] **Kubernetes Deployment** — Helm chart for production-grade scaling on GKE/EKS
- [ ] **CI/CD Pipeline** — GitHub Actions for automated testing, linting, and deployment
- [ ] **Real-time Notifications** — WebPush notifications for prescription updates and session reminders
- [ ] **Multi-tenant SaaS** — Support multiple hospitals with isolated data namespaces
- [ ] **Analytics Dashboard** — Aggregated, anonymized population-level rehab outcomes

---

## 📜 Patent

NeuroStride's core technology — including its real-time EMG/EEG biofeedback pipeline and AI-assisted neurorehabilitation methodology — is protected by a **published patent**.

| Field | Details |
|---|---|
| **Inventor** | Prathmesh (LTPratham) |
| **Status** | Published |
| **Document** | [`docs/NeuroStride_Patent_Published.pdf`](./docs/NeuroStride_Patent_Published.pdf) |

The full patent document is available in the [`docs/`](./docs/) folder of this repository.

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on branching, commit conventions, and the PR process.

---

## 🔒 Security

Please review our [SECURITY.md](./SECURITY.md) before reporting vulnerabilities. Do **not** open public issues for security bugs.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

<p align="center">
  Built with ❤️ at <strong>LPU Ideathon 2026</strong><br/>
  <em>"Restoring movement. Restoring life."</em>
</p>
