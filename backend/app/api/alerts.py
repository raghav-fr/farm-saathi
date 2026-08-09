"""
FarmSaathi AI — Alerts router
Farmer alert feed (weather risk, disease risk, market, scheme notifications).
"""
from fastapi import APIRouter, status

from app.core.deps import FarmerDep
from app.core.firestore_service import list_alerts, mark_alert_read
from app.schemas import AlertResponse

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=list[AlertResponse])
async def get_alerts(unread_only: bool = False, farmer: FarmerDep = None):
    """Get farmer's alert feed."""
    return await list_alerts(farmer.uid, unread_only=unread_only)


@router.put("/{alert_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def read_alert(alert_id: str, farmer: FarmerDep):
    """Mark an alert as read."""
    await mark_alert_read(farmer.uid, alert_id)


@router.put("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def read_all_alerts(farmer: FarmerDep):
    """Mark all alerts as read."""
    alerts = await list_alerts(farmer.uid, unread_only=True)
    for alert in alerts:
        await mark_alert_read(farmer.uid, alert["id"])
