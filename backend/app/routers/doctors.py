from fastapi import APIRouter, HTTPException, status, Depends
from datetime import date, datetime
from bson import ObjectId
from app.database import get_db, format_doc
from app.auth import get_current_user, require_roles
from app.schemas import DoctorResponse, AppointmentResponse, LiveQueueResponse

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])


@router.get("", response_model=list[DoctorResponse])
def get_public_doctors(department_id: str | None = None):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    query = {"is_active": True}
    if department_id:
        query["department_id"] = department_id

    docs = list(db.doctors.find(query))
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


@router.get("/me", response_model=DoctorResponse)
def get_my_doctor_profile(current_user: dict = Depends(require_roles(["doctor"]))):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    doc = db.doctors.find_one({"user_id": current_user["id"]})
    if not doc:
        # Fallback search by email
        doc = db.doctors.find_one({"email": current_user["email"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not linked with this account.")

    return DoctorResponse(
        id=str(doc["_id"]),
        user_id=doc.get("user_id"),
        name=doc["name"],
        email=doc["email"],
        phone=doc.get("phone", ""),
        department_id=doc["department_id"],
        department_name=doc.get("department_name", ""),
        room_number=doc.get("room_number", "101"),
        avg_consultation_mins=doc.get("avg_consultation_mins", 15),
        specialization=doc.get("specialization", ""),
        available_days=doc.get("available_days", []),
        is_active=doc.get("is_active", True)
    )


@router.get("/queue/today", response_model=LiveQueueResponse)
def get_doctor_queue_today(current_user: dict = Depends(require_roles(["doctor"]))):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    doc = db.doctors.find_one({"user_id": current_user["id"]})
    if not doc:
        doc = db.doctors.find_one({"email": current_user["email"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    doc_id = str(doc["_id"])
    today_str = date.today().isoformat()

    # Fetch appointments
    apts = list(db.appointments.find({"doctor_id": doc_id, "date": today_str}).sort("queue_position", 1))

    now_serving = None
    next_in_line = None
    waiting_list = []
    completed_count = 0
    waiting_count = 0

    for a in apts:
        st = a.get("status")
        if st == "completed":
            completed_count += 1
        elif st == "in_consultation" and not now_serving:
            now_serving = a
        elif st == "waiting":
            waiting_count += 1
            if not next_in_line:
                next_in_line = a
            waiting_list.append(a)

    avg_wait = doc.get("avg_consultation_mins", 15)

    def to_resp(a, idx_ahead=0):
        if not a:
            return None
        return AppointmentResponse(
            id=str(a["_id"]),
            ticket_number=a.get("ticket_number", ""),
            patient_id=a.get("patient_id", ""),
            patient_name=a.get("patient_name", "Anonymous"),
            patient_phone=a.get("patient_phone", ""),
            doctor_id=a.get("doctor_id", ""),
            doctor_name=a.get("doctor_name", ""),
            department_id=a.get("department_id", ""),
            department_name=a.get("department_name", ""),
            room_number=a.get("room_number", doc.get("room_number", "101")),
            date=a.get("date", today_str),
            time_slot=a.get("time_slot", ""),
            symptoms=a.get("symptoms", ""),
            status=a.get("status", "waiting"),
            queue_position=a.get("queue_position", 0),
            estimated_wait_mins=idx_ahead * avg_wait,
            created_at=a.get("created_at", ""),
            consultation_started_at=a.get("consultation_started_at"),
            consultation_ended_at=a.get("consultation_ended_at")
        )

    queue_responses = []
    for idx, item in enumerate(waiting_list):
        queue_responses.append(to_resp(item, idx + (1 if now_serving else 0)))

    return LiveQueueResponse(
        doctor_id=doc_id,
        doctor_name=doc["name"],
        department_name=doc.get("department_name", ""),
        room_number=doc.get("room_number", "101"),
        date=today_str,
        now_serving=to_resp(now_serving, 0),
        next_in_line=to_resp(next_in_line, 0) if next_in_line else None,
        waiting_count=waiting_count,
        completed_count=completed_count,
        avg_wait_mins=avg_wait,
        queue_list=queue_responses
    )


@router.post("/call-next", response_model=AppointmentResponse)
def call_next_patient(current_user: dict = Depends(require_roles(["doctor"]))):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    doc = db.doctors.find_one({"user_id": current_user["id"]})
    if not doc:
        doc = db.doctors.find_one({"email": current_user["email"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    doc_id = str(doc["_id"])
    today_str = date.today().isoformat()
    now_iso = datetime.utcnow().isoformat()

    # Find next patient in waiting queue
    next_patient = db.appointments.find_one(
        {"doctor_id": doc_id, "date": today_str, "status": "waiting"},
        sort=[("queue_position", 1), ("created_at", 1)]
    )

    if not next_patient:
        raise HTTPException(status_code=400, detail="No waiting patients in the queue for today.")

    # Update patient to in_consultation
    db.appointments.update_one(
        {"_id": next_patient["_id"]},
        {"$set": {"status": "in_consultation", "consultation_started_at": now_iso}}
    )

    updated = db.appointments.find_one({"_id": next_patient["_id"]})
    return AppointmentResponse(
        id=str(updated["_id"]),
        ticket_number=updated.get("ticket_number", ""),
        patient_id=updated.get("patient_id", ""),
        patient_name=updated.get("patient_name", ""),
        patient_phone=updated.get("patient_phone", ""),
        doctor_id=updated.get("doctor_id", ""),
        doctor_name=updated.get("doctor_name", ""),
        department_id=updated.get("department_id", ""),
        department_name=updated.get("department_name", ""),
        room_number=updated.get("room_number", doc.get("room_number", "101")),
        date=updated.get("date", today_str),
        time_slot=updated.get("time_slot", ""),
        symptoms=updated.get("symptoms", ""),
        status=updated["status"],
        queue_position=updated.get("queue_position", 0),
        estimated_wait_mins=0,
        created_at=updated.get("created_at", ""),
        consultation_started_at=updated.get("consultation_started_at"),
        consultation_ended_at=updated.get("consultation_ended_at")
    )


@router.post("/action/{appointment_id}/{action}")
def update_appointment_status(
    appointment_id: str,
    action: str,  # "completed", "skipped", "in_consultation"
    current_user: dict = Depends(require_roles(["doctor", "admin"]))
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    if action not in ["completed", "skipped", "in_consultation", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Invalid action '{action}'.")

    apt = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    update_fields = {"status": action}
    now_iso = datetime.utcnow().isoformat()
    if action == "in_consultation":
        update_fields["consultation_started_at"] = now_iso
    elif action in ["completed", "skipped"]:
        update_fields["consultation_ended_at"] = now_iso

    db.appointments.update_one({"_id": ObjectId(appointment_id)}, {"$set": update_fields})
    return {"success": True, "appointment_id": appointment_id, "new_status": action}
