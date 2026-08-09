"""
FarmSaathi AI — Firebase Storage service
Handles image uploads (leaf images, soil images, profile photos).
"""
from typing import Optional

from firebase_admin import storage
from loguru import logger


async def upload_image_to_firebase(
    image_bytes: bytes,
    path: str,
    content_type: str = "image/jpeg",
) -> str:
    """
    Upload image bytes to Firebase Storage.
    Returns public download URL.
    """
    try:
        bucket = storage.bucket()
        blob = bucket.blob(path)
        blob.upload_from_string(image_bytes, content_type=content_type)
        blob.make_public()
        url = blob.public_url
        logger.info(f"Image uploaded to Firebase Storage: {path}")
        return url
    except Exception as e:
        logger.error(f"Firebase Storage upload failed: {e}")
        return ""


async def delete_image_from_firebase(path: str) -> bool:
    """Delete an image from Firebase Storage."""
    try:
        bucket = storage.bucket()
        blob = bucket.blob(path)
        blob.delete()
        logger.info(f"Image deleted from Firebase Storage: {path}")
        return True
    except Exception as e:
        logger.error(f"Firebase Storage delete failed: {e}")
        return False


def get_signed_url(path: str, expiration_minutes: int = 60) -> str:
    """Get a time-limited signed URL for private storage access."""
    import datetime
    bucket = storage.bucket()
    blob = bucket.blob(path)
    url = blob.generate_signed_url(
        expiration=datetime.timedelta(minutes=expiration_minutes),
        method="GET",
    )
    return url
