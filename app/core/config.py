from pydantic_settings import BaseSettings, SettingsConfigDict

from celery.schedules import crontab
import cloudinary


class Settings(BaseSettings):
    FRONTEND_DOMAIN_NAME: str
    MONGODB_URL: str
    DB_NAME: str
    JTI_EXPIRY: int
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    ALGORITHM: str
    REFRESH_TOKEN_EXPIRE_MINUTES: int
    REDIS_HOST: str
    REDIS_PORT: int
    DOMAIN_NAME: str
    REDIS_USERNAME : str
    REDIS_PASSWORD: str
    REDIS_DB: int = 0  # Add Redis DB number
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    URL_SAFE_SERIALIZER_SALT: str
    MAIL_PORT: int
    MAIL_SERVER: str
    MAIL_FROM_NAME: str
    MAIL_STARTTLS: bool
    MAIL_SSL_TLS: bool
    USE_CREDENTIALS: bool = True
    VALIDATE_CERTS: bool = True
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str
    RADAR_SECRET_KEY: str

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )
    
    @property
    def redis_url(self) -> str:
        """Redis URL for async redis client"""
        return f"redis://{self.REDIS_USERNAME}:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    @property
    def celery_broker_url(self) -> str:
        """Celery broker URL (Redis)"""
        return f"redis://{self.REDIS_USERNAME}:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    @property
    def celery_result_backend(self) -> str:
        """Celery result backend URL (Redis)"""
        return f"redis://{self.REDIS_USERNAME}:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

settings = Settings()

# Initialize Cloudinary Configuration once
def configure_cloudinary():
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )

# Celery Configuration
# These variables are used by Celery when it loads config via config_from_object
broker_url = settings.celery_broker_url
result_backend = settings.celery_result_backend

# Celery Task Settings
task_serializer = 'json'
accept_content = ['json']
result_serializer = 'json'
timezone = 'UTC'
enable_utc = True

# Task execution settings
task_track_started = True
task_time_limit = 30 * 60  # 30 minutes
task_soft_time_limit = 25 * 60  # 25 minutes

# Result backend settings
result_expires = 3600  # Results expire after 1 hour

# Worker settings
worker_prefetch_multiplier = 1
worker_max_tasks_per_child = 1000

# Connection retry settings
broker_connection_retry_on_startup = True
broker_connection_retry = True
broker_connection_max_retries = 10

# Beat Schedule
beat_schedule = {
    "cleanup-temp-files-hourly": {
        "task": "app.core.services.celery_worker.cleanup_temp_files",
        "schedule": crontab(minute="*/5"),  # Run every 5 minutes
    },
    "cleanup-expired-stories-minutely": {
        "task": "app.core.services.celery_worker.cleanup_expired_stories",
        "schedule": crontab(minute="*"),  # Run every minute
    }
}