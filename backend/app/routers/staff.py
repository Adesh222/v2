from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_db
from app.auth import require_roles, get_current_user
from app.schemas import StaffCreate, UserResponse
from app.auth import hash_password
from bson import ObjectId

router = APIRouter(prefix="/api/doctors", tags=["Doctor Staff"])

@router.post("/staff", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_staff_account(
    staff: StaffCreate,
    current_user: dict = Depends(require_roles(["doctor"]))
):
    """Allow a doctor to create a new staff account (role: staff)."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    # Ensure email is unique
    if db.users.find_one({"email": staff.email}):
        raise HTTPException(status_code=400, detail="Email already registered.")

    # Hash the password
    hashed = hash_password(staff.password)
    new_user = {
        "email": staff.email,
        "full_name": staff.full_name,
        "hashed_password": hashed,
        "role": "staff",
        "is_active": True,
        "doctor_id": str(current_user["id"]),  # link to the creating doctor
    }
    result = db.users.insert_one(new_user)
    created = db.users.find_one({"_id": result.inserted_id})
    return UserResponse(
        id=str(created["_id"]),
        email=created["email"],
        full_name=created["full_name"],
        role=created["role"],
        is_active=created["is_active"],
    )
