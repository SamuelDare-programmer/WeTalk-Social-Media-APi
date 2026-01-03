#!/bin/bash

# Start Celery Worker in the background
celery -A app.core.services.celery_worker.c_app worker --loglevel=info --pool=solo &

# Start Celery Beat in the background
celery -A app.core.services.celery_worker beat --loglevel=info &

# Start the FastAPI application (this keeps the container running)
uvicorn app.__init__:app --host 0.0.0.0 --port 8000 --proxy-headers