from fastapi import APIRouter, HTTPException, status, Depends
from datetime import date, datetime
from bson import ObjectId
from app.database import get_db, format_doc
from app.auth import get_current_user, require_roles
from app.schemas import AppointmentCreate, AppointmentResponse

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


@router.post("", response_model=AppointmentResponse)
def book_appointment(apt_in: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    # 1. Fetch doctor & department
    doc = db.doctors.find_one({"_id": ObjectId(apt_in.doctor_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    dept = db.departments.find_one({"_id": ObjectId(doc["department_id"])})
    dept_code = dept.get("code", "MED") if dept else "MED"

    target_date = apt_in.date

    # 2. Count existing appointments for this doctor on target date to generate sequential ticket
    existing_count = db.appointments.count_documents({
        "doctor_id": str(doc["_id"]),
        "date": target_date
    })

    ticket_number = f"{dept_code}-{str(existing_count + 1).zfill(3)}"
    now_iso = datetime.utcnow().isoformat()

    # 3. Calculate waiting queue position for today
    waiting_ahead = db.appointments.count_documents({
        "doctor_id": str(doc["_id"]),
        "date": target_date,
        "status": {"$in": ["waiting", "in_consultation"]}
    })
    
    avg_duration = doc.get("avg_consultation_mins", 15)
    est_wait = waiting_ahead * avg_duration

    new_appointment = {
        "_id": ObjectId(),
        "ticket_number": ticket_number,
        "patient_id": current_user["id"],
        "patient_name": current_user.get("full_name", "Patient"),
        "patient_phone": current_user.get("phone", ""),
        "doctor_id": str(doc["_id"]),
        "doctor_name": doc["name"],
        "department_id": str(doc["department_id"]),
        "department_name": doc.get("department_name", "General"),
        "room_number": doc.get("room_number", "101"),
        "date": target_date,
        "time_slot": apt_in.time_slot or "Standard Queue",
        "symptoms": apt_in.symptoms or "",
        "status": "waiting",
        "queue_position": waiting_ahead + 1,
        "created_at": now_iso,
        "consultation_started_at": None,
        "consultation_ended_at": None
    }

    db.appointments.insert_one(new_appointment)

    return AppointmentResponse(
        id=str(new_appointment["_id"]),
        ticket_number=ticket_number,
        patient_id=new_appointment["patient_id"],
        patient_name=new_appointment["patient_name"],
        patient_phone=new_appointment["patient_phone"],
        doctor_id=new_appointment["doctor_id"],
        doctor_name=new_appointment["doctor_name"],
        department_id=new_appointment["department_id"],
        department_name=new_appointment["department_name"],
        room_number=new_appointment["room_number"],
        date=new_appointment["date"],
        time_slot=new_appointment["time_slot"],
        symptoms=new_appointment["symptoms"],
        status=new_appointment["status"],
        queue_position=new_appointment["queue_position"],
        estimated_wait_mins=est_wait,
        created_at=new_appointment["created_at"],
        consultation_started_at=None,
        consultation_ended_at=None
    )


@router.get("/my", response_model=list[AppointmentResponse])
def get_my_appointments(current_user: dict = Depends(get_current_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    patient_id = current_user["id"]
    apts = list(db.appointments.find({"patient_id": patient_id}).sort("created_at", -1))
    
    results = []
    for a in apts:
        # Calculate dynamic wait time for waiting appointments
        doc = db.doctors.find_one({"_id": ObjectId(a["doctor_id"])}) if a.get("doctor_id") else None
        avg_wait = doc.get("avg_consultation_mins", 15) if doc else 15
        
        est_wait = 0
        queue_pos = a.get("queue_position", 0)
        if a.get("status") == "waiting":
            # Count how many are waiting ahead for this doctor today
            ahead_count = db.appointments.count_documents({
                "doctor_id": a["doctor_id"],
                "date": a["date"],
                "status": {"$in": ["waiting", "in_consultation"]},
                "queue_position": {"$lt": a.get("queue_position", 9999)}
            })
            est_wait = ahead_count * avg_wait
            queue_pos = ahead_count + 1
        elif a.get("status") == "in_consultation":
            est_wait = 0
            queue_pos = 0

        results.append(AppointmentResponse(
            id=str(a["_id"]),
            ticket_number=a.get("ticket_number", ""),
            patient_id=a["patient_id"],
            patient_name=a.get("patient_name", ""),
            patient_phone=a.get("patient_phone", ""),
            doctor_id=a.get("doctor_id", ""),
            doctor_name=a.get("doctor_name", ""),
            department_id=a.get("department_id", ""),
            department_name=a.get("department_name", ""),
            room_number=a.get("room_number", "101"),
            date=a.get("date", ""),
            time_slot=a.get("time_slot", ""),
            symptoms=a.get("symptoms", ""),
            status=a.get("status", "waiting"),
            queue_position=queue_pos,
            estimated_wait_mins=est_wait,
            created_at=a.get("created_at", ""),
            consultation_started_at=a.get("consultation_started_at"),
            consultation_ended_at=a.get("consultation_ended_at")
        ))
    return results


@router.delete("/{appointment_id}")
def cancel_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    apt = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if apt["patient_id"] != current_user["id"] and current_user.get("role") not in ["admin", "doctor"]:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this appointment.")

    db.appointments.update_one({"_id": ObjectId(appointment_id)}, {"$set": {"status": "cancelled"}})
    return {"success": True, "message": "Appointment cancelled successfully."}
