from app.workers.celery_app import celery_app
from loguru import logger
import asyncio

def run_async(coro):
    """Helper to run async code inside Celery synchronous tasks"""
    loop = asyncio.get_event_loop()
    if loop.is_running():
        # Handle case where event loop is already running (e.g. inside another async context)
        # This shouldn't happen in Celery workers, but just in case
        import nest_asyncio
        nest_asyncio.apply()
    return asyncio.run(coro)

@celery_app.task
def trigger_crop_update_notifications():
    """
    Periodic task that checks active crops and generates an alert for the farmer
    to upload an image to track growth if they haven't recently.
    """
    logger.info("Starting crop update notification sweep...")
    run_async(_check_and_notify_crops())

async def _check_and_notify_crops():
    from app.core.firestore_service import db
    from app.core.firebase import get_firebase_app
    import time
    from datetime import datetime, timezone
    
    # Initialize if needed
    try:
        get_firebase_app()
    except Exception:
        from app.core.firebase import initialize_firebase
        initialize_firebase()
    
    users_ref = db.collection("users")
    users = users_ref.stream()
    
    alert_count = 0
    now_ms = int(time.time() * 1000)
    
    # Normally we'd do a complex query, but we'll iterate for simplicity since this is a background job
    for user_snap in users:
        uid = user_snap.id
        
        # Get farms
        farms_ref = db.collection(f"users/{uid}/farms")
        farms = farms_ref.stream()
        
        for farm_snap in farms:
            farm_id = farm_snap.id
            
            # Get crops
            crops_ref = db.collection(f"users/{uid}/farms/{farm_id}/crops")
            crops = crops_ref.where("status", "==", "active").stream()
            
            for crop_snap in crops:
                crop = crop_snap.to_dict()
                crop_id = crop_snap.id
                
                # Check if it needs an update. For this demo, let's say every active crop
                # without an update in the last 7 days needs one.
                # If 'last_image_update' is missing or old
                last_update = crop.get("last_image_update", 0)
                
                # Check if older than 7 days (7 * 24 * 60 * 60 * 1000 ms)
                if (now_ms - last_update) > 604800000:
                    crop_name = crop.get("crop", "crop").title()
                    
                    # Generate an alert
                    alert_ref = db.collection(f"users/{uid}/alerts").document()
                    alert_ref.set({
                        "id": alert_ref.id,
                        "type": "crop_update_required",
                        "severity": "warning",
                        "message": f"Please upload a recent photo of your {crop_name} to track growth and detect early signs of disease.",
                        "read": False,
                        "createdAt": datetime.now(timezone.utc).isoformat(),
                        "farmId": farm_id,
                        "cropId": crop_id
                    })
                    alert_count += 1
                    
                    # Prevent spamming alerts by updating a field to note we sent a reminder
                    # (In a real system, we'd have a 'last_reminder_sent' field)
                    crop_snap.reference.update({
                        "last_image_update": now_ms # Reset so we don't spam them tomorrow
                    })

    logger.info(f"Crop update sweep complete. Sent {alert_count} alerts.")
