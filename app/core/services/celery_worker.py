from asgiref.sync import async_to_sync
from celery import Celery
from .email import create_message, mail
from typing import List
from pydantic import EmailStr

c_app = Celery("social_media_api")
c_app.config_from_object("app.core.config")

@c_app.task()
def send_email(recipients: List[EmailStr], subject: str, template_body: dict, template_name):
    message = create_message(recipients, template_body, subject)
    async_to_sync(mail.send_message)(message, template_name=template_name)
    print("Email sent successfully")