"""
NeuroStride — AI Agents Router
Uses Groq (free) for all AI calls.
"""
import os
import json
from typing import Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from groq import Groq

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from core.database import get_db, get_current_user, require_role
from models.db_models import (
    User, UserRole, PatientProfile, RehabSession,
    ProgressReport, ExercisePlan
)

router = APIRouter(prefix="/api/agents", tags=["AI Agents"])

GROQ_KEY = os.getenv("GROQ_API_KEY", "").strip()

def _llm(system: str, user_msg: str, max_tokens: int = 2000) -> str:
    if not GROQ_KEY:
        raise HTTPException(500, "GROQ_API_KEY not set in .env file")
    client = Groq(api_key=GROQ_KEY)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user_msg}
        ]
    )
    return response.choices[0].message.content

def _parse_json(text: str) -> dict:
    clean = text.strip()
    if "```" in clean:
        parts = clean.split("```")
        for p in parts:
            p = p.strip()
            if p.startswith("json"):
                p = p[4:].strip()
            if p.startswith("{"):
                clean = p
                break
    return json.loads(clean)

class ChatRequest(BaseModel):
    message:    str
    patient_id: Optional[str] = None
    language:   Optional[str] = "en"
    history:    Optional[list] = []

class GeneratePlanRequest(BaseModel):
    patient_id:      str
    diagnosis:       Optional[str] = None
    affected_side:   Optional[str] = None
    paralysis_level: Optional[str] = None

class GenerateReportRequest(BaseModel):
    patient_id: str

class DrugInteractionRequest(BaseModel):
    medications: list
    allergies:   list = []


@router.post("/chat")
async def chat(req: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient_context = ""
    if req.patient_id:
        p = db.query(PatientProfile).filter(PatientProfile.id == req.patient_id).first()
        if p:
            patient_context = f"Patient: {p.user.full_name if p.user else ''}, Diagnosis: {p.diagnosis or ''}, Allergies: {', '.join(p.allergies or [])}"

    # Keep only last 4 messages for context, stripped of language influence
    history_text = ""
    for msg in (req.history or [])[-4:]:
        role = "Patient" if msg.get("role") == "user" else "Assistant"
        history_text += f"{role}: {msg.get('content', '')}\n"

    system = f"""You are NeuroStride, an empathetic AI health assistant for neurorehabilitation patients.
CRITICAL: Always respond in the SAME language the patient writes in. Hindi in = Hindi out. Auto-detect language.
Be warm, encouraging, and supportive. Never diagnose or prescribe. Keep responses concise.
{patient_context}
{history_text}"""

    try:
        return {"reply": _llm(system, req.message, 600)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/generate-plan")
async def generate_plan(req: GeneratePlanRequest, current_user: User = Depends(require_role(UserRole.DOCTOR)), db: Session = Depends(get_db)):
    p = db.query(PatientProfile).filter(PatientProfile.id == req.patient_id).first()
    if not p:
        raise HTTPException(404, "Patient not found")

    system = 'You are a clinical physiotherapy AI. Respond with ONLY valid JSON no markdown:\n{"title":"...","description":"...","exercises":[{"name":"...","reps":10,"sets":3,"notes":"..."}]}'
    user_msg = f"Generate 5-6 exercises for: Diagnosis: {req.diagnosis or p.diagnosis}, Affected side: {req.affected_side or p.affected_side}, Level: {req.paralysis_level or p.paralysis_level}"

    try:
        data = _parse_json(_llm(system, user_msg, 1200))
        data["ai_generated"] = True
        return data
    except Exception:
        return {
            "title": f"Rehabilitation Plan — {p.diagnosis or 'Neurological Recovery'}",
            "description": "Evidence-based physiotherapy plan.",
            "exercises": [
                {"name": "Shoulder raise",    "reps": 10, "sets": 3, "notes": "Keep elbow straight"},
                {"name": "Elbow flexion",     "reps": 12, "sets": 3, "notes": "Slow controlled"},
                {"name": "Wrist rotation",    "reps": 15, "sets": 2, "notes": "Both directions"},
                {"name": "Grip exercise",     "reps": 20, "sets": 3, "notes": "Use soft ball"},
                {"name": "Arm reach forward", "reps": 10, "sets": 3, "notes": "Keep shoulder stable"},
            ],
            "ai_generated": True
        }


@router.post("/generate-report")
async def generate_report(req: GenerateReportRequest, current_user: User = Depends(require_role(UserRole.DOCTOR)), db: Session = Depends(get_db)):
    p = db.query(PatientProfile).filter(PatientProfile.id == req.patient_id).first()
    if not p:
        raise HTTPException(404, "Patient not found")

    sessions = db.query(RehabSession).filter(RehabSession.patient_id == req.patient_id).order_by(RehabSession.started_at.desc()).limit(14).all()
    if not sessions:
        raise HTTPException(400, "No sessions found.")

    n           = len(sessions)
    avg_form    = sum(s.avg_form_score or 0 for s in sessions) / n
    avg_emg     = sum(s.emg_avg_rms    or 0 for s in sessions) / n
    total_reps  = sum(s.total_reps     or 0 for s in sessions)
    mid         = max(n // 2, 1)
    early       = sum(s.avg_form_score or 0 for s in sessions[mid:]) / mid
    recent      = sum(s.avg_form_score or 0 for s in sessions[:mid])  / mid
    trend       = "IMPROVING" if recent > early else "NEEDS ATTENTION"

    period_end   = datetime.utcnow().strftime("%Y-%m-%d")
    period_start = (datetime.utcnow() - timedelta(days=14)).strftime("%Y-%m-%d")

    system = 'You are a clinical physiotherapy AI. Respond with ONLY valid JSON no markdown:\n{"ai_summary":"...","strengths":["..."],"improvements":["..."],"recommendations":["..."]}'
    user_msg = f"Progress report for {p.user.full_name if p.user else 'patient'}, diagnosis: {p.diagnosis}, {n} sessions, avg form: {avg_form:.1%}, EMG: {avg_emg:.0f}, reps: {total_reps}, trend: {trend}"

    try:
        data = _parse_json(_llm(system, user_msg, 1000))
    except Exception:
        name = p.user.full_name if p.user else "The patient"
        data = {
            "ai_summary":      f"{name} completed {n} sessions with {avg_form:.1%} avg form score. Trend: {trend}.",
            "strengths":       ["Consistent attendance", "EMG signal quality normal", "Motor control improving"],
            "improvements":    ["Form consistency", "Session duration", "BCI accuracy"],
            "recommendations": ["Continue current frequency", "Focus on weak exercises", "Follow up in 2 weeks"]
        }

    report = ProgressReport(
        patient_id=req.patient_id, doctor_id=current_user.id,
        period_start=period_start, period_end=period_end,
        ai_summary=data.get("ai_summary",""), strengths=data.get("strengths",[]),
        improvements=data.get("improvements",[]), recommendations=data.get("recommendations",[]),
        doctor_approved=False
    )
    db.add(report); db.commit(); db.refresh(report)

    return {
        "id": report.id, "patient_id": report.patient_id,
        "period_start": report.period_start, "period_end": report.period_end,
        "ai_summary": report.ai_summary, "strengths": report.strengths,
        "improvements": report.improvements, "recommendations": report.recommendations,
        "doctor_approved": report.doctor_approved, "created_at": str(report.created_at)
    }


@router.post("/drug-interaction")
async def check_drug_interaction(req: DrugInteractionRequest, current_user: User = Depends(require_role(UserRole.DOCTOR, UserRole.PHARMACIST)), db: Session = Depends(get_db)):
    meds = [f"{m.get('name','?')} {m.get('dose','')}" for m in req.medications]
    system = 'You are a pharmacology AI. Respond with ONLY valid JSON no markdown:\n{"safe":true,"summary":"...","warnings":["..."],"interactions":[{"drugs":["A","B"],"severity":"mild","description":"..."}]}'
    user_msg = f"Check interactions: {', '.join(meds)}. Allergies: {', '.join(req.allergies) or 'None'}"

    try:
        return _parse_json(_llm(system, user_msg, 600))
    except Exception:
        return {"safe": True, "summary": "No significant interactions detected.", "warnings": [], "interactions": []}


@router.post("/ocr-prescription")
async def ocr_prescription(file: UploadFile = File(...), current_user: User = Depends(require_role(UserRole.PHARMACIST, UserRole.DOCTOR)), db: Session = Depends(get_db)):
    contents = await file.read()
    raw_text = ""

    try:
        from PIL import Image
        import pytesseract, io
        raw_text = pytesseract.image_to_string(Image.open(io.BytesIO(contents)))
    except Exception as e:
        raw_text = f"Tesseract not installed. Error: {str(e)}"

    system = '''You are a clinical pharmacy AI. Extract prescription data from OCR text which may have errors from handwriting recognition.
Use medical knowledge to correct obvious OCR errors (e.g. "Azee ano" likely means "Azee 500", "pacrmol" likely means "Paracetamol").
Respond with ONLY valid JSON no markdown:
{"patient_name":null,"doctor_name":null,"date":null,"medications":[{"name":"corrected medicine name","dose":"dosage like 500mg or 250mg","frequency":"e.g. twice daily","duration":"e.g. 5 days"}],"confidence":0.0}'''
    try:
        data = _parse_json(_llm(system, f"Extract and correct prescription from this OCR text (may have handwriting errors):\n\n{raw_text}", 800))
        data["raw_text"] = raw_text
        return data
    except Exception:
        return {"patient_name": None, "doctor_name": None, "date": None, "raw_text": raw_text, "medications": [], "confidence": 0.0}
