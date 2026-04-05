# NeuroStride — Setup Guide
# Windows (PowerShell) — Run these IN ORDER

## 1. Prerequisites
Make sure you have installed:
- Python 3.11+   → https://python.org
- Node.js 20+    → https://nodejs.org
- PostgreSQL 15+ → https://postgresql.org
- Git

---

## 2. Clone & setup project

```powershell
# Create project folder
mkdir D:\projects\neurostride
cd D:\projects\neurostride

# Copy the backend folder here, then:
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

---

## 3. Database setup

```powershell
# Open psql (adjust path if needed)
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres

# Inside psql:
CREATE DATABASE neurostride;
CREATE USER neurostride WITH PASSWORD 'neurostride';
GRANT ALL PRIVILEGES ON DATABASE neurostride TO neurostride;
\q
```

---

## 4. Environment variables

```powershell
# Copy the example env file
copy .env.example .env

# Edit .env and fill in:
# - ANTHROPIC_API_KEY  (from console.anthropic.com)
# - LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY (from cloud.langfuse.com — free tier)
# - NEUPHONY_PORT (check Device Manager → Ports for your COM port)
```

---

## 5. Start the backend

```powershell
cd D:\projects\neurostride\backend
venv\Scripts\activate
python seed_data.py         # Seeds demo data (run once)
uvicorn main:app --reload --port 8000
```

API is now running at: http://localhost:8000
Swagger docs at:      http://localhost:8000/docs

---

## 6. Start the Neuphony hardware bridge

```powershell
# In a NEW terminal:
cd D:\projects\neurostride\hardware
venv\Scripts\activate    # same venv

# With real hardware (check COM port in Device Manager first):
python neuphony_bridge.py --port COM3 --servo COM4

# Without hardware (simulation):
python neuphony_bridge.py --simulate
```

Sensor WebSocket at: ws://localhost:8765

---

## 7. Start the frontend

```powershell
# In a NEW terminal:
cd D:\projects\neurostride\frontend
npm install
npm run dev
```

Frontend at: http://localhost:3000

---

## 8. Neuphony Arduino setup (IMPORTANT — do this before the demo)

1. Download Arduino IDE from https://arduino.cc
2. Go to https://github.com/Neuphony/EXG-Synapse
3. Download the repo as ZIP
4. Open Arduino IDE → File → Open → navigate to:
   EXG-Synapse/src/EMG/serial/EMG_serial.ino
5. Select your board: Tools → Board → ESP32 Dev Module
6. Select your port: Tools → Port → (same COM port as Device Manager)
7. Upload the sketch
8. Open Serial Monitor at 115200 baud — you should see numbers streaming

---

## Test credentials (after seed_data.py)
| Role       | Email                          | Password    |
|------------|-------------------------------|-------------|
| Doctor     | dr.sharma@neurostride.in       | doctor123   |
| Pharmacist | pharmacy@neurostride.in        | pharmacy123 |
| Patient 1  | ravi@neurostride.in            | patient123  |
| Patient 2  | sunita@neurostride.in          | patient123  |
| Patient 3  | arjun@neurostride.in           | patient123  |
