"""
NeuroStride — Seed Script
Populates the database with realistic demo data for the hackathon.
Run: python seed_data.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from core.database import SessionLocal, hash_password, init_db
from models.db_models import (
    User, UserRole, PatientProfile, DoctorProfile,
    ExercisePlan, Prescription, PharmacyOrder,
    MedicineInventory, RehabSession, ProgressReport
)
from datetime import datetime, timedelta
import random

def seed():
    init_db()
    db = SessionLocal()

    print("Seeding NeuroStride database...")

    # ── Users ──
    doctor = User(
        email="dr.sharma@neurostride.in",
        full_name="Dr. Priya Sharma",
        hashed_password=hash_password("doctor123"),
        role=UserRole.DOCTOR, phone="+91-9876543210", language="en"
    )
    pharmacist = User(
        email="pharmacy@neurostride.in",
        full_name="Raj Patel",
        hashed_password=hash_password("pharmacy123"),
        role=UserRole.PHARMACIST, phone="+91-9876543211", language="en"
    )
    patient1 = User(
        email="ravi@neurostride.in",
        full_name="Ravi Kumar",
        hashed_password=hash_password("patient123"),
        role=UserRole.PATIENT, phone="+91-9876543212", language="hi"
    )
    patient2 = User(
        email="sunita@neurostride.in",
        full_name="Sunita Devi",
        hashed_password=hash_password("patient123"),
        role=UserRole.PATIENT, phone="+91-9876543213", language="hi"
    )
    patient3 = User(
        email="arjun@neurostride.in",
        full_name="Arjun Singh",
        hashed_password=hash_password("patient123"),
        role=UserRole.PATIENT, phone="+91-9876543214", language="pa"
    )

    for u in [doctor, pharmacist, patient1, patient2, patient3]:
        db.add(u)
    db.flush()

    # ── Doctor profile ──
    db.add(DoctorProfile(
        user_id=doctor.id,
        specialization="Neurological Rehabilitation",
        license_number="MCI-2019-45678",
        hospital="AIIMS New Delhi"
    ))

    # ── Patient profiles ──
    p1 = PatientProfile(
        user_id=patient1.id,
        date_of_birth="1978-04-12",
        gender="Male", blood_group="B+",
        weight_kg=72.0, height_cm=168.0,
        diagnosis="Post-stroke hemiplegia — right side",
        affected_side="right", paralysis_level="partial",
        allergies=["penicillin"],
        current_meds=[
            {"name": "Aspirin", "dose": "75mg", "frequency": "once daily"},
            {"name": "Atorvastatin", "dose": "20mg", "frequency": "once daily at night"}
        ],
        emergency_contact="Meena Kumar — +91-9876500001",
        assigned_doctor_id=doctor.id
    )
    p2 = PatientProfile(
        user_id=patient2.id,
        date_of_birth="1965-08-23",
        gender="Female", blood_group="O+",
        weight_kg=58.5, height_cm=155.0,
        diagnosis="Cervical spinal cord injury — C5-C6",
        affected_side="both", paralysis_level="complete",
        allergies=["sulfa drugs", "NSAIDs"],
        current_meds=[
            {"name": "Baclofen", "dose": "10mg", "frequency": "three times daily"},
            {"name": "Gabapentin", "dose": "300mg", "frequency": "twice daily"}
        ],
        emergency_contact="Suresh Devi — +91-9876500002",
        assigned_doctor_id=doctor.id
    )
    p3 = PatientProfile(
        user_id=patient3.id,
        date_of_birth="1990-11-05",
        gender="Male", blood_group="A+",
        weight_kg=80.0, height_cm=178.0,
        diagnosis="Traumatic brain injury with left-side weakness",
        affected_side="left", paralysis_level="mild",
        allergies=[],
        current_meds=[
            {"name": "Levetiracetam", "dose": "500mg", "frequency": "twice daily"}
        ],
        emergency_contact="Harpreet Singh — +91-9876500003",
        assigned_doctor_id=doctor.id
    )
    for p in [p1, p2, p3]:
        db.add(p)
    db.flush()

    # ── Exercise plans ──
    plan1 = ExercisePlan(
        patient_id=p1.id, doctor_id=doctor.id,
        title="Post-Stroke Arm Recovery Phase 1",
        description="Focused on restoring basic arm movement and grip strength on the right side.",
        exercises=[
            {"name": "Shoulder raise", "reps": 10, "sets": 3, "notes": "Keep elbow straight"},
            {"name": "Elbow flexion", "reps": 12, "sets": 3, "notes": "Slow controlled movement"},
            {"name": "Wrist rotation", "reps": 15, "sets": 2, "notes": "Both directions"},
            {"name": "Finger spread", "reps": 20, "sets": 3, "notes": "Hold spread for 2 seconds"},
        ],
        frequency_per_week=5, duration_weeks=6,
        is_active=True, ai_generated=True
    )
    db.add(plan1)
    db.flush()

    # ── Rehab sessions (past 14 days) ──
    for i in range(14):
        day = datetime.utcnow() - timedelta(days=13-i)
        if i % 7 == 6:  # skip Sundays
            continue
        session = RehabSession(
            patient_id=p1.id,
            exercise_plan_id=plan1.id,
            started_at=day.replace(hour=9, minute=0),
            ended_at=day.replace(hour=9, minute=35),
            duration_seconds=2100,
            exercises_completed=[
                {"name": "Shoulder raise", "reps_done": random.randint(7,10), "reps_target": 10, "form_score": round(random.uniform(0.65, 0.92), 2)},
                {"name": "Elbow flexion",  "reps_done": random.randint(9,12), "reps_target": 12, "form_score": round(random.uniform(0.70, 0.95), 2)},
                {"name": "Wrist rotation", "reps_done": random.randint(12,15),"reps_target": 15, "form_score": round(random.uniform(0.60, 0.88), 2)},
            ],
            total_reps=random.randint(28, 37),
            avg_form_score=round(random.uniform(0.70, 0.92), 2),
            emg_peak=round(random.uniform(650, 820), 1),
            emg_avg_rms=round(random.uniform(420, 580), 1),
            intent_count=random.randint(18, 35),
            signal_quality=round(random.uniform(0.78, 0.96), 2),
            session_mode="live"
        )
        db.add(session)

    # ── Prescriptions ──
    rx = Prescription(
        patient_id=p1.id, doctor_id=doctor.id,
        medications=[
            {"name": "Aspirin", "dose": "75mg", "frequency": "once daily", "duration": "ongoing"},
            {"name": "Atorvastatin", "dose": "20mg", "frequency": "once daily at night", "duration": "ongoing"},
            {"name": "Vitamin B12", "dose": "1000mcg", "frequency": "once daily", "duration": "3 months"},
        ],
        notes="Continue physiotherapy 5x/week. Recheck lipid panel in 6 weeks.",
        status="dispensed"
    )
    db.add(rx)
    db.flush()
    db.add(PharmacyOrder(
        prescription_id=rx.id,
        pharmacist_id=pharmacist.id,
        status="dispensed",
        dispensed_at=datetime.utcnow() - timedelta(days=5)
    ))

    # ── Medicine inventory ──
    medicines = [
        ("Aspirin", "Acetylsalicylic Acid", "Antiplatelet", "75mg", "tablet", 450, 50, 2.50),
        ("Atorvastatin", "Atorvastatin Calcium", "Statin", "20mg", "tablet", 320, 50, 8.00),
        ("Baclofen", "Baclofen", "Muscle Relaxant", "10mg", "tablet", 180, 40, 12.00),
        ("Gabapentin", "Gabapentin", "Anticonvulsant", "300mg", "capsule", 95, 30, 15.00),
        ("Vitamin B12", "Cyanocobalamin", "Vitamin", "1000mcg", "tablet", 520, 100, 4.50),
        ("Levetiracetam", "Levetiracetam", "Anticonvulsant", "500mg", "tablet", 18, 25, 22.00),  # Low stock
        ("Diclofenac Gel", "Diclofenac Sodium", "NSAID Topical", "1%", "tube", 8, 20, 35.00),    # Low stock
        ("Pantoprazole", "Pantoprazole Sodium", "PPI", "40mg", "tablet", 260, 50, 5.00),
        ("Calcium + D3", "Calcium Carbonate", "Supplement", "500mg+250IU", "tablet", 380, 80, 6.00),
        ("Amitriptyline", "Amitriptyline HCl", "Antidepressant", "10mg", "tablet", 140, 30, 9.00),
    ]
    for name, generic, cat, strength, unit, stock, reorder, price in medicines:
        db.add(MedicineInventory(
            name=name, generic_name=generic, category=cat,
            strength=strength, unit=unit,
            stock_quantity=stock, reorder_level=reorder, price=price,
            manufacturer="Sun Pharma", expiry_date="2026-12-31"
        ))

    # ── Progress report ──
    db.add(ProgressReport(
        patient_id=p1.id, doctor_id=doctor.id,
        period_start="2025-03-01", period_end="2025-03-23",
        ai_summary=(
            "Ravi Kumar has demonstrated consistent improvement over the past three weeks of rehabilitation. "
            "EMG signal quality has improved from 0.72 to an average of 0.89, indicating strengthening neural "
            "pathways and better muscle activation control. Shoulder raise and elbow flexion exercises show "
            "the strongest progress with form scores consistently above 0.85."
        ),
        strengths=[
            "Consistent session attendance — 12 of 13 scheduled sessions completed",
            "EMG intent detection accuracy improved by 23% over the period",
            "Elbow flexion form score consistently above 0.85"
        ],
        improvements=[
            "Wrist rotation form needs correction — elbow compensation observed",
            "Finger spread exercises showing minimal progress — may need occupational therapy referral",
            "Session fatigue evident in last 15 minutes — consider splitting into two shorter sessions"
        ],
        recommendations=[
            "Progress to Phase 2 exercises if form scores remain above 0.80 for next 5 sessions",
            "Add grip strength training with resistance band",
            "Refer to occupational therapist for fine motor skill assessment"
        ],
        doctor_approved=True,
        doctor_notes="Good progress. Approve Phase 2 transition next week."
    ))

    db.commit()
    print("Seed complete.")
    print("\nLogin credentials:")
    print("  Doctor:     dr.sharma@neurostride.in  / doctor123")
    print("  Pharmacist: pharmacy@neurostride.in   / pharmacy123")
    print("  Patient 1:  ravi@neurostride.in        / patient123")
    print("  Patient 2:  sunita@neurostride.in      / patient123")
    print("  Patient 3:  arjun@neurostride.in       / patient123")
    db.close()

if __name__ == "__main__":
    seed()
