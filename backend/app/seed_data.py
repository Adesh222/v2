import logging
from datetime import datetime, date
from bson import ObjectId
from app.auth import hash_password

logger = logging.getLogger("mediqueue.seed")


def seed_database(db):
    """Populates MongoDB with realistic starter departments, doctors, demo accounts, and appointments."""
    if db is None:
        logger.warning("Database unavailable, cannot seed.")
        return False

    try:
        # Check if users collection already has admin
        existing_admin = db.users.find_one({"email": "admin@mediqueue.demo"})
        if existing_admin:
            logger.info("Database already seeded with demo data.")
            return True

        today_str = date.today().isoformat()
        now_iso = datetime.utcnow().isoformat()
        default_pwd_hash = hash_password("Password123!")

        # 1. Hospital
        hospital = {
            "_id": ObjectId(),
            "name": "St. Jude Metropolitan Hospital",
            "code": "METRO-MED",
            "address": "450 Health Avenue, Medical District",
            "phone": "+1 (555) 234-5678",
            "created_at": now_iso
        }
        db.hospitals.replace_one({"code": "METRO-MED"}, hospital, upsert=True)

        # 2. Departments
        departments = [
            {"_id": ObjectId(), "name": "Cardiology", "code": "CARD", "description": "Heart & Cardiovascular Care", "icon": "Heart", "active": True},
            {"_id": ObjectId(), "name": "Pediatrics", "code": "PED", "description": "Child Care & Infant Health", "icon": "Baby", "active": True},
            {"_id": ObjectId(), "name": "Orthopedics", "code": "ORTHO", "description": "Bones, Joints & Spine Care", "icon": "Activity", "active": True},
            {"_id": ObjectId(), "name": "General Medicine", "code": "GENMED", "description": "Primary Consultation & Health Check", "icon": "Stethoscope", "active": True},
            {"_id": ObjectId(), "name": "Neurology", "code": "NEURO", "description": "Brain & Nervous System Health", "icon": "Brain", "active": True},
            {"_id": ObjectId(), "name": "Dermatology", "code": "DERM", "description": "Skin, Hair & Cosmetic Medicine", "icon": "Sparkles", "active": True},
        ]
        dept_map = {}
        for d in departments:
            res = db.departments.find_one({"code": d["code"]})
            if not res:
                db.departments.insert_one(d)
                dept_map[d["code"]] = d
            else:
                dept_map[d["code"]] = res

        # 3. Demo Users
        # Admin
        admin_user = {
            "_id": ObjectId(),
            "email": "admin@mediqueue.demo",
            "password_hash": default_pwd_hash,
            "full_name": "Hospital Administrator",
            "phone": "+1 555-0100",
            "role": "admin",
            "created_at": now_iso
        }
        db.users.replace_one({"email": admin_user["email"]}, admin_user, upsert=True)

        # Doctors Users & Doctor Profile
        doc_configs = [
            {
                "email": "doctor@mediqueue.demo",
                "name": "Dr. Rajesh Sharma",
                "phone": "+1 555-0201",
                "dept_code": "CARD",
                "room": "Room 204",
                "avg_mins": 15,
                "specialization": "Interventional Cardiologist"
            },
            {
                "email": "dr.priya@mediqueue.demo",
                "name": "Dr. Priya Patel",
                "phone": "+1 555-0202",
                "dept_code": "PED",
                "room": "Room 108",
                "avg_mins": 12,
                "specialization": "Senior Pediatrician"
            },
            {
                "email": "dr.anand@mediqueue.demo",
                "name": "Dr. Anand Verma",
                "phone": "+1 555-0203",
                "dept_code": "ORTHO",
                "room": "Room 310",
                "avg_mins": 20,
                "specialization": "Orthopedic Surgeon"
            }
        ]

        created_docs = []
        for dc in doc_configs:
            dept = dept_map[dc["dept_code"]]
            u = db.users.find_one({"email": dc["email"]})
            if not u:
                u = {
                    "_id": ObjectId(),
                    "email": dc["email"],
                    "password_hash": default_pwd_hash,
                    "full_name": dc["name"],
                    "phone": dc["phone"],
                    "role": "doctor",
                    "created_at": now_iso
                }
                db.users.insert_one(u)

            doc_profile = db.doctors.find_one({"email": dc["email"]})
            if not doc_profile:
                doc_profile = {
                    "_id": ObjectId(),
                    "user_id": str(u["_id"]),
                    "name": dc["name"],
                    "email": dc["email"],
                    "phone": dc["phone"],
                    "department_id": str(dept["_id"]),
                    "department_name": dept["name"],
                    "room_number": dc["room"],
                    "avg_consultation_mins": dc["avg_mins"],
                    "specialization": dc["specialization"],
                    "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                    "is_active": True,
                    "created_at": now_iso
                }
                db.doctors.insert_one(doc_profile)
            created_docs.append(doc_profile)

        # Patients Users
        patient_configs = [
            {"email": "patient@mediqueue.demo", "name": "Rohan Mehta", "phone": "+1 555-0301"},
            {"email": "ananya@mediqueue.demo", "name": "Ananya Sen", "phone": "+1 555-0302"},
            {"email": "vikram@mediqueue.demo", "name": "Vikram Rao", "phone": "+1 555-0303"},
            {"email": "sneha@mediqueue.demo", "name": "Sneha Kapoor", "phone": "+1 555-0304"}
        ]
        created_patients = []
        for pc in patient_configs:
            p = db.users.find_one({"email": pc["email"]})
            if not p:
                p = {
                    "_id": ObjectId(),
                    "email": pc["email"],
                    "password_hash": default_pwd_hash,
                    "full_name": pc["name"],
                    "phone": pc["phone"],
                    "role": "patient",
                    "created_at": now_iso
                }
                db.users.insert_one(p)
            created_patients.append(p)

        # 4. Create active appointments & queue for Primary Demo Doctor (Dr. Rajesh Sharma - Cardiology)
        primary_doc = created_docs[0]
        card_dept = dept_map["CARD"]

        # Sample queue for today
        appointments_to_seed = [
            {
                "ticket_number": "CARD-001",
                "patient": created_patients[3],  # Sneha Kapoor
                "status": "completed",
                "symptoms": "Annual heart checkup & ECG review",
                "consultation_started_at": f"{today_str}T09:00:00",
                "consultation_ended_at": f"{today_str}T09:14:00",
                "queue_position": 0
            },
            {
                "ticket_number": "CARD-002",
                "patient": created_patients[1],  # Ananya Sen
                "status": "in_consultation",
                "symptoms": "Palpitations and slight chest tightness",
                "consultation_started_at": f"{today_str}T09:15:00",
                "consultation_ended_at": None,
                "queue_position": 1
            },
            {
                "ticket_number": "CARD-003",
                "patient": created_patients[0],  # Rohan Mehta (Demo Patient!)
                "status": "waiting",
                "symptoms": "Blood pressure spike monitoring",
                "consultation_started_at": None,
                "consultation_ended_at": None,
                "queue_position": 2
            },
            {
                "ticket_number": "CARD-004",
                "patient": created_patients[2],  # Vikram Rao
                "status": "waiting",
                "symptoms": "Follow-up consultation after stress test",
                "consultation_started_at": None,
                "consultation_ended_at": None,
                "queue_position": 3
            }
        ]

        for apt in appointments_to_seed:
            existing_apt = db.appointments.find_one({"ticket_number": apt["ticket_number"], "date": today_str})
            if not existing_apt:
                db.appointments.insert_one({
                    "_id": ObjectId(),
                    "ticket_number": apt["ticket_number"],
                    "patient_id": str(apt["patient"]["_id"]),
                    "patient_name": apt["patient"]["full_name"],
                    "patient_phone": apt["patient"]["phone"],
                    "doctor_id": str(primary_doc["_id"]),
                    "doctor_name": primary_doc["name"],
                    "department_id": str(card_dept["_id"]),
                    "department_name": card_dept["name"],
                    "room_number": primary_doc["room_number"],
                    "date": today_str,
                    "time_slot": "09:00 AM - 11:00 AM",
                    "symptoms": apt["symptoms"],
                    "status": apt["status"],
                    "queue_position": apt["queue_position"],
                    "created_at": now_iso,
                    "consultation_started_at": apt["consultation_started_at"],
                    "consultation_ended_at": apt["consultation_ended_at"]
                })

        logger.info("Demo data seed completed successfully!")
        return True
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        return False
