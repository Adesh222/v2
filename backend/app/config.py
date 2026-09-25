import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://adeshsham2006_db_user:<db_password>@mediqueue.htkqqtj.mongodb.net/?appName=Mediqueue"
)
DB_NAME = os.getenv("DB_NAME", "mediqueue")
JWT_SECRET = os.getenv("JWT_SECRET", "mediqueue_super_secret_jwt_key_2026_production_grade")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
PORT = int(os.getenv("PORT", "8000"))
