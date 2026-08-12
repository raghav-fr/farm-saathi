"""
FarmSaathi AI — Market API Service
Fetches live crop market prices from data.gov.in
"""
import httpx
from typing import Optional, Dict, Any
from loguru import logger
from app.core.config import settings

MARKET_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"

class MarketService:
    @staticmethod
    async def get_market_rates(
        state: Optional[str] = None,
        district: Optional[str] = None,
        market: Optional[str] = None,
        commodity: Optional[str] = None,
        variety: Optional[str] = None,
        grade: Optional[str] = None,
        limit: int = 10,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Fetch market rates using the data.gov.in API
        """
        if not settings.MARKET_API_KEY:
            logger.error("MARKET_API_KEY is not set.")
            return {"status": "error", "message": "Market API key not configured"}

        url = f"{settings.MARKET_API_BASE}/{MARKET_RESOURCE_ID}"
        
        params = {
            "api-key": settings.MARKET_API_KEY,
            "format": "json",
        }
        
        import difflib

        is_local_filtering = False
        original_limit = limit
        original_offset = offset

        if state:
            # Address common state name differences (e.g. Kerala -> Keralam)
            state_mapped = "Keralam" if state.lower() == "kerala" else state
            params["filters[state.keyword]"] = state_mapped
            
        if district:
            # We will fetch a large batch for the state and fuzzy match the district locally
            params["limit"] = 2000
            params["offset"] = 0
            is_local_filtering = True
        else:
            params["limit"] = limit
            params["offset"] = offset

        if market:
            params["filters[market]"] = market
        if commodity:
            params["filters[commodity]"] = commodity
        if variety:
            params["filters[variety]"] = variety
        if grade:
            params["filters[grade]"] = grade

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, params=params, headers=headers)
                response.raise_for_status()
                data = response.json()
                
                if is_local_filtering and "records" in data:
                    records = data["records"]
                    district_lower = district.lower()
                    
                    # 1. Try exact or substring match
                    filtered = [r for r in records if r.get("district") and district_lower in r["district"].lower()]
                    
                    # 2. Try fuzzy match if no substring matches found
                    if not filtered:
                        unique_districts = list(set(r.get("district", "") for r in records if r.get("district")))
                        closest = difflib.get_close_matches(district, unique_districts, n=2, cutoff=0.5)
                        if closest:
                            matched_district = closest[0].lower()
                            filtered = [r for r in records if r.get("district") and r["district"].lower() == matched_district]
                            
                    # Paginate locally
                    data["records"] = filtered[original_offset:original_offset + original_limit]
                    data["total"] = len(filtered)
                    data["count"] = len(data["records"])
                    data["limit"] = str(original_limit)
                    data["offset"] = str(original_offset)
                    
                return data
        except httpx.HTTPStatusError as e:
            try:
                error_msg = e.response.json().get("error", str(e))
            except Exception:
                error_msg = e.response.text or str(e)
            logger.error(f"Market API returned HTTP Error: {error_msg}")
            return {"status": "error", "message": f"API Error: {error_msg}"}
        except Exception as e:
            logger.error(f"Failed to fetch market rates: {e}")
            return {"status": "error", "message": str(e)}

market_service = MarketService()
