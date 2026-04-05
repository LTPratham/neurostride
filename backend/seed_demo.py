"""
NeuroStride — Demo Seed Data
Run this ONCE before the hackathon demo to populate realistic data.
python seed_demo.py

Creates:
- 3 patients with full profiles, realistic session history showing improvement
- Exercise plans assigned by doctor
- Prescriptions with real medicines
- Progress reports (AI generated + doctor approved)
- Pharmacy orders with bill data
"""
import os, sys, uuid, json, random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.database import hash_password

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neurostride:neurostride@localhost:5432/neurostride")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
Session = sessionmaker(bind=engine)

from models.db_models import (
    Base, User, UserRole, PatientProfile, DoctorProfile,
    RehabSession, ExercisePlan, Prescription, ProgressReport
)

Base.metadata.create_all(bind=engine)

def seed():
    db = Session()

    # ── Check if already seeded ──────────────────────────────────────────────
    if db.query(RehabSession).count() > 20:
        print("Already seeded with rich data. Skipping.")
        db.close()
        return

    print("Seeding demo data...")

    # ── Get existing users ────────────────────────────────────────────────────
    doctor = db.query(User).filter(User.email == "dr.sharma@neurostride.in").first()
    patients_users = db.query(User).filter(User.role == UserRole.PATIENT).all()

    if not doctor or not patients_users:
        print("ERROR: Run the original seed_data.py first to create users.")
        db.close()
        return

    patient_profiles = []
    for u in patients_users:
        p = db.query(PatientProfile).filter(PatientProfile.user_id == u.id).first()
        if p:
            patient_profiles.append(p)

    if not patient_profiles:
        print("ERROR: No patient profiles found. Run seed_data.py first.")
        db.close()
        return

    print(f"Found {len(patient_profiles)} patient profiles")

    # ── Seed rich session data (showing improvement over 14 days) ─────────────
    for profile in patient_profiles:
        # Delete old sessions
        db.query(RehabSession).filter(RehabSession.patient_id == profile.id).delete()

        # Get their exercise plan if exists
        plan = db.query(ExercisePlan).filter(ExercisePlan.patient_id == profile.id).first()

        print(f"  Seeding sessions for {profile.user.full_name if profile.user else profile.id}...")

        for day in range(14, 0, -1):
            date = datetime.utcnow() - timedelta(days=day)

            # Simulate improvement: form score goes from 55% to 85% over 14 days
            progress_factor = (14 - day) / 14
            base_form       = 0.55 + progress_factor * 0.30 + random.uniform(-0.05, 0.05)
            base_form       = max(0.45, min(0.95, base_form))

            # EMG signal gets stronger as patient improves
            emg_rms    = 280 + progress_factor * 200 + random.uniform(-30, 30)
            total_reps = random.randint(35, 60) + int(progress_factor * 20)
            intents    = random.randint(2, 8) + int(progress_factor * 5)
            duration   = random.randint(1200, 2400)  # 20-40 minutes

            session = RehabSession(
                id               = str(uuid.uuid4()),
                patient_id       = profile.id,
                exercise_plan_id = plan.id if plan else None,
                started_at       = date,
                ended_at         = date + timedelta(seconds=duration),
                duration_seconds = duration,
                total_reps       = total_reps,
                avg_form_score   = round(base_form, 3),
                emg_avg_rms      = round(emg_rms, 1),
                intent_count     = intents,
                session_mode     = "simulation",
                notes            = f"Day {15-day} of rehabilitation program"
            )
            db.add(session)

    db.flush()

    # ── Seed exercise plans ────────────────────────────────────────────────────
    for profile in patient_profiles:
        existing = db.query(ExercisePlan).filter(ExercisePlan.patient_id == profile.id).first()
        if not existing:
            diagnosis = profile.diagnosis or "Neurological condition"
            exercises = [
                {"name": "Shoulder Raise",     "reps": 10, "sets": 3, "notes": "Keep elbow straight, slow movement"},
                {"name": "Elbow Flexion",       "reps": 12, "sets": 3, "notes": "Controlled flexion and extension"},
                {"name": "Wrist Rotation",      "reps": 15, "sets": 2, "notes": "Both clockwise and counterclockwise"},
                {"name": "Finger Spread",       "reps": 20, "sets": 3, "notes": "Hold spread position for 2 seconds"},
                {"name": "Grip Strengthening",  "reps": 15, "sets": 3, "notes": "Use soft resistance ball"},
                {"name": "Arm Reach Forward",   "reps": 10, "sets": 3, "notes": "Keep shoulder stable"},
            ]
            plan = ExercisePlan(
                id                 = str(uuid.uuid4()),
                patient_id         = profile.id,
                doctor_id          = doctor.id,
                title              = f"Phase 1 Rehabilitation — {diagnosis}",
                description        = "Evidence-based upper limb rehabilitation program focusing on motor control recovery, strength building, and neuromuscular re-education.",
                exercises          = exercises,
                frequency_per_week = 5,
                duration_weeks     = 8,
                is_active          = True,
                ai_generated       = False
            )
            db.add(plan)
            print(f"  Created exercise plan for {profile.user.full_name if profile.user else ''}")

    db.flush()

    # ── Seed prescriptions ─────────────────────────────────────────────────────
    prescriptions_data = [
        {  # Ravi Kumar — post-stroke
            "medications": [
                {"medicine_name": "Aspirin",       "dose": "75mg",  "frequency": "Once daily",   "duration": "3 months"},
                {"medicine_name": "Atorvastatin",  "dose": "20mg",  "frequency": "Once at night","duration": "3 months"},
                {"medicine_name": "Vitamin B12",   "dose": "1000mcg","frequency":"Once daily",   "duration": "3 months"},
                {"medicine_name": "Baclofen",       "dose": "10mg",  "frequency": "Twice daily",  "duration": "6 weeks"},
            ],
            "notes": "Continue blood pressure monitoring. Avoid NSAIDs. Follow up in 4 weeks."
        },
        {  # Sunita Devi — cervical spinal cord
            "medications": [
                {"medicine_name": "Gabapentin",    "dose": "300mg", "frequency": "Three times daily","duration": "3 months"},
                {"medicine_name": "Baclofen",      "dose": "10mg",  "frequency": "Twice daily",      "duration": "3 months"},
                {"medicine_name": "Vitamin D3",    "dose": "60000 IU","frequency":"Once weekly",     "duration": "8 weeks"},
                {"medicine_name": "Calcium + D3",  "dose": "500mg", "frequency": "Twice daily",      "duration": "3 months"},
            ],
            "notes": "Monitor for dizziness with Gabapentin. Calcium supplementation important for bone health."
        },
        {  # Arjun Singh — TBI
            "medications": [
                {"medicine_name": "Levetiracetam", "dose": "500mg", "frequency": "Twice daily",  "duration": "6 months"},
                {"medicine_name": "Amitriptyline", "dose": "10mg",  "frequency": "Once at night","duration": "3 months"},
                {"medicine_name": "Vitamin B12",   "dose": "1000mcg","frequency":"Once daily",   "duration": "3 months"},
            ],
            "notes": "Avoid alcohol and driving. Report any mood changes immediately."
        }
    ]

    for i, (profile, pdata) in enumerate(zip(patient_profiles, prescriptions_data)):
        existing = db.query(Prescription).filter(Prescription.patient_id == profile.id).first()
        if not existing:
            rx = Prescription(
                id            = str(uuid.uuid4()),
                patient_id    = profile.id,
                doctor_id     = doctor.id,
                medications   = pdata["medications"],
                notes         = pdata["notes"],
                created_at    = datetime.utcnow() - timedelta(days=10)
            )
            db.add(rx)
            print(f"  Created prescription for {profile.user.full_name if profile.user else ''}")

    db.flush()

    # ── Seed progress reports ──────────────────────────────────────────────────
    report_data = [
        {
            "ai_summary": "Ravi Kumar has demonstrated significant improvement over the past 14 sessions. Average form score has improved from 55% to 82%, indicating strong neuroplasticity response. EMG signal strength has increased by 68%, suggesting active motor unit recruitment in the affected right upper limb.",
            "strengths":      ["Consistent daily attendance — 14/14 sessions completed", "EMG signal strength increased by 68% over baseline", "Form score trending strongly upward with 82% latest average", "BCI intent detection accuracy improved from 2 to 9 triggers per session"],
            "improvements":   ["Elbow flexion range still limited to 85% of target", "Morning stiffness reported — suggest warm-up protocol", "Right-hand grip strength below target at 60%"],
            "recommendations":["Advance to Phase 2 exercises — increase resistance", "Add mirror therapy for 15 min daily", "Schedule EMG baseline re-test in 2 weeks", "Continue current medication regimen"]
        },
        {
            "ai_summary": "Sunita Devi shows steady progress in managing cervical spinal cord injury symptoms. Session consistency is excellent at 100%. Form scores show gradual improvement from 48% to 71%, consistent with C5-C6 level injury recovery trajectory. BCI trigger count has doubled, suggesting improved cortical motor pathway activation.",
            "strengths":      ["100% session attendance — exceptional commitment", "BCI trigger count doubled from baseline", "Pain levels reported as decreased (from 7/10 to 4/10)", "Bilateral arm coordination showing improvement"],
            "improvements":   ["Left arm form score lagging behind right (61% vs 78%)", "Session duration could be extended — patient tires at 25 min", "Wrist extension still significantly limited"],
            "recommendations":["Bilateral training protocol recommended", "Occupational therapy referral for ADL training", "Consider TENS unit for wrist extension facilitation", "Reassess in 3 weeks for Phase 2 readiness"]
        },
        {
            "ai_summary": "Arjun Singh is making strong functional gains post-traumatic brain injury. Motor learning appears intact with form scores reaching 88% — the highest in the current cohort. Left-side weakness continues to improve, with EMG readings suggesting active re-innervation. Cognitive engagement during sessions is excellent.",
            "strengths":      ["Highest form score in cohort at 88%", "Fastest improvement trajectory — 33% gain in 14 days", "Left-side weakness reducing — EMG confirms active motor units", "Full session duration completion — cognitive engagement high"],
            "improvements":   ["Fine motor control still requires focused attention", "Occasional coordination lapses noted mid-session", "Balance training not yet started"],
            "recommendations":["Introduce fine motor precision tasks", "Add balance and gait component in next phase", "Consider neuropsychological evaluation", "Excellent candidate for advanced BCI training"]
        }
    ]

    for profile, rdata in zip(patient_profiles, report_data):
        existing = db.query(ProgressReport).filter(ProgressReport.patient_id == profile.id).first()
        if not existing:
            report = ProgressReport(
                id              = str(uuid.uuid4()),
                patient_id      = profile.id,
                doctor_id       = doctor.id,
                period_start    = (datetime.utcnow() - timedelta(days=14)).strftime("%Y-%m-%d"),
                period_end      = datetime.utcnow().strftime("%Y-%m-%d"),
                ai_summary      = rdata["ai_summary"],
                strengths       = rdata["strengths"],
                improvements    = rdata["improvements"],
                recommendations = rdata["recommendations"],
                doctor_approved = True,
                doctor_notes    = "Report reviewed and approved. Patient is progressing well. Continue current plan.",
                created_at      = datetime.utcnow() - timedelta(days=1)
            )
            db.add(report)
            print(f"  Created progress report for {profile.user.full_name if profile.user else ''}")

    db.commit()
    print("\nDemo data seeded successfully!")
    print("\nLogin credentials:")
    print("  Doctor:     dr.sharma@neurostride.in  / doctor123")
    print("  Pharmacist: pharmacy@neurostride.in   / pharmacy123")
    print("  Patient 1:  ravi@neurostride.in        / patient123")
    print("  Patient 2:  sunita@neurostride.in      / patient123")
    print("  Patient 3:  arjun@neurostride.in       / patient123")
    print("\nDemo highlights:")
    print("  - 14 sessions per patient showing clear improvement curve")
    print("  - Form scores trending from ~55% to ~85%")
    print("  - AI progress reports pre-approved by doctor")
    print("  - Exercise plans with 6 exercises each")
    print("  - Prescriptions with real medicines")
    db.close()

if __name__ == "__main__":
    seed()
