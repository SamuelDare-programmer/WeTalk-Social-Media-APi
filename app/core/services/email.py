from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from typing import List
from app.core.config import settings
from pathlib import Path

config = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_SSL_TLS=True,
    MAIL_STARTTLS=False,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_SERVER=settings.MAIL_SERVER,
    TEMPLATE_FOLDER=Path(__file__).parent.parent.parent / 'templates'
)

mail = FastMail(config)


def create_message(recipients: List[EmailStr], template_body: dict , subject: str):

    message = MessageSchema(
        recipients=recipients, template_body=template_body, subject=subject, subtype=MessageType.html
    )

    return message


async def send_email_background(recipients: list, body: dict, subject: str, template_name: str):
    
    # Create message (using the fix we discussed previously)
    message = MessageSchema(
        subject=subject,
        recipients=recipients,
        template_body=body,
        subtype=MessageType.html
    )
    
    # CRITICAL FIX: Pass template_name here!
    await mail.send_message(message, template_name=template_name)