"""
FarmSaathi AI — Crop Recommendation Engine
XGBoost model + composite scoring. No LLM involved in decisions.
"""
import json
import os
from pathlib import Path
from typing import Optional

import numpy as np
from loguru import logger

from app.core.config import settings


class CropEngine:
    """
    Crop recommendation using XGBoost + agronomic composite scoring.
    
    Composite score formula:
        final = 0.40 × ml_score
              + 0.20 × weather_score
              + 0.20 × soil_score
              + 0.10 × water_score
              + 0.10 × season_score
    """

    # Crop → season suitability map (simplified)
    SEASON_MAP = {
        "kharif": ["rice", "paddy", "maize", "cotton", "sugarcane", "groundnut",
                   "soybean", "bajra", "jowar", "pigeonpea", "moongbean", "mothbeans",
                   "blackgram", "jute", "coffee"],
        "rabi": ["wheat", "barley", "mustard", "pea", "lentil", "chickpea",
                 "potato", "tomato", "onion", "garlic"],
        "zaid": ["watermelon", "muskmelon", "cucumber", "bitter gourd", "pumpkin",
                 "mung bean", "moongbean"],
        "perennial": ["coconut", "banana", "papaya", "mango", "arecanut",
                      "rubber", "tea", "coffee", "sugarcane"],
    }

    # Soil type suitability per crop
    SOIL_SUITABILITY = {
        "rice": ["clay", "loamy", "silty"],
        "paddy": ["clay", "loamy", "silty"],
        "wheat": ["loamy", "clay", "silty"],
        "maize": ["loamy", "sandy", "silty"],
        "cotton": ["black", "loamy", "clay"],
        "sugarcane": ["loamy", "clay", "silty"],
        "groundnut": ["sandy", "loamy", "red"],
        "soybean": ["loamy", "clay"],
        "chickpea": ["sandy", "loamy"],
        "lentil": ["loamy", "silty"],
        "mustard": ["loamy", "sandy", "clay"],
        "potato": ["loamy", "sandy"],
        "tomato": ["loamy", "clay", "silty"],
        "coconut": ["sandy", "loamy", "laterite"],
        "banana": ["loamy", "clay"],
        "coffee": ["loamy", "red", "laterite"],
        "tea": ["loamy", "red", "laterite"],
        "mango": ["loamy", "sandy", "red"],
        "jute": ["loamy", "silty", "clay"],
        "default": ["loamy"],
    }

    # Irrigation requirement per crop
    WATER_NEEDS = {
        "low": ["bajra", "jowar", "groundnut", "mustard", "chickpea", "lentil", "mungbean"],
        "medium": ["wheat", "maize", "soybean", "potato", "tomato", "cotton"],
        "high": ["rice", "paddy", "sugarcane", "banana", "jute", "tea"],
    }

    def __init__(self):
        self._model = None
        self._encoder = None
        self._model_loaded = False

    def _load_model(self):
        """Lazy-load XGBoost model."""
        if self._model_loaded:
            return

        try:
            import xgboost as xgb
            import json

            model_path = Path(settings.CROP_MODEL_PATH)
            encoder_path = Path(settings.CROP_ENCODER_PATH)

            if model_path.exists() and encoder_path.exists():
                self._model = xgb.XGBClassifier()
                self._model.load_model(str(model_path))
                with open(encoder_path, "r") as f:
                    self._encoder_classes = json.load(f)
                logger.info("Crop model loaded successfully")
            else:
                logger.warning("Crop model files not found. Using agronomic scoring only.")
        except ImportError:
            logger.warning("XGBoost is not installed. Using agronomic scoring only.")

        self._model_loaded = True

    def _ml_probabilities(self, features: dict) -> dict[str, float]:
        """Run XGBoost inference and return crop → probability dict."""
        self._load_model()
        if self._model is None:
            return {}

        try:
            feature_order = ["Temperature", "Humidity", "pH", "Rainfall"]
            row = [
                features.get("temperature", 25),
                features.get("humidity", 65),
                features.get("ph", 6.5),
                features.get("rainfall", 100),
            ]
            
            probs = self._model.predict_proba([row])[0]
            classes = self._encoder_classes
            return {cls: float(p) for cls, p in zip(classes, probs)}
        except Exception as e:
            logger.error(f"XGBoost inference failed: {e}")
            return {}

    def _weather_score(self, crop: str, weather: dict) -> float:
        """Score crop-weather compatibility (0-1)."""
        temp = weather.get("temp_c", 25)
        humidity = weather.get("humidity", 65)
        rainfall = weather.get("precip_mm", 5)

        # Simple heuristic — would be replaced by trained model
        score = 0.7  # base score

        if crop in ["rice", "paddy"]:
            score = 1.0 if (22 <= temp <= 35 and humidity > 70) else 0.5
        elif crop in ["wheat"]:
            score = 1.0 if (10 <= temp <= 25) else 0.4
        elif crop in ["maize"]:
            score = 1.0 if (20 <= temp <= 35) else 0.6
        elif crop in ["cotton"]:
            score = 1.0 if (25 <= temp <= 40 and humidity < 75) else 0.5
        elif crop in ["mustard"]:
            score = 1.0 if (10 <= temp <= 25) else 0.4

        return min(1.0, max(0.0, score))

    def _soil_score(self, crop: str, soil_type: str) -> float:
        suitable_soils = self.SOIL_SUITABILITY.get(crop, self.SOIL_SUITABILITY["default"])
        if soil_type in suitable_soils:
            return 1.0
        return 0.4

    def _water_score(self, crop: str, has_irrigation: bool, rainfall_mm: float) -> float:
        if crop in self.WATER_NEEDS["high"]:
            return 1.0 if has_irrigation else (0.8 if rainfall_mm > 10 else 0.3)
        elif crop in self.WATER_NEEDS["low"]:
            return 1.0  # can grow with just rain
        return 0.8 if (has_irrigation or rainfall_mm > 5) else 0.5

    def _season_score(self, crop: str, season: Optional[str]) -> float:
        if not season:
            return 0.8  # neutral
        suitable = self.SEASON_MAP.get(season, [])
        return 1.0 if crop in suitable else 0.3

    def _build_reasons(
        self, crop: str, weather_s: float, soil_s: float, water_s: float, season_s: float, soil_type: str
    ) -> tuple[list[str], list[str]]:
        reasons, warnings = [], []
        if weather_s >= 0.8:
            reasons.append("Suitable temperature and humidity")
        if soil_s >= 0.8:
            reasons.append(f"Good soil match ({soil_type})")
        if water_s >= 0.8:
            reasons.append("Adequate water availability")
        if season_s >= 0.8:
            reasons.append("Correct growing season")

        if weather_s < 0.6:
            warnings.append("Current weather may not be ideal")
        if water_s < 0.5:
            warnings.append("Irrigation recommended for this crop")

        return reasons, warnings

    async def recommend(
        self,
        soil: dict,
        weather: dict,
        has_irrigation: bool = False,
        season: Optional[str] = None,
        previous_crop: Optional[str] = None,
        language: str = "en",
        top_n: int = 5,
    ) -> dict:
        """
        Main recommendation pipeline.
        Returns top N crops with composite scores and LLM explanation.
        """
        soil_type = soil.get("soil_type", "loamy")
        rainfall_mm = weather.get("precip_mm", 5)
        missing_data = []

        if not soil.get("ph"):
            missing_data.append("Soil pH not provided")
        if not soil.get("nitrogen"):
            missing_data.append("Soil nitrogen (N) value not provided")

        # Get ML probabilities
        ml_probs = self._ml_probabilities({
            "nitrogen": soil.get("nitrogen", 50),
            "phosphorus": soil.get("phosphorus", 50),
            "potassium": soil.get("potassium", 50),
            "temperature": weather.get("temp_c", 25),
            "humidity": weather.get("humidity", 65),
            "rainfall": rainfall_mm * 10,  # convert mm/day to approx mm/month
            "ph": soil.get("ph", 6.5),
        })

        # Build candidate crop list
        all_crops = set(ml_probs.keys()) if ml_probs else set()
        for crops in self.SEASON_MAP.values():
            all_crops.update(crops)

        scored = []
        for crop in all_crops:
            ml_s = ml_probs.get(crop, 0.3)
            wx_s = self._weather_score(crop, weather)
            so_s = self._soil_score(crop, soil_type)
            wa_s = self._water_score(crop, has_irrigation, rainfall_mm)
            se_s = self._season_score(crop, season)

            final = (0.40 * ml_s + 0.20 * wx_s + 0.20 * so_s + 0.10 * wa_s + 0.10 * se_s)
            reasons, warnings = self._build_reasons(crop, wx_s, so_s, wa_s, se_s, soil_type)

            scored.append({
                "crop": crop,
                "score": round(final, 4),
                "ml_score": round(ml_s, 4),
                "weather_score": round(wx_s, 4),
                "soil_score": round(so_s, 4),
                "water_score": round(wa_s, 4),
                "season_score": round(se_s, 4),
                "reasons": reasons,
                "warnings": warnings,
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        top = scored[:top_n]

        # LLM explanation
        try:
            from app.ai.llm_service import LLMService
            llm = LLMService()
            explanation = await llm.explain_crop_recommendation(top, weather, soil, language)
        except Exception:
            explanation = f"Based on your soil and weather conditions, {top[0]['crop'].title()} is the top recommended crop."

        return {
            "recommendations": top,
            "explanation": explanation,
            "weather_summary": {
                "temperature_c": weather.get("temp_c", 25),
                "humidity_pct": weather.get("humidity", 65),
                "rainfall_mm": rainfall_mm,
            },
            "missing_data": missing_data,
            "language": language,
        }
