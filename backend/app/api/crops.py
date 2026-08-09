"""
FarmSaathi AI — Crop recommendation router
Runs XGBoost + composite scoring → LLM explanation.
"""
from fastapi import APIRouter, HTTPException, status

from app.core.deps import FarmerDep
from app.core.firestore_service import get_farm, get_latest_soil_test
from app.schemas import CropCreate, CropRecommendRequest, CropRecommendResponse, CropResponse, CropUpdate
from app.core.firestore_service import add_crop, list_crops, update_crop

router = APIRouter(prefix="/crops", tags=["Crops"])


# ── Crop CRUD ─────────────────────────────────────────────────────────────────

@router.post("/farms/{farm_id}/crops", response_model=CropResponse, status_code=status.HTTP_201_CREATED)
async def add_farm_crop(farm_id: str, data: CropCreate, farmer: FarmerDep):
    """Add a crop to a farm."""
    farm = await get_farm(farmer.uid, farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")
    return await add_crop(farmer.uid, farm_id, data.model_dump(exclude_none=True))


@router.get("/farms/{farm_id}/crops", response_model=list[CropResponse])
async def get_farm_crops(farm_id: str, farmer: FarmerDep):
    """List all crops in a farm."""
    return await list_crops(farmer.uid, farm_id)


@router.put("/farms/{farm_id}/crops/{crop_id}", response_model=CropResponse)
async def update_farm_crop(farm_id: str, crop_id: str, data: CropUpdate, farmer: FarmerDep):
    """Update crop stage or details."""
    return await update_crop(farmer.uid, farm_id, crop_id, data.model_dump(exclude_none=True))


# ── AI Recommendation ────────────────────────────────────────────────────────

@router.post("/recommend", response_model=CropRecommendResponse)
async def recommend_crops(request: CropRecommendRequest, farmer: FarmerDep):
    """
    AI-powered crop recommendation:
    1. Loads farm context from Firestore (if farm_id provided)
    2. Fetches real-time weather from WeatherAPI.com
    3. Runs XGBoost + composite scoring
    4. Generates farmer-friendly explanation via local LLM
    """
    from app.ai.crop_engine import CropEngine
    from app.services.weather_service import WeatherService

    # Load farm context if provided
    soil_context = {}
    farm_context = {}
    if request.farm_id:
        farm = await get_farm(farmer.uid, request.farm_id)
        if farm:
            farm_context = farm
            soil_test = await get_latest_soil_test(farmer.uid, request.farm_id)
            if soil_test:
                soil_context = soil_test

    # Merge request data with farm context
    soil_data = {
        "ph": request.ph or soil_context.get("ph"),
        "nitrogen": request.nitrogen or soil_context.get("nitrogen_kg_ha"),
        "phosphorus": request.phosphorus or soil_context.get("phosphorus_kg_ha"),
        "potassium": request.potassium or soil_context.get("potassium_kg_ha"),
        "soil_type": (request.soil_type or farm_context.get("soil_type", "unknown")),
    }

    # Fetch weather
    weather_svc = WeatherService()
    weather = await weather_svc.get_raw_weather(request.latitude, request.longitude)

    # Run crop engine
    engine = CropEngine()
    result = await engine.recommend(
        soil=soil_data,
        weather=weather,
        has_irrigation=request.has_irrigation or farm_context.get("has_irrigation", False),
        season=request.season,
        previous_crop=request.previous_crop,
        language=request.language,
    )

    return result
