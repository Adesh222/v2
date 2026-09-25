import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import PORT, DB_NAME
from app.database import get_db, db_connected, db_error_message
from app.seed_data import seed_database
from app.routers import auth, admin, doctors, appointments, queue, staff

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("mediqueue")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting MediQueue Backend API...")
    database = get_db()
    if database is not None:
        logger.info(f"Connected to MongoDB Atlas: {DB_NAME}")
        seed_database(database)
    else:
        logger.warning("MongoDB not connected yet. Waiting for credentials/connectivity.")
    yield
    logger.info("Shutting down MediQueue Backend API...")


app = FastAPI(
    title="MediQueue - Smart Hospital Queue & Appointment System",
    description="Production-grade API for MediQueue Hospital Queue & Appointment Management",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(queue.router)
app.include_router(staff.router)


@app.get("/")
def root():
    return {
        "system": "MediQueue API",
        "status": "operational",
        "version": "1.0.0",
        "docs_url": "/docs"
    }


@app.get("/api/health")
def health_check():
    import app.database as db_mod
    database = db_mod.get_db()
    is_connected = database is not None
    collections = []
    if is_connected:
        try:
            collections = database.list_collection_names()
        except Exception:
            pass

    return {
        "status": "healthy" if is_connected else "degraded",
        "mongodb_connected": is_connected,
        "database_name": DB_NAME,
        "collections": collections,
        "connection_error": db_mod.db_error_message if not is_connected else None,
        "guide": "If mongodb_connected is false, verify the database password in backend/.env"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
