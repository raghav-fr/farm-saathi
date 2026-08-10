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
    ) -> dict:
        """Route message to correct service and return verified response."""
        intent = self.classify_intent(message)
        logger.info(f"Intent classified: {intent} for message: {message[:50]}")

        try:
            if intent == INTENT_WEATHER:
                return await self._handle_weather(message, farmer_uid, farm_id, language, farmer_profile)
            elif intent == INTENT_CROP:
                return await self._handle_crop_recommendation(message, farmer_uid, farm_id, language, farmer_profile)
            elif intent == INTENT_MARKET:
                return await self._handle_market(message, farmer_uid, language, farmer_profile)
            elif intent == INTENT_SCHEME:
                return await self._handle_schemes(message, farmer_uid, language, farmer_profile)
            elif intent in (INTENT_SOIL, INTENT_FERTILIZER):
                return await self._handle_soil(message, farmer_uid, farm_id, language)
            elif intent in (INTENT_DISEASE, INTENT_PEST):
                return await self._handle_disease_text(message, farmer_uid, language)
            else:
                return await self._handle_general(message, farmer_uid, language, farmer_profile)
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

    async def _handle_weather(self, message, uid, farm_id, language, profile):
        from app.services.weather_service import WeatherService
        from app.core.firestore_service import get_farm, list_farms

        # Try to get farm location
        lat, lon = 20.5937, 78.9629  # default: center of India
        if farm_id:
            farm = await get_farm(uid, farm_id)
            if farm:
                lat, lon = farm["latitude"], farm["longitude"]
        elif profile:
            farms = await list_farms(uid)
            if farms:
                lat, lon = farms[0]["latitude"], farms[0]["longitude"]

        svc = WeatherService()
        weather = await svc.get_weather_with_advisory(lat, lon, language=language)

        answer = weather["agricultural_advisory"]
        current = weather["current"]
        answer = (
            f"**Weather Update:**\n"
            f"🌡️ {current['temperature_c']}°C | 💧 {current['humidity_pct']}% humidity | "
            f"🌧️ {current['rainfall_mm']} mm rainfall\n"
            f"Condition: {current['condition']}\n\n"
            f"**Advisory:** {answer}"
        )

        return {"intent": INTENT_WEATHER, "answer": answer, "sources": ["Google Weather API"]}

    async def _handle_crop_recommendation(self, message, uid, farm_id, language, profile):
        from app.ai.crop_engine import CropEngine
        from app.services.weather_service import WeatherService
        from app.core.firestore_service import get_farm, list_farms, get_latest_soil_test

        lat, lon = 20.5937, 78.9629
        farm_context = {}
        soil_context = {}

        if farm_id:
            farm = await get_farm(uid, farm_id)
            if farm:
                farm_context = farm
                lat, lon = farm["latitude"], farm["longitude"]
                soil_test = await get_latest_soil_test(uid, farm_id)
                if soil_test:
                    soil_context = soil_test
        elif profile:
            farms = await list_farms(uid)
            if farms:
                farm_context = farms[0]
                lat, lon = farms[0]["latitude"], farms[0]["longitude"]

        weather_raw = await WeatherService().get_raw_weather(lat, lon)
        current = weather_raw.get("current", {})

        engine = CropEngine()
        result = await engine.recommend(
            soil={
                "soil_type": farm_context.get("soil_type", "loamy"),
                "ph": soil_context.get("ph"),
                "nitrogen": soil_context.get("nitrogen_kg_ha"),
                "phosphorus": soil_context.get("phosphorus_kg_ha"),
                "potassium": soil_context.get("potassium_kg_ha"),
            },
            weather=current,
            has_irrigation=farm_context.get("has_irrigation", False),
            language=language,
        )

        top = result["recommendations"][:3]
        crops_list = "\n".join(
            f"{i+1}. **{r['crop'].title()}** — {r['score']:.0%} match"
            for i, r in enumerate(top)
        )

        answer = f"**Crop Recommendations:**\n{crops_list}\n\n{result['explanation']}"

        return {"intent": INTENT_CROP, "answer": answer, "sources": ["Crop AI Model"]}

    async def _handle_market(self, message, uid, language, profile):
        # Placeholder — market service in Phase 12
        answer = (
            "For current mandi prices, please check the **AgMarkNet** portal (agmarknet.gov.in) "
            "or your local APMC mandi. Real-time market integration is coming soon in FarmSaathi."
        )
        return {"intent": INTENT_MARKET, "answer": answer, "sources": ["AgMarkNet"]}

    async def _handle_schemes(self, message, uid, language, profile):
        from app.ai.llm_service import LLMService
        # RAG-based scheme lookup (simplified — full RAG in Phase 12)
        rag_context = """
PM-KISAN: Income support of ₹6,000/year to all land-holding farmer families.
Eligibility: Land-owning farmers. Exclusion: Income tax payers, govt employees, constitutional post holders.

PM Fasal Bima Yojana: Crop insurance scheme. Premium: 2% for Kharif, 1.5% for Rabi.
Eligibility: All farmers growing notified crops.

Kisan Credit Card (KCC): Provides credit up to ₹3 lakh at 4% interest.
Eligibility: All farmers, including tenant farmers and sharecroppers.
"""
        state = profile.get("state", "") if profile else ""
        context_with_state = f"Farmer state: {state}\n\n{rag_context}"

        llm = LLMService()
        answer = await llm.answer_general_question(message, context_with_state, profile, language)
        return {"intent": INTENT_SCHEME, "answer": answer, "sources": ["PM-KISAN Portal", "PMFBY"]}

    async def _handle_soil(self, message, uid, farm_id, language):
        from app.ai.llm_service import LLMService
        from app.core.firestore_service import get_latest_soil_test

        context = "General soil health guidance:\n"
        if farm_id:
            soil_test = await get_latest_soil_test(uid, farm_id)
            if soil_test:
                context = f"Your soil test results: pH={soil_test.get('ph')}, N={soil_test.get('nitrogen_kg_ha')} kg/ha, P={soil_test.get('phosphorus_kg_ha')} kg/ha, K={soil_test.get('potassium_kg_ha')} kg/ha\n"

        context += """
For soil health: pH 6-7 is ideal for most crops.
Low nitrogen: Apply well-decomposed FYM or green manure.
Low phosphorus: Apply single super phosphate (SSP) as per soil test.
Low potassium: Apply muriate of potash (MOP) as per soil test.
Always consult your local Krishi Vigyan Kendra for specific fertilizer dose recommendations.
"""

        llm = LLMService()
        answer = await llm.answer_general_question(message, context, None, language)
        return {"intent": INTENT_SOIL, "answer": answer, "sources": ["ICAR Guidelines"]}

    async def _handle_disease_text(self, message, uid, language):
        answer = (
            "🔍 **For disease detection, please upload a photo of the affected leaf** using the Disease Detection feature.\n\n"
            "If you're describing symptoms: ensure leaves are well-lit, close-up, and in focus for the most accurate analysis. "
            "For immediate concerns, consult your local agricultural officer."
        )
        return {"intent": INTENT_DISEASE, "answer": answer, "sources": []}

    async def _handle_general(self, message, uid, language, profile):
        from app.ai.llm_service import LLMService
        # General RAG query (simplified — full Qdrant RAG in Phase 12)
        general_context = """
FarmSaathi AI can help with:
- Crop recommendations based on your soil and weather
- Plant disease detection from photos
- Weather forecasts and farming advisories
- Government scheme eligibility checking
- Market price information
- Soil health guidance
"""
        llm = LLMService()
        answer = await llm.answer_general_question(message, general_context, profile, language)
        return {"intent": INTENT_GENERAL, "answer": answer, "sources": []}
