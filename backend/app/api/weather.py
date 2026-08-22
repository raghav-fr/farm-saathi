"""
FarmSaathi AI — Weather API router
Fetches current weather + 7-day forecast via WeatherAPI.com.
Caches results in Redis. Generates agricultural advisory via LLM.
"""
from fastapi import APIRouter, Depends, Query

from app.core.deps import FarmerDep
from app.schemas import WeatherResponse
from app.services.weather_service import WeatherService

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("/current", response_model=WeatherResponse)
async def get_current_weather(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    language: str = Query("en"),
    forceRefresh: bool = Query(False),
    farmer: FarmerDep = None,
):
    """
    Get current weather + 7-day forecast + agricultural advisory
    for given GPS coordinates.
    """
    svc = WeatherService()
    return await svc.get_weather_with_advisory(lat, lon, language=language, force_refresh=forceRefresh)


@router.get("/farm/{farm_id}", response_model=WeatherResponse)
async def get_farm_weather(farm_id: str, farmer: FarmerDep, forceRefresh: bool = Query(False)):
    """
    Get weather for a specific farm (uses farm's stored GPS coordinates).
    """
    from app.core.firestore_service import get_farm
    farm = await get_farm(farmer.uid, farm_id)
    if not farm:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")

    svc = WeatherService()
    return await svc.get_weather_with_advisory(
        farm["latitude"],
        farm["longitude"],
        language="en",
        crop_context=farm,
        force_refresh=forceRefresh,
    )
