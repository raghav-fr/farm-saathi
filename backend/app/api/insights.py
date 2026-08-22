"""
FarmSaathi AI — Insights router
Generates daily personalized insights using Universal Context.
"""
from fastapi import APIRouter
from loguru import logger

from app.core.deps import FarmerDep
from app.ai.query_router import QueryRouter
from app.ai.llm_service import LLMService
from app.core.firestore_service import create_alert

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("/daily")
async def get_daily_insight(farmer: FarmerDep, forceRefresh: bool = False, language: str = "en"):
    """
    Generate a dynamic AI insight based on Universal Context.
    If the insight is medium/high severity, a real alert is generated.
    """
    logger.info(f"Generating daily insight for farmer {farmer.uid} (forceRefresh={forceRefresh})")
    
    # Use the Universal Context gatherer
    qr = QueryRouter()
    
    # farmer.dict() works if it's a Pydantic model, else we can fetch profile
    from app.core.firestore_service import get_farmer_profile
    profile = await get_farmer_profile(farmer.uid)
    
    context = await qr._gather_global_context(uid=farmer.uid, farm_id=None, profile=profile)
    
    # Generate the insight
    llm = LLMService()
    result = await llm.generate_daily_insight(universal_context=context, language=language)
    
    # Automatically generate a real notification if severity is high/medium
    severity = result.get("severity", "low")
    if severity in ["high", "medium"]:
        logger.info(f"Insight severity is {severity}, generating real notification for farmer.")
        try:
            await create_alert(farmer.uid, {
                "type": "AI_INSIGHT",
                "severity": severity,
                "message": result.get("insight")
            })
        except Exception as e:
            logger.error(f"Failed to generate real alert from insight: {e}")
            
    return result
