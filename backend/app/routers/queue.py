from fastapi import APIRouter, HTTPException, status
from datetime import date
from bson import ObjectId
from app.database import get_db
from app.schemas import LiveQueueResponse, AppointmentResponse

router = APIRouter(prefix="/api/queue", tags=["Smart Queue"])


@router.get("/doctor/{doctor_id}", response_model=LiveQueueResponse)
def get_live_queue_by_doctor(doctor_id: str, target_date: str | None = None):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    day = target_date or date.today().isoformat()
    doc = db.doctors.find_one({"_id": ObjectId(doctor_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    avg_wait = doc.get("avg_consultation_mins", 15)

    apts = list(db.appointments.find({"doctor_id": doctor_id, "date": day}).sort("queue_position", 1))

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
            date=a.get("date", day),
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
        doctor_id=doctor_id,
        doctor_name=doc["name"],
        department_name=doc.get("department_name", ""),
        room_number=doc.get("room_number", "101"),
        date=day,
        now_serving=to_resp(now_serving, 0),
        next_in_line=to_resp(next_in_line, 0) if next_in_line else None,
        waiting_count=waiting_count,
        completed_count=completed_count,
        avg_wait_mins=avg_wait,
        queue_list=queue_responses
    )


@router.get("/overview", response_model=list[LiveQueueResponse])
def get_hospital_queue_overview():
    """Provides real-time queue summaries for all doctors for lobby/public display boards."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    today_str = date.today().isoformat()
    doctors = list(db.doctors.find({"is_active": True}))

    overview = []
    for doc in doctors:
        doc_id = str(doc["_id"])
        avg_wait = doc.get("avg_consultation_mins", 15)
        apts = list(db.appointments.find({"doctor_id": doc_id, "date": today_str}).sort("queue_position", 1))

        now_serving = None
        next_in_line = None
        waiting_count = 0
        completed_count = 0
        waiting_list = []

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

        overview.append(LiveQueueResponse(
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
            queue_list=[to_resp(x) for x in waiting_list[:5]]
        ))

    return overview


@router.get("/ticket/{ticket_number}")
def track_ticket(ticket_number: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    apt = db.appointments.find_one({"ticket_number": ticket_number.upper().strip()})
    if not apt:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_number}' not found.")

    doc = db.doctors.find_one({"_id": ObjectId(apt["doctor_id"])}) if apt.get("doctor_id") else None
    avg_wait = doc.get("avg_consultation_mins", 15) if doc else 15

    # Patients ahead
    ahead_count = 0
    if apt.get("status") == "waiting":
        ahead_count = db.appointments.count_documents({
            "doctor_id": apt["doctor_id"],
            "date": apt["date"],
            "status": {"$in": ["waiting", "in_consultation"]},
            "queue_position": {"$lt": apt.get("queue_position", 9999)}
        })

    # Now serving ticket
    now_serving = db.appointments.find_one({
        "doctor_id": apt["doctor_id"],
        "date": apt["date"],
        "status": "in_consultation"
    })

    return {
        "ticket_number": apt.get("ticket_number"),
        "status": apt.get("status"),
        "patient_name": apt.get("patient_name"),
        "doctor_name": apt.get("doctor_name"),
        "department_name": apt.get("department_name"),
        "room_number": apt.get("room_number"),
        "date": apt.get("date"),
        "now_serving_ticket": now_serving.get("ticket_number") if now_serving else "None",
        "patients_ahead": ahead_count,
        "estimated_wait_mins": ahead_count * avg_wait
    }
