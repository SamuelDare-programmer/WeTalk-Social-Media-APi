from fastapi import APIRouter, status, Depends
# from app.core.db.database import get_database
from app.core.auth.schemas import UserCreateModel, UserPublicModel
from fastapi.security import OAuth2PasswordRequestForm

from app.core.auth.service import UserService
from pymongo import AsyncMongoClient

user_service = UserService()


router = APIRouter(prefix="/auth/users", tags=["users"])

@router.post("/", response_model=UserPublicModel, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreateModel):
    created_user = await user_service.create_user(user)
    return created_user

@router.post("/login", response_model=dict)
async def login_user(form_data: OAuth2PasswordRequestForm = Depends()):
    token = await user_service.authenticate_user(form_data.username, form_data.password)
    return token
