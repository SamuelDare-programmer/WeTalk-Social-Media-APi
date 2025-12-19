from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str
    MONGODB_URL: str
    DB_NAME: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    ALGORITHM: str
    REFRESH_TOKEN_EXPIRE_MINUTES: int
    JTI_EXPIRY : int
    REDIS_HOST: str
    REDIS_PORT: int
    DOMAIN_NAME: str
    DECODE_RESPONSES: bool
    REDIS_USERNAME : str
    REDIS_PASSWORD: str
    REDIS_DB: int = 0  # Add Redis DB number
    TUSKY_API_KEY: str
    TUSKY_VAULT_ID : str
    TUSKY_API_BASE: str
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