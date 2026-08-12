from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, Dict, Any
from app.services.market_service import market_service
from app.core.deps import FarmerDep

router = APIRouter(prefix="/market", tags=["Market"])

@router.get("/rates", response_model=Dict[str, Any])
async def get_market_rates(
    state: Optional[str] = Query(None, description="Filter by state"),
    district: Optional[str] = Query(None, description="Filter by district"),
    market: Optional[str] = Query(None, description="Filter by market"),
    commodity: Optional[str] = Query(None, description="Filter by commodity"),
    variety: Optional[str] = Query(None, description="Filter by variety"),
    grade: Optional[str] = Query(None, description="Filter by grade"),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    farmer: FarmerDep = None, # Require authenticated farmer
):
    """
    Fetch live market prices (Mandi rates) from data.gov.in
    """
    data = await market_service.get_market_rates(
        state=state,
        district=district,
        market=market,
        commodity=commodity,
        variety=variety,
        grade=grade,
        limit=limit,
        offset=offset
    )
    
    if data.get("status") == "error":
        raise HTTPException(status_code=500, detail=data.get("message"))
        
    return data
