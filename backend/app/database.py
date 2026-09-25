import logging
from pymongo import MongoClient, ASCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, PyMongoError
from bson import ObjectId
from app.config import MONGODB_URI, DB_NAME

logger = logging.getLogger("mediqueue.database")

client = None
db = None
db_connected = False
db_error_message = None


def get_db():
    global client, db, db_connected, db_error_message
    if db is not None and db_connected:
        return db

    try:
        if "<db_password>" in MONGODB_URI:
            db_error_message = "MongoDB URI contains placeholder <db_password>. Please provide your database password in backend/.env."
            logger.warning(db_error_message)
            return None

        import certifi

        client = MongoClient(
            MONGODB_URI,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
        )
        # Test connection
        client.admin.command("ping")
        db = client[DB_NAME]
        db_connected = True
        db_error_message = None
        logger.info(f"Successfully connected to MongoDB Atlas database: {DB_NAME}")
        init_indexes(db)
        return db
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        db_connected = False
        db_error_message = f"Failed to connect to MongoDB Atlas: {str(e)}"
        logger.error(db_error_message)
        return None
    except Exception as e:
        db_connected = False
        db_error_message = f"Database error: {str(e)}"
        logger.error(db_error_message)
        return None


def init_indexes(database):
    try:
        # Users indexes
        database.users.create_index([("email", ASCENDING)], unique=True)
        database.users.create_index([("role", ASCENDING)])

        # Doctors indexes
        database.doctors.create_index([("user_id", ASCENDING)])
        database.doctors.create_index([("department_id", ASCENDING)])
        database.doctors.create_index([("is_active", ASCENDING)])

        # Departments indexes
        database.departments.create_index([("name", ASCENDING)], unique=True)
        database.departments.create_index([("code", ASCENDING)], unique=True)

        # Appointments indexes
        database.appointments.create_index([("doctor_id", ASCENDING), ("date", ASCENDING), ("status", ASCENDING)])
        database.appointments.create_index([("patient_id", ASCENDING), ("date", ASCENDING)])
        database.appointments.create_index([("ticket_number", ASCENDING)])
        database.appointments.create_index([("created_at", ASCENDING)])

        # Queues indexes
        database.queues.create_index([("doctor_id", ASCENDING), ("date", ASCENDING)], unique=True)

        logger.info("MongoDB indexes verified and created successfully.")
    except Exception as e:
        logger.warning(f"Warning creating MongoDB indexes: {e}")


def format_doc(doc):
    """Converts MongoDB BSON document to JSON-serializable dict with 'id' field."""
    if not doc:
        return None
    if isinstance(doc, list):
        return [format_doc(item) for item in doc]
    
    formatted = {}
    for key, val in doc.items():
        if key == "_id":
            formatted["id"] = str(val)
        elif isinstance(val, ObjectId):
            formatted[key] = str(val)
        elif isinstance(val, dict):
            formatted[key] = format_doc(val)
        elif isinstance(val, list):
            formatted[key] = [format_doc(v) if isinstance(v, (dict, ObjectId)) else v for v in val]
        else:
            formatted[key] = val
    return formatted
