from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Date, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ParameterStatus(str, enum.Enum):
    NORMAL = "normal"
    SLIGHTLY_HIGH = "slightly_high"
    SLIGHTLY_LOW = "slightly_low"
    HIGH = "high"
    LOW = "low"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lab_reports = relationship("LabReport", back_populates="user", cascade="all, delete-orphan")


class LabReport(Base):
    __tablename__ = "lab_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_url = Column(String(512), nullable=True)
    report_date = Column(Date, nullable=True)
    status = Column(String(50), default=ReportStatus.PENDING)
    original_filename = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="lab_reports")
    parameters = relationship("LabParameter", back_populates="report", cascade="all, delete-orphan")
    clinical_summaries = relationship("ClinicalSummary", back_populates="report", cascade="all, delete-orphan")


class LabParameter(Base):
    __tablename__ = "lab_parameters"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("lab_reports.id", ondelete="CASCADE"), nullable=False)
    parameter_name = Column(String(100), nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(50), nullable=True)
    status = Column(String(50), default=ParameterStatus.NORMAL)
    reference_min = Column(Float, nullable=True)
    reference_max = Column(Float, nullable=True)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    report = relationship("LabReport", back_populates="parameters")


class ReferenceRange(Base):
    __tablename__ = "reference_ranges"

    id = Column(Integer, primary_key=True, index=True)
    parameter_name = Column(String(100), nullable=False, index=True)
    min_value = Column(Float, nullable=False)
    max_value = Column(Float, nullable=False)
    unit = Column(String(50), nullable=True)
    gender = Column(String(10), nullable=True)  # male, female, any
    age_group = Column(String(50), nullable=True)  # adult, child, any


class ClinicalSummary(Base):
    __tablename__ = "clinical_summaries"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("lab_reports.id", ondelete="CASCADE"), nullable=False, unique=True)
    summary_text = Column(Text, nullable=True)
    recommendation_text = Column(Text, nullable=True)
    abnormal_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    report = relationship("LabReport", back_populates="clinical_summaries")
