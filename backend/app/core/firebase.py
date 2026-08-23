"""
FarmSaathi AI — Firebase initialization
Handles Auth (token verification) + Firestore + Storage via Admin SDK
"""
import json
import os
from functools import lru_cache
from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials, firestore, storage
from loguru import logger

from app.core.config import settings

_firebase_app: firebase_admin.App | None = None


def initialize_firebase() -> firebase_admin.App:
    """Initialize Firebase Admin SDK. Called once at startup."""
    global _firebase_app

    if _firebase_app is not None:
        return _firebase_app

    sa_path = Path(settings.FIREBASE_SERVICE_ACCOUNT_PATH)

    if sa_path.is_file():
        cred = credentials.Certificate(str(sa_path))
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(sa_path.resolve())
        logger.info(f"Firebase: loading credentials from {sa_path}")
    else:
        # Fallback: try environment variable (for CI/CD)
        sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        if sa_json:
            cred_dict = json.loads(sa_json)
            cred = credentials.Certificate(cred_dict)
            
            # Write to /tmp/ for Google Application Default Credentials (needed by AsyncClient)
            tmp_path = "/tmp/firebase-service-account.json"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(cred_dict, f)
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = tmp_path
            
            logger.info("Firebase: loading credentials from FIREBASE_SERVICE_ACCOUNT_JSON env var")
        else:
            raise RuntimeError(
                "Firebase service account not found. "
                "Place firebase-service-account.json in backend/ "
                "or set FIREBASE_SERVICE_ACCOUNT_JSON env var."
            )

    _firebase_app = firebase_admin.initialize_app(
        cred,
        {
            "storageBucket": settings.FIREBASE_STORAGE_BUCKET,
            "projectId": settings.FIREBASE_PROJECT_ID,
        },
    )
    logger.info(f"Firebase initialized: project={settings.FIREBASE_PROJECT_ID}")
    return _firebase_app


def get_firestore_client():
    """Return async Firestore client."""
    return firestore.client()


def get_storage_bucket():
    """Return Firebase Storage bucket."""
    return storage.bucket()


async def verify_firebase_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token and return decoded claims.
    Raises firebase_admin.auth.InvalidIdTokenError on failure.
    """
    decoded = auth.verify_id_token(id_token)
    return decoded


async def get_firebase_user(uid: str) -> dict:
    """Fetch Firebase user record by UID."""
    user = auth.get_user(uid)
    return {
        "uid": user.uid,
        "email": user.email,
        "display_name": user.display_name,
        "phone_number": user.phone_number,
        "photo_url": user.photo_url,
        "email_verified": user.email_verified,
        "disabled": user.disabled,
    }
