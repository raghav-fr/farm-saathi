"""
FarmSaathi AI — Firestore service layer
All farmer, farm, crop, chat, alert, scheme data lives in Firestore.
"""
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from firebase_admin import firestore
from google.cloud.firestore_v1 import AsyncClient
from loguru import logger


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _db() -> AsyncClient:
    return firestore.AsyncClient()


# ──────────────────────────────────────────────────────────────────────────────
# FARMER PROFILE
# Collection: farmers/{uid}
# ──────────────────────────────────────────────────────────────────────────────


async def create_or_update_farmer_profile(uid: str, data: dict) -> dict:
    """Upsert farmer profile document."""
    db = _db()
    ref = db.collection("farmers").document(uid)
    data["updatedAt"] = _now()
    await ref.set(data, merge=True)
    snap = await ref.get()
    return snap.to_dict()


async def get_farmer_profile(uid: str) -> Optional[dict]:
    db = _db()
    snap = await db.collection("farmers").document(uid).get()
    return snap.to_dict() if snap.exists else None


# ──────────────────────────────────────────────────────────────────────────────
# FARMS
# Collection: farmers/{uid}/farms/{farmId}
# ──────────────────────────────────────────────────────────────────────────────


async def create_farm(uid: str, data: dict) -> dict:
    farm_id = str(uuid4())
    db = _db()
    ref = db.collection("farmers").document(uid).collection("farms").document(farm_id)
    farm = {
        "id": farm_id,
        "userId": uid,
        "createdAt": _now(),
        "updatedAt": _now(),
        **data,
    }
    await ref.set(farm)
    return farm


async def get_farm(uid: str, farm_id: str) -> Optional[dict]:
    db = _db()
    snap = await (
        db.collection("farmers").document(uid).collection("farms").document(farm_id).get()
    )
    return snap.to_dict() if snap.exists else None


async def list_farms(uid: str) -> list[dict]:
    db = _db()
    snaps = (
        db.collection("farmers").document(uid).collection("farms").stream()
    )
    return [s.to_dict() async for s in snaps]


async def update_farm(uid: str, farm_id: str, data: dict) -> dict:
    db = _db()
    ref = db.collection("farmers").document(uid).collection("farms").document(farm_id)
    data["updatedAt"] = _now()
    await ref.update(data)
    snap = await ref.get()
    return snap.to_dict()


async def delete_farm(uid: str, farm_id: str) -> None:
    db = _db()
    ref = db.collection("farmers").document(uid).collection("farms").document(farm_id)
    await ref.delete()


# ──────────────────────────────────────────────────────────────────────────────
# CROPS
# Collection: farmers/{uid}/farms/{farmId}/crops/{cropId}
# ──────────────────────────────────────────────────────────────────────────────


async def add_crop(uid: str, farm_id: str, data: dict) -> dict:
    crop_id = str(uuid4())
    db = _db()
    ref = (
        db.collection("farmers")
        .document(uid)
        .collection("farms")
        .document(farm_id)
        .collection("crops")
        .document(crop_id)
    )
    crop = {
        "id": crop_id,
        "farmId": farm_id,
        "userId": uid,
        "createdAt": _now(),
        "updatedAt": _now(),
        **data,
    }
    await ref.set(crop)
    return crop


async def list_crops(uid: str, farm_id: str) -> list[dict]:
    db = _db()
    snaps = (
        db.collection("farmers")
        .document(uid)
        .collection("farms")
        .document(farm_id)
        .collection("crops")
        .stream()
    )
    return [s.to_dict() async for s in snaps]


async def update_crop(uid: str, farm_id: str, crop_id: str, data: dict) -> dict:
    db = _db()
    ref = (
        db.collection("farmers")
        .document(uid)
        .collection("farms")
        .document(farm_id)
        .collection("crops")
        .document(crop_id)
    )
    data["updatedAt"] = _now()
    await ref.update(data)
    snap = await ref.get()
    return snap.to_dict()


async def delete_crop(uid: str, farm_id: str, crop_id: str) -> None:
    db = _db()
    ref = (
        db.collection("farmers")
        .document(uid)
        .collection("farms")
        .document(farm_id)
        .collection("crops")
        .document(crop_id)
    )
    await ref.delete()


# ──────────────────────────────────────────────────────────────────────────────
# SOIL TESTS
# Collection: farmers/{uid}/farms/{farmId}/soilTests/{testId}
# ──────────────────────────────────────────────────────────────────────────────


async def add_soil_test(uid: str, farm_id: str, data: dict) -> dict:
    test_id = str(uuid4())
    db = _db()
    ref = (
        db.collection("farmers")
        .document(uid)
        .collection("farms")
        .document(farm_id)
        .collection("soilTests")
        .document(test_id)
    )
    test = {
        "id": test_id,
        "farmId": farm_id,
        "userId": uid,
        "createdAt": _now(),
        **data,
    }
    await ref.set(test)
    return test


async def get_latest_soil_test(uid: str, farm_id: str) -> Optional[dict]:
    db = _db()
    snaps = (
        db.collection("farmers")
        .document(uid)
        .collection("farms")
        .document(farm_id)
        .collection("soilTests")
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .limit(1)
        .stream()
    )
    async for snap in snaps:
        return snap.to_dict()
    return None


# ──────────────────────────────────────────────────────────────────────────────
# DISEASE SCANS
# Collection: farmers/{uid}/diseaseScans/{scanId}
# ──────────────────────────────────────────────────────────────────────────────


async def save_disease_scan(uid: str, data: dict) -> dict:
    scan_id = str(uuid4())
    db = _db()
    ref = db.collection("farmers").document(uid).collection("diseaseScans").document(scan_id)
    scan = {"id": scan_id, "userId": uid, "createdAt": _now(), **data}
    await ref.set(scan)
    return scan


async def list_disease_scans(uid: str, farm_id: Optional[str] = None) -> list[dict]:
    db = _db()
    query = (
        db.collection("farmers")
        .document(uid)
        .collection("diseaseScans")
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .limit(20)
    )
    if farm_id:
        query = query.where(filter=firestore.FieldFilter("farmId", "==", farm_id))
    return [s.to_dict() async for s in query.stream()]


# ──────────────────────────────────────────────────────────────────────────────
# ALERTS
# Collection: farmers/{uid}/alerts/{alertId}
# ──────────────────────────────────────────────────────────────────────────────


async def create_alert(uid: str, data: dict) -> dict:
    alert_id = str(uuid4())
    db = _db()
    ref = db.collection("farmers").document(uid).collection("alerts").document(alert_id)
    alert = {
        "id": alert_id,
        "userId": uid,
        "read": False,
        "createdAt": _now(),
        **data,
    }
    await ref.set(alert)
    return alert


async def list_alerts(uid: str, unread_only: bool = False) -> list[dict]:
    db = _db()
    query = (
        db.collection("farmers")
        .document(uid)
        .collection("alerts")
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .limit(50)
    )
    if unread_only:
        query = query.where(filter=firestore.FieldFilter("read", "==", False))
    return [s.to_dict() async for s in query.stream()]


async def mark_alert_read(uid: str, alert_id: str) -> None:
    db = _db()
    await (
        db.collection("farmers")
        .document(uid)
        .collection("alerts")
        .document(alert_id)
        .update({"read": True, "readAt": _now()})
    )

async def delete_alert(uid: str, alert_id: str) -> None:
    db = _db()
    await (
        db.collection("farmers")
        .document(uid)
        .collection("alerts")
        .document(alert_id)
        .delete()
    )

# ──────────────────────────────────────────────────────────────────────────────
# CONVERSATIONS / CHAT HISTORY
# Collection: farmers/{uid}/conversations/{convId}/messages/{msgId}
# ──────────────────────────────────────────────────────────────────────────────


async def create_conversation(uid: str, title: str = "New conversation") -> dict:
    conv_id = str(uuid4())
    db = _db()
    ref = db.collection("farmers").document(uid).collection("conversations").document(conv_id)
    conv = {"id": conv_id, "userId": uid, "title": title, "createdAt": _now()}
    await ref.set(conv)
    return conv


async def list_conversations(uid: str) -> list[dict]:
    db = _db()
    snaps = (
        db.collection("farmers")
        .document(uid)
        .collection("conversations")
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .limit(20)
        .stream()
    )
    result = []
    async for s in snaps:
        d = s.to_dict()
        if "deletedAt" not in d:
            result.append(d)
    return result


async def add_message(uid: str, conv_id: str, data: dict) -> dict:
    msg_id = str(uuid4())
    db = _db()
    ref = (
        db.collection("farmers")
        .document(uid)
        .collection("conversations")
        .document(conv_id)
        .collection("messages")
        .document(msg_id)
    )
    msg = {"id": msg_id, "conversationId": conv_id, "createdAt": _now(), **data}
    await ref.set(msg)
    return msg


async def list_messages(uid: str, conv_id: str, limit: int = 50) -> list[dict]:
    db = _db()
    snaps = (
        db.collection("farmers")
        .document(uid)
        .collection("conversations")
        .document(conv_id)
        .collection("messages")
        .order_by("createdAt")
        .limit(limit)
        .stream()
    )
    return [s.to_dict() async for s in snaps]
