from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# User Schemas
from typing import Literal

class StaffCreate(BaseModel):
    """Schema for doctor to create a staff account"""
    email: EmailStr
    full_name: str = Field(..., min_length=2)
    password: str = Field(..., min_length=6)
    phone: Optional[str] = ""
    role: Literal["staff"] = Field(default="staff")
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = ""
    role: str = Field("patient", pattern="^(patient|doctor|admin)$")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = ""
    role: str
    created_at: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Department Schemas
class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2)
    code: str = Field(..., min_length=2, max_length=10)
    description: Optional[str] = ""
    icon: Optional[str] = "Stethoscope"


class DepartmentResponse(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = ""
    icon: Optional[str] = "Stethoscope"
    active: bool = True


# Doctor Schemas
class DoctorCreate(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: Optional[str] = "Doctor123!"
    phone: Optional[str] = ""
    department_id: str
    department_name: Optional[str] = ""
    room_number: str = "101"
    avg_consultation_mins: int = Field(15, ge=5, le=120)
    specialization: Optional[str] = ""
    available_days: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]


class DoctorResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    name: str
    email: str
    phone: Optional[str] = ""
    department_id: str
    department_name: str
    room_number: str
    avg_consultation_mins: int
    specialization: Optional[str] = ""
    available_days: List[str]
    is_active: bool = True


# Appointment & Queue Schemas
class AppointmentCreate(BaseModel):
    doctor_id: str
    date: str  # YYYY-MM-DD
    time_slot: Optional[str] = "09:00 AM"
    symptoms: Optional[str] = ""


class AppointmentResponse(BaseModel):
    id: str
    ticket_number: str
    patient_id: str
    patient_name: str
    patient_phone: Optional[str] = ""
    doctor_id: str
    doctor_name: str
    department_id: str
    department_name: str
    room_number: Optional[str] = "101"
    date: str
    time_slot: Optional[str] = ""
    symptoms: Optional[str] = ""
    status: str  # waiting, in_consultation, completed, skipped, cancelled
    queue_position: int
    estimated_wait_mins: int
    created_at: str
    consultation_started_at: Optional[str] = None
    consultation_ended_at: Optional[str] = None


class AppointmentStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(waiting|in_consultation|completed|skipped|cancelled)$")


class LiveQueueResponse(BaseModel):
    doctor_id: str
    doctor_name: str
    department_name: str
    room_number: str
    date: str
    now_serving: Optional[AppointmentResponse] = None
    next_in_line: Optional[AppointmentResponse] = None
    waiting_count: int = 0
    completed_count: int = 0
    avg_wait_mins: int = 15
    queue_list: List[AppointmentResponse] = []


class AdminStatsResponse(BaseModel):
    total_doctors: int
    total_patients: int
    total_departments: int
    today_appointments: int
    today_completed: int
    today_waiting: int
    today_in_consultation: int
    department_breakdown: List[dict]
    recent_activity: List[dict]
