"""
FarmSaathi AI — Farmer profile router
Farmer onboarding + profile management via Firestore.
"""
from fastapi import APIRouter, HTTPException, status

from app.core.deps import FarmerDep
from app.core.firestore_service import (
    create_or_update_farmer_profile,
    get_farmer_profile,
)
from app.schemas import FarmerProfileCreate, FarmerProfileResponse, FarmerProfileUpdate, MessageResponse

router = APIRouter(prefix="/farmers", tags=["Farmer"])


@router.post("/onboard", response_model=FarmerProfileResponse, status_code=status.HTTP_201_CREATED)
async def onboard_farmer(data: FarmerProfileCreate, farmer: FarmerDep):
    """
    Complete farmer onboarding — creates/updates profile in Firestore.
    Called after Firebase Auth registration.
    """
    profile = await create_or_update_farmer_profile(
        farmer.uid,
        {
            "uid": farmer.uid,
            "email": farmer.email,
            **data.model_dump(mode="json", exclude_none=True),
        },
    )
    return profile


@router.get("/me", response_model=FarmerProfileResponse)
async def get_my_profile(farmer: FarmerDep):
    """Return the current farmer's profile."""
    profile = await get_farmer_profile(farmer.uid)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please complete onboarding.",
        )
    return profile


@router.put("/me", response_model=FarmerProfileResponse)
async def update_my_profile(data: FarmerProfileUpdate, farmer: FarmerDep):
    """Update farmer profile fields."""
    existing = await get_farmer_profile(farmer.uid)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please complete onboarding first.",
        )
    updated = await create_or_update_farmer_profile(
        farmer.uid,
        data.model_dump(mode="json", exclude_none=True),
    )
    return updated
