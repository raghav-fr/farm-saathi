from celery import Celery
from celery.schedules import crontab
import os

redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "farmsaathi_worker",
    broker=redis_url,
    backend=redis_url,
    include=["app.workers.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    beat_schedule={
        "daily_crop_update_sweep": {
            "task": "app.workers.tasks.trigger_crop_update_notifications",
            "schedule": crontab(hour=9, minute=0), # Run daily at 9:00 AM
        }
    }
)
