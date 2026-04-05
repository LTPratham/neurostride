"""
NeuroStride — FastAPI Main Application
"""
import os
import sys
import json
import asyncio
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from agents.agents import router as agents_router
from routers.pharmacy import router as pharmacy_router, Medicine2, Order2, Prescription2, StockLog2

from core.database import (
    init_db, get_db, hash_password, verify_password,
    create_access_token, get_current_user, require_role
)
from models.db_models import (
    User, UserRole, PatientProfile, DoctorProfile,
    RehabSession, ExercisePlan, Prescription,
    PharmacyOrder, MedicineInventory, ProgressReport
)


# ── App lifecycle ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[NeuroStride] Starting up...")
    init_db()
    print("[NeuroStride] Database ready")
    yield
    print("[NeuroStride] Shutting down")


app = FastAPI(
    title="NeuroStride API",
    description="AI-Powered Neurorehabilitation Platform",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents_router)
app.include_router(pharmacy_router)


# ── Pydantic schemas ──────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: UserRole
    phone: Optional[str] = None
    language: Optional[str] = "en"

class LoginRequest(BaseModel):
    email: str
    password: str

class PatientProfileUpdate(BaseModel):
    date_of_birth:   Optional[str] = None
    gender:          Optional[str] = None
    blood_group:     Optional[str] = None
    weight_kg:       Optional[float] = None
    height_cm:       Optional[float] = None
    diagnosis:       Optional[str] = None
    affected_side:   Optional[str] = None
    paralysis_level: Optional[str] = None
    allergies:       Optional[list] = None
    current_meds:    Optional[list] = None
    emergency_contact: Optional[str] = None

class SessionCreate(BaseModel):
    exercise_plan_id: Optional[str] = None
    session_mode: str = "live"

class SessionUpdate(BaseModel):
    exercises_completed: Optional[list] = None
    total_reps:      Optional[int] = None
    avg_form_score:  Optional[float] = None
    emg_peak:        Optional[float] = None
    emg_avg_rms:     Optional[float] = None
    intent_count:    Optional[int] = None
    signal_quality:  Optional[float] = None
    notes:           Optional[str] = None

class PrescriptionCreate(BaseModel):
    patient_id:  str
    medications: list
    notes:       Optional[str] = None

class ExercisePlanCreate(BaseModel):
    patient_id:         str
    title:              str
    description:        Optional[str] = None
    exercises:          list
    frequency_per_week: int = 5
    duration_weeks:     int = 4

class PharmacyOrderUpdate(BaseModel):
    status: str
    notes:  Optional[str] = None


# ── WebSocket connection manager ──────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}   # room_id → [ws]

    async def connect(self, websocket: WebSocket, room: str):
        await websocket.accept()
        self.active.setdefault(room, []).append(websocket)

    def disconnect(self, websocket: WebSocket, room: str):
        if room in self.active:
            self.active[room] = [ws for ws in self.active[room] if ws != websocket]

    async def broadcast(self, room: str, data: dict):
        dead = []
        for ws in self.active.get(room, []):
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, room)


manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════════════
#  AUTH ROUTES
# ═══════════════════════════════════════════════════════════════════

@app.post("/api/auth/register", tags=["Auth"])
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "Email already registered")

    user = User(
        email=req.email,
        full_name=req.full_name,
        hashed_password=hash_password(req.password),
        role=req.role,
        phone=req.phone,
        language=req.language
    )
    db.add(user)
    db.flush()

    # Auto-create role profile
    if req.role == UserRole.PATIENT:
        db.add(PatientProfile(user_id=user.id))
    elif req.role == UserRole.DOCTOR:
        db.add(DoctorProfile(user_id=user.id))

    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.id, "role": user.role.value})
    return {"access_token": token, "token_type": "bearer", "user": _user_out(user)}


@app.post("/api/auth/login", tags=["Auth"])
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    if not user.is_active:
        raise HTTPException(403, "Account deactivated")

    token = create_access_token({"sub": user.id, "role": user.role.value})
    return {"access_token": token, "token_type": "bearer", "user": _user_out(user)}


@app.get("/api/auth/me", tags=["Auth"])
def get_me(current_user: User = Depends(get_current_user)):
    return _user_out(current_user)


# ═══════════════════════════════════════════════════════════════════
#  PATIENT ROUTES
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/patients", tags=["Patients"])
def list_patients(
    current_user: User = Depends(require_role(UserRole.DOCTOR, UserRole.PHARMACIST)),
    db: Session = Depends(get_db)
):
    profiles = db.query(PatientProfile).all()
    return [_patient_out(p) for p in profiles]


@app.get("/api/patients/{patient_id}", tags=["Patients"])
def get_patient(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(PatientProfile).filter(PatientProfile.id == patient_id).first()
    if not profile:
        raise HTTPException(404, "Patient not found")
    return _patient_out(profile)


@app.put("/api/patients/{patient_id}", tags=["Patients"])
def update_patient(
    patient_id: str,
    data: PatientProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(PatientProfile).filter(PatientProfile.id == patient_id).first()
    if not profile:
        raise HTTPException(404, "Patient not found")

    for field, value in data.dict(exclude_none=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return _patient_out(profile)


@app.post("/api/patients/{patient_id}/assign-doctor", tags=["Patients"])
def assign_doctor(
    patient_id: str,
    doctor_id: str,
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
    db: Session = Depends(get_db)
):
    profile = db.query(PatientProfile).filter(PatientProfile.id == patient_id).first()
    if not profile:
        raise HTTPException(404, "Patient not found")
    profile.assigned_doctor_id = doctor_id
    db.commit()
    return {"message": "Doctor assigned"}


# ═══════════════════════════════════════════════════════════════════
#  REHAB SESSION ROUTES
# ═══════════════════════════════════════════════════════════════════

@app.post("/api/sessions", tags=["Sessions"])
def start_session(
    data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(404, "Patient profile not found")

    session = RehabSession(
        patient_id=profile.id,
        exercise_plan_id=data.exercise_plan_id,
        session_mode=data.session_mode
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _session_out(session)


@app.put("/api/sessions/{session_id}/end", tags=["Sessions"])
def end_session(
    session_id: str,
    data: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(RehabSession).filter(RehabSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")

    session.ended_at = datetime.utcnow()
    if session.started_at:
        delta = (session.ended_at - session.started_at).total_seconds()
        session.duration_seconds = int(delta)

    for field, value in data.dict(exclude_none=True).items():
        setattr(session, field, value)

    db.commit()
    db.refresh(session)
    return _session_out(session)


@app.get("/api/sessions/patient/{patient_id}", tags=["Sessions"])
def get_patient_sessions(
    patient_id: str,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sessions = (
        db.query(RehabSession)
        .filter(RehabSession.patient_id == patient_id)
        .order_by(RehabSession.started_at.desc())
        .limit(limit)
        .all()
    )
    return [_session_out(s) for s in sessions]


# ═══════════════════════════════════════════════════════════════════
#  EXERCISE PLAN ROUTES
# ═══════════════════════════════════════════════════════════════════

@app.post("/api/exercise-plans", tags=["Exercise Plans"])
def create_plan(
    data: ExercisePlanCreate,
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
    db: Session = Depends(get_db)
):
    plan = ExercisePlan(
        patient_id=data.patient_id,
        doctor_id=current_user.id,
        title=data.title,
        description=data.description,
        exercises=data.exercises,
        frequency_per_week=data.frequency_per_week,
        duration_weeks=data.duration_weeks
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return _plan_out(plan)


@app.get("/api/exercise-plans/patient/{patient_id}", tags=["Exercise Plans"])
def get_plans(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plans = db.query(ExercisePlan).filter(
        ExercisePlan.patient_id == patient_id,
        ExercisePlan.is_active == True
    ).all()
    return [_plan_out(p) for p in plans]


# ═══════════════════════════════════════════════════════════════════
#  PRESCRIPTION ROUTES
# ═══════════════════════════════════════════════════════════════════

@app.post("/api/prescriptions", tags=["Prescriptions"])
def create_prescription(
    data: PrescriptionCreate,
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
    db: Session = Depends(get_db)
):
    prescription = Prescription(
        patient_id=data.patient_id,
        doctor_id=current_user.id,
        medications=data.medications,
        notes=data.notes
    )
    db.add(prescription)
    db.flush()

    # Auto-create pharmacy order in OLD system (for backwards compat)
    order = PharmacyOrder(prescription_id=prescription.id)
    db.add(order)

    # Also auto-create Order2 in PharmaMind system so pharmacist sees it immediately
    # Done AFTER main commit so it doesn't block the prescription
    db.commit()
    db.refresh(prescription)

    try:
        from routers.pharmacy import Order2
        from datetime import datetime as dt
        meds_list = data.medications if isinstance(data.medications, list) else []
        items = [
            {
                "name":     str(m.get("name", m.get("medicine_name", "Unknown"))),
                "qty":      1,
                "price":    0,
                "dose":     str(m.get("dose", "")),
                "frequency":str(m.get("frequency", "")),
                "duration": str(m.get("duration", "")),
                "rx":       True,
            }
            for m in meds_list if isinstance(m, dict)
        ]
        patient_profile = db.query(PatientProfile).filter(
            PatientProfile.id == data.patient_id
        ).first()
        patient_name    = patient_profile.user.full_name if patient_profile and patient_profile.user else "Patient"
        patient_user_id = patient_profile.user_id if patient_profile else None
        order2_code     = f"RX-{dt.now().strftime('%y%m%d')}-{db.query(Order2).count()+1:03d}"
        order2 = Order2(
            order_code     = order2_code,
            user_id        = patient_user_id,
            patient_label  = patient_name,
            items          = items,
            total          = 0,
            status         = "pending",
            payment_status = "Prescription",
            prescription_id= prescription.id,
        )
        db.add(order2)
        db.commit()
        print(f"[PharmaMind] Auto-created Order2 {order2_code} for {patient_name}")
    except Exception as e:
        db.rollback()
        print(f"[PharmaMind] Could not auto-create Order2 (non-fatal): {e}")
    db.refresh(prescription)
    return _prescription_out(prescription)


@app.get("/api/prescriptions/patient/{patient_id}", tags=["Prescriptions"])
def get_prescriptions(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prescriptions = db.query(Prescription).filter(
        Prescription.patient_id == patient_id
    ).order_by(Prescription.created_at.desc()).all()
    return [_prescription_out(p) for p in prescriptions]


# ═══════════════════════════════════════════════════════════════════
#  PHARMACY ROUTES
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/pharmacy/orders", tags=["Pharmacy"])
def get_orders(
    status: Optional[str] = None,
    current_user: User = Depends(require_role(UserRole.PHARMACIST, UserRole.DOCTOR)),
    db: Session = Depends(get_db)
):
    q = db.query(PharmacyOrder)
    if status:
        q = q.filter(PharmacyOrder.status == status)
    return [_order_out(o) for o in q.order_by(PharmacyOrder.created_at.desc()).all()]


@app.put("/api/pharmacy/orders/{order_id}", tags=["Pharmacy"])
def update_order(
    order_id: str,
    data: PharmacyOrderUpdate,
    current_user: User = Depends(require_role(UserRole.PHARMACIST)),
    db: Session = Depends(get_db)
):
    order = db.query(PharmacyOrder).filter(PharmacyOrder.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    order.status = data.status
    order.pharmacist_id = current_user.id
    if data.notes:
        order.notes = data.notes
    if data.status == "dispensed":
        order.dispensed_at = datetime.utcnow()
        order.prescription.status = "dispensed"
    db.commit()
    return _order_out(order)


@app.get("/api/pharmacy/inventory", tags=["Pharmacy"])
def get_inventory(
    current_user: User = Depends(require_role(UserRole.PHARMACIST, UserRole.DOCTOR)),
    db: Session = Depends(get_db)
):
    items = db.query(MedicineInventory).order_by(MedicineInventory.name).all()
    return [_inventory_out(i) for i in items]


@app.get("/api/pharmacy/inventory/low-stock", tags=["Pharmacy"])
def low_stock_alert(
    current_user: User = Depends(require_role(UserRole.PHARMACIST)),
    db: Session = Depends(get_db)
):
    items = db.query(MedicineInventory).filter(
        MedicineInventory.stock_quantity <= MedicineInventory.reorder_level
    ).all()
    return [_inventory_out(i) for i in items]


@app.get("/api/pharmacy/search", tags=["Pharmacy"])
def search_medicines(
    q: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not q or len(q) < 2:
        return []
    items = db.query(MedicineInventory).filter(
        MedicineInventory.name.ilike(f"%{q}%")
    ).order_by(MedicineInventory.name).limit(8).all()
    return [_inventory_out(i) for i in items]


class StockUpdateBody(BaseModel):
    stock_quantity: int
    reorder_level: Optional[int] = None


@app.put("/api/pharmacy/inventory/{item_id}/stock", tags=["Pharmacy"])
def update_stock(
    item_id: str,
    data: StockUpdateBody,
    current_user: User = Depends(require_role(UserRole.PHARMACIST)),
    db: Session = Depends(get_db)
):
    item = db.query(MedicineInventory).filter(MedicineInventory.id == item_id).first()
    if not item:
        raise HTTPException(404, "Medicine not found")
    item.stock_quantity = data.stock_quantity
    if data.reorder_level is not None:
        item.reorder_level = data.reorder_level
    db.commit()
    db.refresh(item)
    return _inventory_out(item)


# ═══════════════════════════════════════════════════════════════════
#  PROGRESS REPORT ROUTES
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/reports/patient/{patient_id}", tags=["Reports"])
def get_reports(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reports = db.query(ProgressReport).filter(
        ProgressReport.patient_id == patient_id
    ).order_by(ProgressReport.created_at.desc()).all()
    return [_report_out(r) for r in reports]


@app.put("/api/reports/{report_id}/approve", tags=["Reports"])
def approve_report(
    report_id: str,
    doctor_notes: Optional[str] = None,
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
    db: Session = Depends(get_db)
):
    report = db.query(ProgressReport).filter(ProgressReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")
    report.doctor_approved = True
    report.doctor_notes    = doctor_notes
    db.commit()
    return _report_out(report)


# ═══════════════════════════════════════════════════════════════════
#  REPORT DOWNLOAD — Word Document
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/reports/{report_id}/download", tags=["Reports"])
def download_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate and download a progress report as a Word document."""
    from docx import Document
    from docx.shared import Pt, RGBColor, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    import io
    from fastapi.responses import StreamingResponse

    report = db.query(ProgressReport).filter(ProgressReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")

    patient = db.query(PatientProfile).filter(PatientProfile.id == report.patient_id).first()
    patient_name = patient.user.full_name if patient and patient.user else "Patient"
    diagnosis    = patient.diagnosis or "Neurological condition" if patient else "Neurological condition"

    doc = Document()

    # Title
    title = doc.add_heading("NeuroStride — AI Progress Report", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.runs[0].font.color.rgb = RGBColor(47, 123, 232)

    doc.add_paragraph()

    # Meta table
    table = doc.add_table(rows=5, cols=2)
    table.style = "Table Grid"
    meta = [
        ("Patient",       patient_name),
        ("Diagnosis",     diagnosis),
        ("Period",        f"{report.period_start} — {report.period_end}"),
        ("Generated",     str(report.created_at)[:10]),
        ("Status",        "Doctor Approved" if report.doctor_approved else "Pending Approval"),
    ]
    for i, (k, v) in enumerate(meta):
        table.rows[i].cells[0].text = k
        table.rows[i].cells[1].text = v
        table.rows[i].cells[0].paragraphs[0].runs[0].bold = True

    doc.add_paragraph()

    # AI Summary
    doc.add_heading("Clinical Summary", 1)
    doc.add_paragraph(report.ai_summary or "No summary available.")

    doc.add_paragraph()

    # Strengths
    if report.strengths:
        doc.add_heading("Strengths", 1)
        for s in report.strengths:
            doc.add_paragraph(f"✓  {s}", style="List Bullet")

    doc.add_paragraph()

    # Areas for improvement
    if report.improvements:
        doc.add_heading("Areas for Improvement", 1)
        for imp in report.improvements:
            doc.add_paragraph(f"→  {imp}", style="List Bullet")

    doc.add_paragraph()

    # Recommendations
    if report.recommendations:
        doc.add_heading("Doctor Recommendations", 1)
        for rec in report.recommendations:
            doc.add_paragraph(f"•  {rec}", style="List Bullet")

    # Doctor notes
    if report.doctor_notes:
        doc.add_paragraph()
        doc.add_heading("Doctor Notes", 1)
        p = doc.add_paragraph(report.doctor_notes)
        p.runs[0].italic = True

    # Footer
    doc.add_paragraph()
    footer = doc.add_paragraph("Generated by NeuroStride AI Rehabilitation Platform | Ideathon LPU 2026")
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer.runs[0].font.size = Pt(8)
    footer.runs[0].font.color.rgb = RGBColor(139, 148, 158)

    # Save to bytes
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)

    filename = f"NeuroStride_Report_{patient_name.replace(' ','_')}_{report.period_end}.docx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ═══════════════════════════════════════════════════════════════════
#  BILL / INVOICE GENERATION
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/pharmacy/orders/{order_id}/bill", tags=["Pharmacy"])
def download_bill(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate and download a pharmacy bill as a Word document."""
    from docx import Document
    from docx.shared import Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    import io
    from fastapi.responses import StreamingResponse

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")

    doc = Document()

    # Header
    title = doc.add_heading("NeuroStride PharmaMind", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.runs[0].font.color.rgb = RGBColor(252, 109, 38)

    sub = doc.add_paragraph("AI-Powered Pharmacy · Ideathon LPU 2026")
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.runs[0].font.size = Pt(10)

    doc.add_paragraph()

    # Bill details
    doc.add_heading("Tax Invoice", 1)
    table = doc.add_table(rows=4, cols=2)
    table.style = "Table Grid"
    from datetime import datetime as _dt
    details = [
        ("Invoice No.",  f"INV-{order.id[:8].upper()}"),
        ("Order Code",   order.order_code or str(order.id)[:8]),
        ("Date",         str(order.created_at)[:10]),
        ("Patient",      order.patient_id or "Walk-in"),
    ]
    for i, (k, v) in enumerate(details):
        table.rows[i].cells[0].text = k
        table.rows[i].cells[1].text = str(v)
        table.rows[i].cells[0].paragraphs[0].runs[0].bold = True

    doc.add_paragraph()

    # Items table
    doc.add_heading("Medicines", 1)
    items = order.medications or []
    if items:
        item_table = doc.add_table(rows=1 + len(items), cols=4)
        item_table.style = "Table Grid"
        headers = ["Medicine", "Qty", "Unit Price (₹)", "Total (₹)"]
        for j, h in enumerate(headers):
            cell = item_table.rows[0].cells[j]
            cell.text = h
            cell.paragraphs[0].runs[0].bold = True

        subtotal = 0
        for i, item in enumerate(items):
            qty   = item.get("quantity", 1)
            price = item.get("price", 0)
            total = qty * price
            subtotal += total
            row = item_table.rows[i + 1]
            row.cells[0].text = item.get("medicine_name", item.get("name", "?"))
            row.cells[1].text = str(qty)
            row.cells[2].text = f"₹{price:.2f}"
            row.cells[3].text = f"₹{total:.2f}"
    else:
        doc.add_paragraph("No items recorded.")
        subtotal = order.total or 0

    doc.add_paragraph()

    # Totals
    service_fee = round(subtotal * 0.02, 2)
    gst         = round(subtotal * 0.18, 2)
    grand_total = round(subtotal + service_fee + gst, 2)

    totals_table = doc.add_table(rows=4, cols=2)
    totals_table.style = "Table Grid"
    for i, (k, v) in enumerate([
        ("Subtotal",            f"₹{subtotal:.2f}"),
        ("Service Charge (2%)", f"₹{service_fee:.2f}"),
        ("GST @ 18%",           f"₹{gst:.2f}"),
        ("GRAND TOTAL",         f"₹{grand_total:.2f}"),
    ]):
        totals_table.rows[i].cells[0].text = k
        totals_table.rows[i].cells[1].text = v
        if i == 3:
            totals_table.rows[i].cells[0].paragraphs[0].runs[0].bold = True
            totals_table.rows[i].cells[1].paragraphs[0].runs[0].bold = True

    doc.add_paragraph()
    footer = doc.add_paragraph("Thank you for choosing NeuroStride PharmaMind 💊 | Keep medicines out of reach of children.")
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer.runs[0].font.size = Pt(9)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)

    filename = f"NeuroStride_Bill_{order.order_code or order.id}.docx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ═══════════════════════════════════════════════════════════════════
#  WEBSOCKET — Live sensor data relay
# ═══════════════════════════════════════════════════════════════════

@app.websocket("/ws/sensor/{patient_id}")
async def sensor_websocket(websocket: WebSocket, patient_id: str):
    """
    Relays live EMG/EEG sensor data to the frontend.
    The hardware bridge (neuphony_bridge.py) connects to ws://localhost:8765
    and we fan out to patient-specific rooms here.
    """
    await manager.connect(websocket, f"sensor_{patient_id}")
    try:
        while True:
            # In production: this receives from the hardware bridge pub/sub
            # For now: echo back any message received (bridge pushes here)
            data = await websocket.receive_text()
            await manager.broadcast(f"sensor_{patient_id}", json.loads(data))
    except WebSocketDisconnect:
        manager.disconnect(websocket, f"sensor_{patient_id}")


@app.websocket("/ws/session/{session_id}")
async def session_websocket(websocket: WebSocket, session_id: str):
    """Real-time session updates — form scores, rep counts."""
    await manager.connect(websocket, f"session_{session_id}")
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"session_{session_id}", json.loads(data))
    except WebSocketDisconnect:
        manager.disconnect(websocket, f"session_{session_id}")


# ═══════════════════════════════════════════════════════════════════
#  HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/health", tags=["System"])
def health():
    return {"status": "ok", "service": "NeuroStride API", "version": "1.0.0"}


# ═══════════════════════════════════════════════════════════════════
#  Serializers
# ═══════════════════════════════════════════════════════════════════

def _user_out(u: User) -> dict:
    data = {
        "id": u.id, "email": u.email, "full_name": u.full_name,
        "role": u.role.value, "phone": u.phone, "language": u.language,
        "created_at": str(u.created_at),
        "profile_id": None
    }
    # Include patient profile_id so frontend uses correct ID for all API calls
    try:
        if u.role == UserRole.PATIENT and u.patient_profile:
            data["profile_id"] = u.patient_profile.id
    except Exception:
        pass
    return data

def _patient_out(p: PatientProfile) -> dict:
    return {
        "id": p.id, "user_id": p.user_id,
        "full_name": p.user.full_name if p.user else None,
        "email": p.user.email if p.user else None,
        "date_of_birth": p.date_of_birth, "gender": p.gender,
        "blood_group": p.blood_group, "weight_kg": p.weight_kg,
        "height_cm": p.height_cm, "diagnosis": p.diagnosis,
        "affected_side": p.affected_side, "paralysis_level": p.paralysis_level,
        "allergies": p.allergies, "current_meds": p.current_meds,
        "emergency_contact": p.emergency_contact,
        "assigned_doctor_id": p.assigned_doctor_id
    }

def _session_out(s: RehabSession) -> dict:
    return {
        "id": s.id, "patient_id": s.patient_id,
        "exercise_plan_id": s.exercise_plan_id,
        "started_at": str(s.started_at), "ended_at": str(s.ended_at) if s.ended_at else None,
        "duration_seconds": s.duration_seconds,
        "exercises_completed": s.exercises_completed,
        "total_reps": s.total_reps, "avg_form_score": s.avg_form_score,
        "emg_peak": s.emg_peak, "emg_avg_rms": s.emg_avg_rms,
        "intent_count": s.intent_count, "signal_quality": s.signal_quality,
        "session_mode": s.session_mode, "notes": s.notes
    }

def _plan_out(p: ExercisePlan) -> dict:
    return {
        "id": p.id, "patient_id": p.patient_id, "doctor_id": p.doctor_id,
        "title": p.title, "description": p.description,
        "exercises": p.exercises, "frequency_per_week": p.frequency_per_week,
        "duration_weeks": p.duration_weeks, "is_active": p.is_active,
        "ai_generated": p.ai_generated, "created_at": str(p.created_at)
    }

def _prescription_out(p: Prescription) -> dict:
    return {
        "id": p.id, "patient_id": p.patient_id, "doctor_id": p.doctor_id,
        "medications": p.medications, "notes": p.notes,
        "status": p.status, "created_at": str(p.created_at),
        "ai_interaction_check": p.ai_interaction_check
    }

def _order_out(o: PharmacyOrder) -> dict:
    return {
        "id": o.id, "prescription_id": o.prescription_id,
        "pharmacist_id": o.pharmacist_id, "status": o.status,
        "notes": o.notes, "created_at": str(o.created_at),
        "dispensed_at": str(o.dispensed_at) if o.dispensed_at else None
    }

def _inventory_out(i: MedicineInventory) -> dict:
    return {
        "id": i.id, "name": i.name, "generic_name": i.generic_name,
        "category": i.category, "strength": i.strength, "unit": i.unit,
        "stock_quantity": i.stock_quantity, "reorder_level": i.reorder_level,
        "price": i.price, "manufacturer": i.manufacturer, "expiry_date": i.expiry_date
    }

def _report_out(r: ProgressReport) -> dict:
    return {
        "id": r.id, "patient_id": r.patient_id, "doctor_id": r.doctor_id,
        "period_start": r.period_start, "period_end": r.period_end,
        "ai_summary": r.ai_summary, "strengths": r.strengths,
        "improvements": r.improvements, "recommendations": r.recommendations,
        "docx_path": r.docx_path, "doctor_approved": r.doctor_approved,
        "doctor_notes": r.doctor_notes, "created_at": str(r.created_at)
    }
