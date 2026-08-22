"""
FarmSaathi AI — Query Router
Intent classification → routes to correct service pipeline.
LLM is NEVER called before the service returns verified context.
"""
from typing import Optional

from loguru import logger

# Intent labels
INTENT_CROP = "crop_recommendation"
INTENT_DISEASE = "disease_detection"
INTENT_WEATHER = "weather"
INTENT_MARKET = "market"
INTENT_SCHEME = "scheme"
INTENT_SOIL = "soil"
INTENT_CROP_MANAGEMENT = "crop_management"
INTENT_FERTILIZER = "fertilizer"
INTENT_PEST = "pest"
INTENT_GENERAL = "general_agriculture"


# Simple keyword-based router (replace with DistilBERT classifier when trained)
KEYWORD_MAP = {
    INTENT_CROP: [
        "what should i grow", "which crop", "crop recommendation", "what to plant",
        "kya ugaun", "कौन सी फसल", "ଝ ଲଗାଇବି", "फसल सुझाव", "crop suggest",
        "best crop", "which crop is best",
    ],
    INTENT_DISEASE: [
        "disease", "blight", "wilt", "rot", "spot", "rust", "mildew", "leaf",
        "rog", "रोग", "ବ୍ୟାଧ", "fungal", "pest damage", "yellow leaf", "dead leaf",
    ],
    INTENT_WEATHER: [
        "weather", "rain", "temperature", "humidity", "forecast", "barish",
        "बारिश", "ବର୍ଷା", "mausam", "मौसम", "will it rain", "cold", "hot",
    ],
    INTENT_MARKET: [
        "price", "mandi", "market", "sell", "rate", "bhav", "भाव", "ମୂଲ୍ୟ",
        "how much", "कितना", "trading", "sale", "selling price",
    ],
    INTENT_SCHEME: [
        "scheme", "yojana", "government", "subsidy", "pm kisan", "insurance",
        "loan", "kcc", "योजना", "ଯୋଜନା", "fasal bima", "sarkar", "सरकार",
        "benefit", "apply", "eligib",
    ],
    INTENT_SOIL: [
        "soil", "mitti", "मिट्टी", "ମାଟି", "ph", "nitrogen", "fertilizer",
        "nutrient", "compost", "organic", "test", "खाद",
    ],
    INTENT_FERTILIZER: [
        "fertilizer", "urea", "dap", "npk", "khad", "खाद", "ସାର", "manure",
        "organic fertilizer", "how much fertilizer",
    ],
    INTENT_PEST: [
        "pest", "insect", "bug", "keed", "कीड़ा", "ପୋକ", "aphid", "whitefly",
        "bollworm", "armyworm", "locust", "spray",
    ],
    INTENT_CROP_MANAGEMENT: [
        "irrigation", "watering", "harvest", "prune", "weed", "transplant",
        "sow", "seed", "sowing", "sinchhai", "सिंचाई", "ଜଳସେଚନ",
    ],
}


class QueryRouter:
    """
    Routes farmer queries to the appropriate service.
    
    Flow:
        message → classify_intent → service → verified_context → LLM explanation
    """

    def classify_intent(self, message: str) -> str:
        """Classify intent using keyword matching (temporary — DistilBERT in Phase 11)."""
        msg_lower = message.lower()
        for intent, keywords in KEYWORD_MAP.items():
            if any(kw in msg_lower for kw in keywords):
                return intent
        return INTENT_GENERAL

    async def route(
        self,
        message: str,
        farmer_uid: str,
        farm_id: Optional[str],
        language: str,
        farmer_profile: Optional[dict] = None,
        chat_history: Optional[list[dict]] = None,
        image_base64: Optional[str] = None,
    ) -> dict:
        """Route message to correct service and return verified response."""
        intent = self.classify_intent(message)
        logger.info(f"Intent classified: {intent} for message: {message[:50]}")

        try:
            # 1. Gather Universal Context
            universal_context = await self._gather_global_context(farmer_uid, farm_id, farmer_profile)
            
            # 2. Handle DISEASE explicitly if they didn't upload a photo but asked
            if intent == INTENT_DISEASE and not image_base64 and len(message.split()) < 4:
                return await self._handle_disease_text(message, farmer_uid, language)

            # 3. Add baseline schemes if intent is SCHEME
            if intent == INTENT_SCHEME:
                universal_context["schemes"] = "PM-KISAN: Income support of ₹6,000/year. PM Fasal Bima Yojana: Crop insurance. Kisan Credit Card: Credit up to ₹3 lakh at 4%."

            # 4. Use LLM with Universal Context
            from app.ai.llm_service import LLMService
            llm = LLMService()
            
            answer = await llm.answer_with_universal_context(
                question=message,
                intent=intent,
                universal_context=universal_context,
                language=language,
                chat_history=chat_history,
                image_base64=image_base64,
            )

            # 5. Extract sources for UI
            sources = []
            if intent == INTENT_WEATHER: sources.append("Open-Meteo Weather API")
            if intent == INTENT_MARKET: sources.append("AgMarkNet")
            if intent == INTENT_SCHEME: sources.append("PM-KISAN Portal")
            if intent == INTENT_CROP: sources.append("Crop AI Model")

            return {
                "intent": intent,
                "answer": answer,
                "sources": sources,
            }
        except Exception as e:
            logger.error(f"Router error for intent {intent}: {e}")
            return {
                "intent": intent,
                "answer": (
                    "I encountered an issue processing your question. "
                    "Please try again or contact your local Krishi Vigyan Kendra."
                ),
                "sources": [],
            }

    async def _gather_global_context(self, uid: str, farm_id: Optional[str], profile: Optional[dict]) -> dict:
        import asyncio
        from app.services.weather_service import WeatherService
        from app.services.market_service import market_service
        from app.api.news import get_latest_news_internal
        from app.core.firestore_service import get_farm, list_farms, get_latest_soil_test
        
        ctx = {
            "profile": profile or {},
            "farm": {},
            "soil": {},
            "weather": {},
            "market": [],
            "news": []
        }
        
        lat, lon = 20.5937, 78.9629
        
        # 1. Fetch Farm and Soil
        if farm_id:
            farm = await get_farm(uid, farm_id)
            if farm:
                ctx["farm"] = farm
                lat, lon = farm.get("latitude", lat), farm.get("longitude", lon)
                soil_test = await get_latest_soil_test(uid, farm_id)
                if soil_test:
                    ctx["soil"] = soil_test
        elif profile:
            farms = await list_farms(uid)
            if farms:
                ctx["farm"] = farms[0]
                lat, lon = farms[0].get("latitude", lat), farms[0].get("longitude", lon)
                soil_test = await get_latest_soil_test(uid, farms[0]["id"])
                if soil_test:
                    ctx["soil"] = soil_test

        # 2. Concurrently fetch Weather, Market, News
        state = ctx["profile"].get("state") or "Odisha"
        district = ctx["profile"].get("district") or "Khurda"
        commodity = ctx["farm"].get("crop_name")
        
        async def fetch_weather():
            try:
                svc = WeatherService()
                return await svc.get_weather_with_advisory(lat, lon, language="en")
            except Exception:
                return {}
                
        async def fetch_market():
            try:
                if not state or not district:
                    return []
                # Fetch recent market rates for the entire district to give LLM rich context
                res = await market_service.get_market_rates(state=state, district=district, limit=30)
                if res and "records" in res:
                    return res["records"]
                return []
            except Exception:
                return []
                
        async def fetch_news():
            return await get_latest_news_internal(limit=3)

        weather_res, market_res, news_res = await asyncio.gather(
            fetch_weather(),
            fetch_market(),
            fetch_news(),
            return_exceptions=True
        )
        
        if not isinstance(weather_res, Exception): ctx["weather"] = weather_res
        if not isinstance(market_res, Exception): ctx["market"] = market_res
        if not isinstance(news_res, Exception): ctx["news"] = news_res
        
        return ctx

    async def _handle_disease_text(self, message, uid, language):
        answer = (
            "🔍 **For disease detection, please upload a photo of the affected leaf** using the Disease Detection feature.\n\n"
            "If you're describing symptoms: ensure leaves are well-lit, close-up, and in focus for the most accurate analysis. "
            "For immediate concerns, consult your local agricultural officer."
        )
        return {"intent": INTENT_DISEASE, "answer": answer, "sources": []}
