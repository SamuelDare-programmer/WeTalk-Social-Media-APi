from fastapi import HTTPException, Request, status, FastAPI
from typing import Any, Callable
from fastapi.responses import JSONResponse


class WeTalkException(Exception):
    """Base exception for WeTalk application."""

    pass


class UserNotUpdated(Exception):
    """Exception raised when a user update operation fails."""

    pass


class AccessTokenException(WeTalkException):
    """Exception raised when a refresh token is provided where an access token is required."""

    pass


class RefreshTokenException(WeTalkException):
    """Exception raised when an access token is provided where a refresh token is required."""

    pass


class InvalidToken(WeTalkException):
    """Exception raised for invalid tokens."""

    pass

class InvalidCredentials(WeTalkException):
    """Exception raised for invalid user credentials."""

    pass

class UserNotFoundException(WeTalkException):
    """Exception raised when a user is not found."""

    pass


class UserAlreadyExistsException(WeTalkException):
    """Exception raised when attempting to create a user that already exists."""

    pass


class EmailNotVerifiedException(WeTalkException):
    """Exception raised when a user's email is not verified."""

    pass


class PostNotFoundException(WeTalkException):
    """Exception raised when a post is not found."""
    pass


class CommentNotFoundException(WeTalkException):
    """Exception raised when a comment is not found."""
    pass


class MediaValidationException(WeTalkException):
    """Exception raised when media validation fails."""
    pass


class UnauthorizedActionException(WeTalkException):
    """Exception raised when a user is not authorized to perform an action."""
    pass


class ContentValidationException(WeTalkException):
    """Exception raised when content validation fails (empty, profanity, etc)."""
    pass


class SelfOperationException(WeTalkException):
    """Exception raised when a user tries to perform an operation on themselves (follow/block)."""
    pass


class RelationshipNotFoundException(WeTalkException):
    """Exception raised when a relationship (follow/block) is not found."""
    pass


class PrivacyException(WeTalkException):
    """Exception raised when privacy settings prevent an action."""
    pass


class StoryNotFoundException(WeTalkException):
    """Exception raised when a story is not found."""
    pass


class ConversationNotFoundException(WeTalkException):
    """Exception raised when a conversation is not found."""
    pass


def create_exception_handler(
    status_code: int, initial_detail: Any
) -> Callable[[Request, Exception], JSONResponse]:

    async def exception_handler(request: Request, exc: WeTalkException):
        content = initial_detail.copy()
        if exc.args and isinstance(exc.args[0], str):
            content["message"] = exc.args[0]
        return JSONResponse(content=content, status_code=status_code)

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
        EmailNotVerifiedException,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "Email not verified",
                "error_code": "email_not_verified",
                "resolution": "Please verify your email to proceed",
            },
        ),
    )

    app.add_exception_handler(
        UserNotUpdated,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "User update failed",
                "error_code": "user_not_updated",
                "resolution": "Check the provided data and try again",
            },
        ),
    )
    app.add_exception_handler(
        InvalidCredentials,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_detail={
                "message": "Invalid credentials",
                "error_code": "invalid_credentials",
                "resolution": "Please check your username and password",
            },
        ),
    )

    app.add_exception_handler(
        AccessTokenException,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_detail={
                "message": "Invalid token type",
                "error_code": "invalid_token_type",
                "resolution": "Please provide a valid Access Token",
            },
        ),
    )

    app.add_exception_handler(
        RefreshTokenException,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_detail={
                "message": "Invalid token type",
                "error_code": "invalid_token_type",
                "resolution": "Please provide a valid Refresh Token",
            },
        ),
    )

    app.add_exception_handler(
        PostNotFoundException,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Post not found",
                "error_code": "post_not_found",
                "resolution": "Check the post ID",
            },
        ),
    )

    app.add_exception_handler(
        CommentNotFoundException,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Comment not found",
                "error_code": "comment_not_found",
                "resolution": "Check the comment ID",
            },
        ),
    )

    app.add_exception_handler(
        MediaValidationException,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Media validation failed",
                "error_code": "media_validation_error",
                "resolution": "Ensure media exists and is active",
            },
        ),
    )

    app.add_exception_handler(
        UnauthorizedActionException,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "Action forbidden",
                "error_code": "unauthorized_action",
                "resolution": "You do not have permission to perform this action",
            },
        ),
    )

    app.add_exception_handler(
        ContentValidationException,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Content validation failed",
                "error_code": "content_validation_error",
                "resolution": "Check your input content",
            },
        ),
    )

    app.add_exception_handler(
        SelfOperationException,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Invalid operation on self",
                "error_code": "self_operation_error",
                "resolution": "You cannot perform this action on yourself",
            },
        ),
    )

    app.add_exception_handler(
        RelationshipNotFoundException,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Relationship not found",
                "error_code": "relationship_not_found",
                "resolution": "The requested relationship does not exist",
            },
        ),
    )

    app.add_exception_handler(
        PrivacyException,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "Privacy settings prevent this action",
                "error_code": "privacy_error",
                "resolution": "The user's privacy settings do not allow this",
            },
        ),
    )

    app.add_exception_handler(
        StoryNotFoundException,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Story not found",
                "error_code": "story_not_found",
                "resolution": "Check the story ID",
            },
        ),
    )

    app.add_exception_handler(
        ConversationNotFoundException,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Conversation not found",
                "error_code": "conversation_not_found",
                "resolution": "Check the conversation ID",
            },
        ),
    )
