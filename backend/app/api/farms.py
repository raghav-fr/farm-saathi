"""
FarmSaathi AI — Farm management router
CRUD for farms + soil tests via Firestore.
"""
from fastapi import APIRouter, HTTPException, status

from app.core.deps import FarmerDep
from app.core.firestore_service import (
    add_soil_test,
    create_farm,
    get_farm,
    get_latest_soil_test,
    list_farms,
    update_farm,
)
from app.schemas import (
    FarmCreate,
    FarmResponse,
    FarmUpdate,
    MessageResponse,
    SoilTestCreate,
    SoilTestResponse,
)

router = APIRouter(prefix="/farms", tags=["Farms"])


@router.post("", response_model=FarmResponse, status_code=status.HTTP_201_CREATED)
async def create_new_farm(data: FarmCreate, farmer: FarmerDep):
    """Create a new farm for the authenticated farmer."""
    farm = await create_farm(farmer.uid, data.model_dump())
    return farm


@router.get("", response_model=list[FarmResponse])
async def list_my_farms(farmer: FarmerDep):
    """List all farms belonging to the authenticated farmer."""
    return await list_farms(farmer.uid)


@router.get("/{farm_id}", response_model=FarmResponse)
async def get_my_farm(farm_id: str, farmer: FarmerDep):
    """Get a single farm by ID."""
    farm = await get_farm(farmer.uid, farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")
    return farm


@router.put("/{farm_id}", response_model=FarmResponse)
async def update_my_farm(farm_id: str, data: FarmUpdate, farmer: FarmerDep):
    """Update farm details."""
    farm = await get_farm(farmer.uid, farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")
    return await update_farm(farmer.uid, farm_id, data.model_dump(exclude_none=True))


@router.post("/{farm_id}/soil-test", response_model=SoilTestResponse, status_code=status.HTTP_201_CREATED)
async def submit_soil_test(farm_id: str, data: SoilTestCreate, farmer: FarmerDep):
    """Submit soil lab test results for a farm."""
    farm = await get_farm(farmer.uid, farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")
    return await add_soil_test(farmer.uid, farm_id, data.model_dump(exclude_none=True))


@router.get("/{farm_id}/soil-test/latest", response_model=SoilTestResponse)
async def get_latest_soil(farm_id: str, farmer: FarmerDep):
    """Get the most recent soil test for a farm."""
    farm = await get_farm(farmer.uid, farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")
    test = await get_latest_soil_test(farmer.uid, farm_id)
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No soil tests found")
    return test
