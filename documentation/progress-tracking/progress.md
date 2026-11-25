# NeuroStride — Progress Tracking

**Last Updated:** 2026-11-19
**Current Phase:** Phase 1 Complete / Phase 2 Planning (Post-Hiatus Audit Done)

---

## Phase 1 — MVP (COMPLETE)

### Backend
- [x] FastAPI core with JWT auth and RBAC
- [x] SQLAlchemy models: User, PatientProfile, DoctorProfile, ExercisePlan, RehabSession, Prescription, PharmacyOrder, MedicineInventory, ProgressReport
- [x] Auth router: register, login, /me
- [x] Patient management endpoints
- [x] Exercise plan CRUD
- [x] Prescription creation with auto-pharmacy routing
- [x] Pharmacy order management and inventory
- [x] AI progress report generation (Groq)
- [x] AI chatbot (Groq + Langfuse)
- [x] Drug interaction check (AI)
- [x] DOCX report and invoice generation (python-docx)
- [x] OCR prescription scanning (pytesseract)
- [x] WebSocket sensor bridge endpoint
- [x] Rate limiting (SlowAPI)
- [x] Seed data scripts (seed_data.py, seed_demo.py, seed_medicines2.py)
- [x] Render deployment (render.yaml)

### Frontend
- [x] Next.js 14 with React 18
- [x] Doctor portal: patient list, patient detail, exercise plans, prescriptions, reports
- [x] Patient portal: dashboard, sessions, sensor feed (EMG visualization), AI chatbot, reports
- [x] PharmaMind: order management, inventory, invoice generation, OCR scanner
- [x] JWT auth flow (login page, token storage, auth context)
- [x] Recharts progress analytics
- [x] Vercel deployment

### Hardware
- [x] neuphony_bridge.py: USB serial connection, IIR filtering, FFT band analysis
- [x] Intent detection + servo arm control
- [x] WebSocket broadcast at ~20 fps
- [x] Simulation mode (--simulate flag)

### Documentation, Media & Investor Materials
- [x] README.md (comprehensive overview + hardware images + working video link)
- [x] CONTRIBUTING.md
- [x] SECURITY.md
- [x] LICENSE (MIT in root and `documentation/licensing/LICENSE.md`)
- [x] Published patent
- [x] CONTRIBUTORS.md
- [x] Hardware Sourcing & Manufacturing Documentation (`hardware-manufacturing-costs.md` & `neurostride-hardware-costs-wearable-v3.docx`)
- [x] **Phase 1 MVP Hardware Photo Integration** (`neurostride_phase1_prototype.jpg`)
- [x] **Phase 3 Production Hardware Photo Integration** (`neurostride_phase3_product.jpg`)
- [x] **Working Demo Video Integration** (`neurostride_demo_video.mp4`, ~124 MB imported from Desktop)
- [x] **Comprehensive Investor Pitch Overview Document** (`investor-pitch-overview.md` with ₹1 Cr Seed Ask, TAM/SAM/SOM, GTM, and media player)
- [x] System Architecture (`system-architecture.md`) & Workflows (`workflows.md`) in `documentation/main-documentation/`
- [x] Dated Implementation Plan (`documentation/implementation-plans/2026-08-11_phase1-and-phase3-investor-docs-video-integration.md`)

---

## Phase 2 — Clinical Hardening (PLANNED: Q3-Q4 2026)

### Security & Compliance
- [ ] AES-256 encryption at rest for PHI (DPDPA 2023)
- [ ] Immutable audit logs for all PHI access events
- [ ] Data retention policy implementation
- [ ] CDSCO SaMD regulatory review

### Infrastructure
- [ ] DOCX/PDF storage migrated to S3/GCS
- [ ] CI/CD pipeline (GitHub Actions: lint, test, security scan, deploy)
- [ ] Redis-backed rate limiting for distributed deployments
- [ ] Upgrade Render to paid tier (eliminate cold starts)

### Product
- [ ] JWT refresh token implementation
- [ ] Adaptive exercise difficulty (LLM-driven)
- [ ] Anomaly detection (EMG/EEG baseline deviation alerts)
- [ ] Real-time push notifications (Firebase FCM)
- [ ] WCAG 2.1 AA accessibility audit + fixes
- [ ] Hindi UI localisation

---

## Phase 3 — Mobile & Scale (PLANNED: Q1-Q2 2027)

- [ ] React Native mobile app (iOS + Android)
- [ ] PWA offline mode
- [ ] Multi-channel EEG (8-channel EXG board)
- [ ] Wireless ESP32 streaming (Wi-Fi / BLE)
- [ ] Kubernetes Helm chart for multi-hospital deployment
- [ ] Multi-tenant SaaS architecture
- [ ] Predictive recovery timeline (ML model)

---

## Phase 4 — Ecosystem Integration (PLANNED: Q3 2027+)

- [ ] ABDM / ABHA health ID linkage
- [ ] HL7 FHIR R4 data export
- [ ] Telemedicine module
- [ ] Clinical trial dashboard
- [ ] 3D-printed exoskeleton (individual finger servo control)
- [ ] ECG monitoring (HRV tracking)
- [ ] MediaPipe pose estimation for form scoring
- [ ] Voice-controlled interface
- [ ] Tamil, Telugu, Bengali, Marathi chatbot localisation

---

## Open Issues

| # | Issue | Priority | Status |
|---|---|---|---|
| OI-01 | DOCX files stored on Render ephemeral disk; lost on redeploy | High | Open |
| OI-02 | No token refresh mechanism; users must re-login every 8 hours | Medium | Open |
| OI-03 | SQLite used in dev; migration to PostgreSQL requires schema review | Medium | Open |
| OI-04 | Langfuse tracing not yet fully integrated across all LLM calls | Low | Open |

---

## Post-Hiatus Audit (2026-11-19)

Comprehensive audit performed after project hiatus. The following bugs were found and fixed:

### Bugs Fixed

| # | File | Bug | Fix Applied |
|---|---|---|---|
| BF-01 | `backend/.env` | Duplicate `SECRET_KEY` entries; second was a literal `<generate>` placeholder | Rewrote entire .env with freshly generated 64-hex secret key; set `ENV=development` |
| BF-02 | `frontend/pages/patient/chat.js` line 66 | `agentApi.chat` response field mismatch — read `response`/`message` but backend returns `reply` | Added `res.data?.reply` as first fallback in the chain |
| BF-03 | `backend/routers/pharmacy.py` line 11 | Tesseract path hardcoded to Windows-only path `C:\Program Files\Tesseract-OCR\tesseract.exe` | Replaced with cross-platform detection using `shutil.which("tesseract")` + OS-conditional fallback |
| BF-04 | `frontend/pages/pharmacy/pharmamind.js` line 45 | `BASE` URL hardcoded to `http://localhost:8000` instead of using env var | Changed to `(process.env.NEXT_PUBLIC_API_URL \|\| 'http://localhost:8000') + '/api/pharmacy2'` |
| BF-05 | `backend/requirements.txt` | `edge-tts` and `pyserial` present in venv but missing from requirements | Added `edge-tts>=6.1.9` and `pyserial>=3.5` |

### Items Verified OK (No Fix Needed)

| # | Item | Status |
|---|---|---|
| V-01 | `backend/core/database.py` — `get_current_user` and `require_role` exports | ✅ Both functions exist and are correctly exported; agents router import will work |
| V-02 | `frontend/components/` directory | ✅ Exists; contains `Layout.js` and `UI.js` as expected |
| V-03 | `frontend/lib/api.js` | ✅ Exists |
| V-04 | `frontend/.env.local` | ✅ Already present with `NEXT_PUBLIC_API_URL=http://localhost:8000` |
| V-05 | `pharmacy.py` Groq model `llama-3.3-70b-versatile` | ✅ Still valid on Groq as of 2026-11-19 |
| V-06 | Python syntax check (`main.py`, `agents.py`, `pharmacy.py`) | ✅ All pass `py_compile` with no errors |

### ⚠️ Items Requiring Manual Attention (User Action Needed)

| # | Item | Action Required |
|---|---|---|
| ⚠️ | `GROQ_API_KEY` in `.env` | Key is ~1 year old — likely expired. Regenerate at https://console.groq.com/ |
| ⚠️ | `LANGFUSE_SECRET_KEY` / `LANGFUSE_PUBLIC_KEY` in `.env` | Keys are ~1 year old — likely expired. Regenerate at https://cloud.langfuse.com/ |
