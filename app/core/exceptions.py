from fastapi import HTTPException, Request, status, FastAPI
from typing import Any, Callable
from fastapi.responses import JSONResponse


class WeTalkException(Exception):
    """Base exception for WeTalk application."""

    pass

class AccessToken(WeTalkException):
    """Exception raised when an access token is used incorrectly."""

    pass

class RefreshToken(WeTalkException):
    """Exception raised when a refresh token is used incorrectly."""

    pass

class InvalidToken(WeTalkException):
    """Exception raised for invalid tokens."""

    pass


class UserNotFoundException(WeTalkException):
    """Exception raised when a user is not found."""

    pass


class UserAlreadyExistsException(WeTalkException):
    """Exception raised when attempting to create a user that already exists."""

    pass


def create_exception_handler(
    status_code: int, initial_detail: Any
) -> Callable[[Request, Exception], JSONResponse]:

    async def exception_handler(request: Request, exc: WeTalkException):

        return JSONResponse(content=initial_detail, status_code=status_code)

    return exception_handler


def register_exceptions(app: FastAPI):
    app.add_exception_handler(
        UserNotFoundException,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "User not found",
                "error_code": "user_not_found",
                "resolution": "Check the user ID and try again",
            },
        ),
    )

    app.add_exception_handler(
        UserAlreadyExistsException,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "User already exists",
                "error_code": "user_already_exists",
                "resolution": "Use a different email or username",
            },
        ),
    ),

    app.add_exception_handler(
        InvalidToken,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_detail={
                "message": "Invalid or expired token",
                "error_code": "invalid_token",
                "resolution": "Please login again or provide a valid token",
            },
        ),
    )

    app.add_exception_handler(
        AccessToken,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_detail={
                "message": "Access token used incorrectly",
                "error_code": "access_token_error",
                "resolution": "Please use a refresh token instead",
            },
        ),
    )

    app.add_exception_handler(
        RefreshToken,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_detail={
                "message": "Refresh token used incorrectly",
                "error_code": "refresh_token_error",
                "resolution": "Please use an access token instead",
            },
        ),
    )