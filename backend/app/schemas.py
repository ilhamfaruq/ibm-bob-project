from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ─── Lab Reports ─────────────────────────────────────────────────────────────

class LabReportOut(BaseModel):
    id: int
    user_id: int
    file_url: Optional[str]
    report_date: Optional[date]
    status: str
    original_filename: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Lab Parameters ──────────────────────────────────────────────────────────

class LabParameterOut(BaseModel):
    id: int
    report_id: int
    parameter_name: str
    value: float
    unit: Optional[str]
    status: str
    reference_min: Optional[float]
    reference_max: Optional[float]
    explanation: Optional[str]

    model_config = {"from_attributes": True}


class LabParameterUpdate(BaseModel):
    parameter_name: str
    value: float
    unit: Optional[str] = None


# ─── Clinical Summary ────────────────────────────────────────────────────────

class ClinicalSummaryOut(BaseModel):
    id: int
    report_id: int
    summary_text: Optional[str]
    recommendation_text: Optional[str]
    abnormal_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Full Report Detail ───────────────────────────────────────────────────────

class ReportDetailOut(BaseModel):
    report: LabReportOut
    parameters: List[LabParameterOut]
    clinical_summary: Optional[ClinicalSummaryOut]

    model_config = {"from_attributes": True}
