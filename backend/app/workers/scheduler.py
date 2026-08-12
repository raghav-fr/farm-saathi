from loguru import logger
import time
from datetime import datetime, timezone
import firebase_admin
from app.core.firestore_service import _db
from app.core.firebase import initialize_firebase

async def check_and_notify_crops():
    """
    Periodic task that checks active crops and generates an alert for the farmer
    to upload an image to track growth if they haven't recently.
    """
    logger.info("Starting crop update notification sweep (APScheduler)...")
    
    # Initialize Firebase if needed
    try:
        firebase_admin.get_app()
    except ValueError:
        initialize_firebase()
    
    db = _db()
    users_ref = db.collection("farmers")  # Users are actually stored in 'farmers' collection
    
    alert_count = 0
    now_ms = int(time.time() * 1000)
    
    async for user_snap in users_ref.stream():
        uid = user_snap.id
        farms_ref = db.collection("farmers").document(uid).collection("farms")
        
        async for farm_snap in farms_ref.stream():
            farm_id = farm_snap.id
            crops_ref = db.collection("farmers").document(uid).collection("farms").document(farm_id).collection("crops")
            
            async for crop_snap in crops_ref.where("status", "==", "active").stream():
                crop = crop_snap.to_dict()
                crop_id = crop_snap.id
                
                # Check if older than 7 days (7 * 24 * 60 * 60 * 1000 ms)
                last_update = crop.get("last_image_update", 0)
                
                if (now_ms - last_update) > 604800000:
                    crop_name = crop.get("crop", "crop").title()
                    
                    alert_ref = db.collection("farmers").document(uid).collection("alerts").document()
                    await alert_ref.set({
                        "id": alert_ref.id,
                        "userId": uid,
                        "type": "crop_update_required",
                        "severity": "warning",
                        "message": f"Please upload a recent photo of your {crop_name} to track growth and detect early signs of disease.",
                        "read": False,
                        "createdAt": datetime.now(timezone.utc).isoformat(),
                        "farmId": farm_id,
                        "cropId": crop_id
                    })
                    alert_count += 1
                    
                    await crop_snap.reference.update({
                        "last_image_update": now_ms
                    })

    logger.info(f"Crop update sweep complete. Sent {alert_count} alerts.")
