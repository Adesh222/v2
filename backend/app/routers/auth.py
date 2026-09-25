from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from bson import ObjectId
from app.database import get_db, format_doc
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.schemas import UserRegister, UserLogin, TokenResponse, UserResponse
from app.seed_data import seed_database

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
def register(user_data: UserRegister):
    db = get_db()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable. Please verify MongoDB connection string."
        )

    # Check if user already exists
    existing = db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    hashed_pw = hash_password(user_data.password)
    now_iso = datetime.utcnow().isoformat()

    new_user = {
        "_id": ObjectId(),
        "email": user_data.email.lower(),
        "password_hash": hashed_pw,
        "full_name": user_data.full_name,
        "phone": user_data.phone or "",
        "role": user_data.role,
        "created_at": now_iso
    }
    db.users.insert_one(new_user)

    user_resp = UserResponse(
        id=str(new_user["_id"]),
        email=new_user["email"],
        full_name=new_user["full_name"],
        phone=new_user["phone"],
        role=new_user["role"],
        created_at=new_user["created_at"]
    )

    token = create_access_token(data={"sub": str(new_user["_id"]), "role": new_user["role"]})
    return TokenResponse(access_token=token, token_type="bearer", user=user_resp)


@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin):
    db = get_db()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable. Please verify MongoDB connection string."
        )

    user = db.users.find_one({"email": creds.email.lower()})
    if not user or not verify_password(creds.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    user_resp = UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        full_name=user.get("full_name", ""),
        phone=user.get("phone", ""),
        role=user.get("role", "patient"),
        created_at=user.get("created_at")
    )

    token = create_access_token(data={"sub": str(user["_id"]), "role": user.get("role", "patient")})
    return TokenResponse(access_token=token, token_type="bearer", user=user_resp)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user.get("full_name", ""),
        phone=current_user.get("phone", ""),
        role=current_user.get("role", "patient"),
        created_at=current_user.get("created_at")
    )


@router.post("/seed")
def seed():
    db = get_db()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable."
        )
    success = seed_database(db)
    return {"success": success, "message": "Demo data seeding triggered."}
