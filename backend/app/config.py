import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend/.env
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

# MongoDB
MONGODB_URI = os.getenv("MONGODB_URI")

# Debug: shows exactly what Python is reading
print("DEBUG .env path:", env_path)
print("DEBUG MONGODB_URI:", repr(MONGODB_URI))

if not MONGODB_URI:
    raise RuntimeError(
        f"MONGODB_URI is missing from {env_path}"
    )

# Database
DB_NAME = os.getenv("DB_NAME", "mediqueue")

# JWT
JWT_SECRET = os.getenv(
    "JWT_SECRET",
    "mediqueue_super_secret_jwt_key_2026_production_grade"
)

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
)

# Server
PORT = int(os.getenv("PORT", "8000"))