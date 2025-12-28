from typing import List
from fastapi import APIRouter, Query, status, Depends
# from app.core.db.database import get_database
from app.core.auth.schemas import UserCreateModel, UserPublicModel, PasswordResetModel
from fastapi.security import OAuth2PasswordRequestForm

from app.core.auth.service import UserService
from app.posts.models import Post
from app.posts.schemas import PostResponse
from .dependencies import RefreshTokenBearer, get_current_user
from fastapi.responses import JSONResponse, RedirectResponse
from .schemas import UserUpdateModel
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.core.auth.utils import decode_url_safe_token, hash_password
from app.core.errors import InvalidToken, UserNotFoundException

# role_checker = Depends(RoleChecker())

user_service = UserService()


router = APIRouter(prefix="/auth/users", tags=["users"])

@router.post("/signup", response_model=UserPublicModel, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreateModel):
    await user_service.create_user(user)
    return JSONResponse(content={
        "message": "User created successfully. Please check your email to verify your account."})

@router.post("/login", response_model=dict, status_code=status.HTTP_202_ACCEPTED)
async def login_user(form_data: OAuth2PasswordRequestForm = Depends()):
    token = await user_service.authenticate_user(form_data.username, form_data.password)
    return token

@router.get("/refresh-token")
async def refresh_token(current_user=Depends(RefreshTokenBearer())):

    access_token = await user_service.refresh_access_token(current_user)

    return JSONResponse(content={
        "access_token": access_token,
        "token_type": "bearer"
        })

@router.get("/me", response_model=UserPublicModel)
async def current_user(current_user= Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserPublicModel)
async def update_profile(user_data :UserUpdateModel,current_user = Depends(get_current_user)):
    updated_user = await user_service.update_user(user_data)
    return updated_user

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(current_user = Depends(get_current_user)):
    updated_user = await user_service.delete_user(current_user.email)
    return {}

@router.get("/verify/{token:str}")
async def verify_email(token: str):
    await user_service.verify_user_email(token)
    return JSONResponse(content={
        "message": "Email verified successfully. You can now log in."
    })

@router.post("/password_reset")
async def request_password_reset(email: str):
    await user_service.initiate_password_reset(email)
    return JSONResponse(content={
        "message": "If the email exists, a password reset link has been sent."
    })



@router.get("/password_reset/confirm/{token:str}")
async def password_reset_confirm(token: str):
    token_data = decode_url_safe_token(token)
    if not token_data:
        raise InvalidToken()

    email = token_data.get("email")
    if not email:
        raise InvalidToken()
    
    # Redirect to frontend password reset page with email as query parameter
    frontend_url = f"http://127.0.0.1:5500/html/reset-password.html?email={email}&token={token}"
    return RedirectResponse(url=frontend_url)

@router.post("/password_reset/confirm")
async def confirm_password_reset(payload: PasswordResetModel):
    await user_service.complete_password_reset(payload)
    return JSONResponse(content={"message": "Password has been reset successfully."})

@router.get("/users/{user_id}/posts", response_model=List[PostResponse])
async def get_user_posts(
    user_id: str,
    limit: int = Query(12, le=50), # 12 is good for 3-column grids
    offset: int = 0
):
    posts = await Post.find(Post.owner_id == user_id, sort=-Post.created_at, skip=offset, limit=limit, fetch_links=True)  
    return posts