# 🔐 NeuroStride — Security & Data Architecture

> This document explains how NeuroStride handles data security, authentication, and hardware signal storage.

---

## 1. Where is Data Stored?

We use a **two-tier storage strategy:**

- **Local / Demo:** SQLite database (`neurostride.db`) — a single encrypted file on the server, accessed only by the FastAPI backend process. No external network exposure.
- **Production:** PostgreSQL on a managed cloud provider (Render) with **SSL enforced** — `"sslmode": "require"` is set in `core/database.py`. All connections are encrypted in transit.

> Patient data never leaves the server. The frontend talks to the API, and the API talks to the database — the client never touches the database directly.

---

## 2. How is Patient Data Secured?

Three independent security layers protect all patient health information (PHI):

### 🔑 Layer 1 — Passwords: bcrypt Hashing

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

Passwords are **never stored in plain text**. bcrypt automatically adds a random salt, so even two users with the same password produce different hashes. Even if someone obtained the database file, they cannot reverse-engineer passwords.

---

### 🎫 Layer 2 — Authentication: JWT Tokens (HS256)

```python
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24   # 24-hour expiry
```

After login, every user receives a **cryptographically signed JWT token** that expires in 24 hours. Every API call must carry this token in the `Authorization: Bearer` header. The server verifies the signature on every request before executing any logic.

---

### 🚪 Layer 3 — Role-Based Access Control (RBAC)

```python
def require_role(*roles: UserRole)
```

Every sensitive API endpoint enforces role checks:

| Role | Can Access |
|---|---|
| **Patient** | Own profile, own sessions, own prescriptions only |
| **Doctor** | Assigned patients' data, exercise plans, prescriptions |
| **Pharmacist** | Orders and medicine inventory — no clinical notes |

A patient **cannot** see another patient's data. A pharmacist **cannot** create prescriptions. Violations return `HTTP 403 Forbidden` — enforced at the API level on every single request, not just in the UI.

---

## 3. How Are Hardware Signals Stored?

> **We do NOT store raw EMG/EEG signals in the database. That would be terabytes of noise.**

This is by design. Here is the exact data flow:

```
Neuphony EXG Board  →  500 samples/sec via USB serial
         ↓
neuphony_bridge.py  →  In-memory rolling buffer (last 1,000 samples — RAM only)
         ↓
WebSocket (:8765)   →  Streams to frontend at 20 fps for live visualization
         ↓
Session ends        →  Only 6 computed statistics written to the database
```

### What Actually Gets Saved (per session)

| Database Field | What It Represents |
|---|---|
| `emg_peak` | Single highest EMG amplitude in the session |
| `emg_avg_rms` | Average Root Mean Square — overall muscle effort level |
| `intent_count` | Number of successful muscle contractions detected |
| `signal_quality` | Signal quality score (0.0 – 1.0) |
| `avg_form_score` | Exercise form accuracy score |
| `duration_seconds` | Total session length in seconds |

**That is 6 numbers per session — not 500 numbers per second.**

> This is the same approach used by medical-grade wearables like Fitbit and Apple Watch — process on-device, upload only summaries, never raw streams. NeuroStride applies the same principle.

---

## 4. Data Privacy — Who Can See What?

- Every user ID is a **UUID v4** (random 128-bit string) — not a sequential integer. You cannot guess another user's ID by incrementing a number.
- A doctor can only access patients explicitly assigned to them via `assigned_doctor_id`.
- The AI assistant (Groq LLM) only receives **aggregated session statistics** — no raw waveforms, no personally identifiable information in the prompt.
- Langfuse observability logging captures **model inputs/outputs only** — no PHI is logged.

---

## 5. Quick Reference — Security Q&A

| Question | Answer |
|---|---|
| Is data encrypted in transit? | Yes — HTTPS/TLS for the API, SSL for the database connection |
| Is data encrypted at rest? | Passwords are bcrypt hashed. DB encryption at rest is handled by the cloud provider (Render/PostgreSQL) |
| What if someone steals the database? | Passwords are bcrypt hashed (irreversible). JWTs expire in 24h so stolen tokens become useless |
| How is unauthorized API access prevented? | Every endpoint requires a valid signed JWT + role check (HTTP 401/403 on failure) |
| Is raw biometric data stored? | No. Only 6 statistical summaries per session. No waveform data ever hits the database |
| Is the system vulnerable to SQL Injection? | No. SQLAlchemy ORM is used throughout — all queries are parameterized automatically |
| What about CORS? | CORS middleware is configured in FastAPI. In production, `allow_origins` is restricted to the deployed frontend URL |

---

*NeuroStride — Built for LPU Ideathon 2026*
