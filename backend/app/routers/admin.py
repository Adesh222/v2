from fastapi import APIRouter, HTTPException, status, Depends
from datetime import date, datetime
from bson import ObjectId
from app.database import get_db, format_doc
from app.auth import require_roles, hash_password
from app.schemas import (
    AdminStatsResponse,
    DepartmentCreate,
    DepartmentResponse,
    DoctorCreate,
    DoctorResponse
)

router = APIRouter(prefix="/api/admin", tags=["Hospital Admin"])


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(current_user: dict = Depends(require_roles(["admin"]))):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    today_str = date.today().isoformat()

    total_doctors = db.doctors.count_documents({"is_active": True})
    total_patients = db.users.count_documents({"role": "patient"})
    total_departments = db.departments.count_documents({"active": True})

    # Today's appointments stats
    today_apts = list(db.appointments.find({"date": today_str}))
    today_total = len(today_apts)
    today_completed = sum(1 for a in today_apts if a.get("status") == "completed")
    today_waiting = sum(1 for a in today_apts if a.get("status") == "waiting")
    today_in_consult = sum(1 for a in today_apts if a.get("status") == "in_consultation")

    # Department breakdown
    dept_counts = {}
    for d in db.departments.find({"active": True}):
        dept_counts[d.get("name", "Unknown")] = 0

    for a in today_apts:
        d_name = a.get("department_name", "General")
        dept_counts[d_name] = dept_counts.get(d_name, 0) + 1

    department_breakdown = [
        {"department": name, "count": count}
        for name, count in dept_counts.items()
    ]

    # Recent activity
    recent_docs = db.appointments.find().sort("created_at", -1).limit(5)
    recent_activity = [
        {
            "id": str(r["_id"]),
            "ticket": r.get("ticket_number", ""),
            "patient": r.get("patient_name", "Anonymous"),
            "doctor": r.get("doctor_name", ""),
            "department": r.get("department_name", ""),
            "status": r.get("status", "waiting"),
            "time": r.get("created_at", "")
        }
        for r in recent_docs
    ]

    return AdminStatsResponse(
        total_doctors=total_doctors,
        total_patients=total_patients,
        total_departments=total_departments,
        today_appointments=today_total,
        today_completed=today_completed,
        today_waiting=today_waiting,
        today_in_consultation=today_in_consult,
        department_breakdown=department_breakdown,
        recent_activity=recent_activity
    )


# Departments Management
@router.get("/departments", response_model=list[DepartmentResponse])
def get_all_departments():
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")
    
    depts = list(db.departments.find())
    return [
        DepartmentResponse(
            id=str(d["_id"]),
            name=d["name"],
            code=d["code"],
            description=d.get("description", ""),
            icon=d.get("icon", "Stethoscope"),
            active=d.get("active", True)
        )
        for d in depts
    ]


@router.post("/departments", response_model=DepartmentResponse)
def create_department(dept_in: DepartmentCreate, current_user: dict = Depends(require_roles(["admin"]))):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    existing = db.departments.find_one({
        "$or": [
            {"name": {"$regex": f"^{dept_in.name}$", "$options": "i"}},
            {"code": dept_in.code.upper()}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Department with this name or code already exists.")

    new_dept = {
        "_id": ObjectId(),
        "name": dept_in.name.strip(),
        "code": dept_in.code.strip().upper(),
        "description": dept_in.description or "",
        "icon": dept_in.icon or "Stethoscope",
        "active": True
    }
    db.departments.insert_one(new_dept)

    return DepartmentResponse(
        id=str(new_dept["_id"]),
        name=new_dept["name"],
        code=new_dept["code"],
        description=new_dept["description"],
        icon=new_dept["icon"],
        active=new_dept["active"]
    )


# Doctors Management
@router.get("/doctors", response_model=list[DoctorResponse])
def list_doctors_admin(current_user: dict = Depends(require_roles(["admin"]))):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    docs = list(db.doctors.find())
    return [
        DoctorResponse(
            id=str(d["_id"]),
            user_id=d.get("user_id"),
            name=d["name"],
            email=d["email"],
            phone=d.get("phone", ""),
            department_id=d["department_id"],
            department_name=d.get("department_name", ""),
            room_number=d.get("room_number", "101"),
            avg_consultation_mins=d.get("avg_consultation_mins", 15),
            specialization=d.get("specialization", ""),
            available_days=d.get("available_days", []),
            is_active=d.get("is_active", True)
        )
        for d in docs
    ]


@router.post("/doctors", response_model=DoctorResponse)
def create_doctor(doc_in: DoctorCreate, current_user: dict = Depends(require_roles(["admin"]))):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    # Check department
    dept = db.departments.find_one({"_id": ObjectId(doc_in.department_id)})
    if not dept:
        raise HTTPException(status_code=404, detail="Selected department does not exist.")

    # Check user email
    existing_user = db.users.find_one({"email": doc_in.email.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    now_iso = datetime.utcnow().isoformat()
    # Create doctor login user
    pwd = doc_in.password or "Doctor123!"
    new_user = {
        "_id": ObjectId(),
        "email": doc_in.email.lower(),
        "password_hash": hash_password(pwd),
        "full_name": doc_in.name,
        "phone": doc_in.phone or "",
        "role": "doctor",
        "created_at": now_iso
    }
    db.users.insert_one(new_user)

    # Create doctor profile
    doctor_profile = {
        "_id": ObjectId(),
        "user_id": str(new_user["_id"]),
        "name": doc_in.name.strip(),
        "email": doc_in.email.lower(),
        "phone": doc_in.phone or "",
        "department_id": str(dept["_id"]),
        "department_name": dept["name"],
        "room_number": doc_in.room_number or "101",
        "avg_consultation_mins": doc_in.avg_consultation_mins or 15,
        "specialization": doc_in.specialization or dept["name"],
        "available_days": doc_in.available_days or ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "is_active": True,
        "created_at": now_iso
    }
    db.doctors.insert_one(doctor_profile)

    return DoctorResponse(
        id=str(doctor_profile["_id"]),
        user_id=doctor_profile["user_id"],
        name=doctor_profile["name"],
        email=doctor_profile["email"],
        phone=doctor_profile["phone"],
        department_id=doctor_profile["department_id"],
        department_name=doctor_profile["department_name"],
        room_number=doctor_profile["room_number"],
        avg_consultation_mins=doctor_profile["avg_consultation_mins"],
        specialization=doctor_profile["specialization"],
        available_days=doctor_profile["available_days"],
        is_active=doctor_profile["is_active"]
    )
