# NeuroStride — System Workflows & Sequence Diagrams

> **Document Version:** 1.0.0  
> **Status:** Active  
> **Created:** 2026-08-11  
> **Owner:** Prathmesh (LTPratham)  
> **Classification:** Internal — Confidential  

---

## 1. Clinical Rehabilitation & Hardware Actuation Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant Headband/Glove as EMG/EEG Sensors
    participant ESP32 as ESP32 / ADS1299 Board
    participant WS as FastAPI WebSocket Bridge
    participant FE as Patient Portal (Frontend)
    participant Servo as Exoskeleton Servo Motors

    Patient->>Headband/Glove: Attempts motor intent (e.g. hand closure)
    Headband/Glove->>ESP32: Transmits microvolt analog signals
    ESP32->>ESP32: Applies IIR 50Hz Notch Filter & FFT Band Analysis
    ESP32-->>Servo: Triggers Servo Flexion (if intent threshold > 75%)
    ESP32->>WS: Streams JSON packet (Delta, Theta, Alpha, Beta, Gamma, FlexionState)
    WS->>FE: Renders live Recharts EMG wave & muscle engagement meter
    FE->>Patient: Displays real-time visual feedback & rep counts
```

---

## 2. Doctor Prescription & PharmaMind Order Routing Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Doctor
    participant DocPortal as Doctor Portal
    participant Backend as FastAPI Server
    participant DB as Database (PostgreSQL/SQLite)
    actor Pharmacist
    participant PharmaPortal as PharmaMind Portal

    Doctor->>DocPortal: Selects Patient & creates prescription
    DocPortal->>Backend: POST /api/prescriptions (medications, dosage, frequency)
    Backend->>DB: Stores prescription record
    Backend->>DB: Finds nearest partner pharmacy (PharmaMind)
    Backend->>DB: Creates PharmacyOrder status="PENDING"
    Backend-->>PharmaPortal: Push notification / Order queue alert
    Pharmacist->>PharmaPortal: Views order & verifies inventory stock
    Pharmacist->>PharmaPortal: Generates GST Invoice & clicks "Fulfill Order"
    PharmaPortal->>Backend: PATCH /api/pharmacy/orders/{id}/status -> "FULFILLED"
    Backend-->>DocPortal: Updates prescription status to "Dispensed"
```
