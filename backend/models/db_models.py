"""
NeuroStride — Database Models
"""
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text,
    DateTime, ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import uuid
import enum

Base = declarative_base()

def gen_uuid():
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    PATIENT    = "patient"
    DOCTOR     = "doctor"
    PHARMACIST = "pharmacist"


class User(Base):
    __tablename__ = "users"

    id              = Column(String, primary_key=True, default=gen_uuid)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    full_name       = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(Enum(UserRole), nullable=False)
    phone           = Column(String(20))
    language        = Column(String(10), default="en")
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    patient_profile = relationship(
        "PatientProfile",
        back_populates="user",
        uselist=False,
        foreign_keys="PatientProfile.user_id"
    )
    doctor_profile  = relationship("DoctorProfile", back_populates="user", uselist=False)


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id                 = Column(String, primary_key=True, default=gen_uuid)
    user_id            = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    date_of_birth      = Column(String(20))
    gender             = Column(String(20))
    blood_group        = Column(String(5))
    weight_kg          = Column(Float)
    height_cm          = Column(Float)
    diagnosis          = Column(Text)
    affected_side      = Column(String(10))
    paralysis_level    = Column(String(50))
    allergies          = Column(JSON, default=list)
    current_meds       = Column(JSON, default=list)
    emergency_contact  = Column(String(255))
    assigned_doctor_id = Column(String, ForeignKey("users.id"), nullable=True)

    user = relationship(
        "User",
        back_populates="patient_profile",
        foreign_keys=[user_id]
    )
    assigned_doctor = relationship(
        "User",
        foreign_keys=[assigned_doctor_id]
    )
    sessions         = relationship("RehabSession",    back_populates="patient")
    prescriptions    = relationship("Prescription",    back_populates="patient")
    progress_reports = relationship("ProgressReport",  back_populates="patient")


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id              = Column(String, primary_key=True, default=gen_uuid)
    user_id         = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    specialization  = Column(String(100))
    license_number  = Column(String(50))
    hospital        = Column(String(255))

    user = relationship("User", back_populates="doctor_profile")


class ExercisePlan(Base):
    __tablename__ = "exercise_plans"

    id                 = Column(String, primary_key=True, default=gen_uuid)
    patient_id         = Column(String, ForeignKey("patient_profiles.id"), nullable=False)
    doctor_id          = Column(String, ForeignKey("users.id"), nullable=False)
    title              = Column(String(255), nullable=False)
    description        = Column(Text)
    exercises          = Column(JSON, default=list)
    frequency_per_week = Column(Integer, default=5)
    duration_weeks     = Column(Integer, default=4)
    is_active          = Column(Boolean, default=True)
    ai_generated       = Column(Boolean, default=False)
    created_at         = Column(DateTime, server_default=func.now())

    patient  = relationship("PatientProfile", foreign_keys=[patient_id])
    sessions = relationship("RehabSession", back_populates="exercise_plan")


class RehabSession(Base):
    __tablename__ = "rehab_sessions"

    id                  = Column(String, primary_key=True, default=gen_uuid)
    patient_id          = Column(String, ForeignKey("patient_profiles.id"), nullable=False)
    exercise_plan_id    = Column(String, ForeignKey("exercise_plans.id"), nullable=True)
    started_at          = Column(DateTime, server_default=func.now())
    ended_at            = Column(DateTime, nullable=True)
    duration_seconds    = Column(Integer, default=0)
    exercises_completed = Column(JSON, default=list)
    total_reps          = Column(Integer, default=0)
    avg_form_score      = Column(Float, default=0.0)
    emg_peak            = Column(Float, default=0.0)
    emg_avg_rms         = Column(Float, default=0.0)
    intent_count        = Column(Integer, default=0)
    signal_quality      = Column(Float, default=0.0)
    notes               = Column(Text)
    session_mode        = Column(String(20), default="live")

    patient       = relationship("PatientProfile", back_populates="sessions")
    exercise_plan = relationship("ExercisePlan",   back_populates="sessions")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id                   = Column(String, primary_key=True, default=gen_uuid)
    patient_id           = Column(String, ForeignKey("patient_profiles.id"), nullable=False)
    doctor_id            = Column(String, ForeignKey("users.id"), nullable=False)
    medications          = Column(JSON, nullable=False)
    notes                = Column(Text)
    status               = Column(String(20), default="pending")
    ai_interaction_check = Column(JSON, nullable=True)
    created_at           = Column(DateTime, server_default=func.now())

    patient       = relationship("PatientProfile", back_populates="prescriptions")
    doctor        = relationship("User", foreign_keys=[doctor_id])
    pharmacy_order = relationship("PharmacyOrder", back_populates="prescription", uselist=False)


class PharmacyOrder(Base):
    __tablename__ = "pharmacy_orders"

    id              = Column(String, primary_key=True, default=gen_uuid)
    prescription_id = Column(String, ForeignKey("prescriptions.id"), unique=True, nullable=False)
    pharmacist_id   = Column(String, ForeignKey("users.id"), nullable=True)
    status          = Column(String(20), default="pending")
    ocr_raw_text    = Column(Text, nullable=True)
    notes           = Column(Text)
    created_at      = Column(DateTime, server_default=func.now())
    dispensed_at    = Column(DateTime, nullable=True)

    prescription = relationship("Prescription", back_populates="pharmacy_order")


class MedicineInventory(Base):
    __tablename__ = "medicine_inventory"

    id              = Column(String, primary_key=True, default=gen_uuid)
    name            = Column(String(255), nullable=False, index=True)
    generic_name    = Column(String(255))
    category        = Column(String(100))
    strength        = Column(String(50))
    unit            = Column(String(20))
    stock_quantity  = Column(Integer, default=0)
    reorder_level   = Column(Integer, default=20)
    price           = Column(Float, default=0.0)
    manufacturer    = Column(String(255))
    expiry_date     = Column(String(20))
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ProgressReport(Base):
    __tablename__ = "progress_reports"

    id              = Column(String, primary_key=True, default=gen_uuid)
    patient_id      = Column(String, ForeignKey("patient_profiles.id"), nullable=False)
    doctor_id       = Column(String, ForeignKey("users.id"), nullable=False)
    period_start    = Column(String(20))
    period_end      = Column(String(20))
    ai_summary      = Column(Text)
    strengths       = Column(JSON, default=list)
    improvements    = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)
    docx_path       = Column(String(500))
    doctor_approved = Column(Boolean, default=False)
    doctor_notes    = Column(Text)
    created_at      = Column(DateTime, server_default=func.now())

    patient = relationship("PatientProfile", back_populates="progress_reports")
    doctor  = relationship("User", foreign_keys=[doctor_id])