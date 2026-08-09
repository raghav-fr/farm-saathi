"""
FarmSaathi AI — Weather Service
Fetches weather from WeatherAPI.com, caches in Redis, generates agricultural advisory.
"""
import json
from typing import Any, Optional

import httpx
import redis.asyncio as aioredis
from loguru import logger

from app.core.config import settings


class WeatherService:
    CACHE_TTL = 1800  # 30 minutes

    def __init__(self):
        self.api_key = settings.WEATHER_API_KEY
        self.base_url = settings.WEATHER_API_BASE_URL
        self._redis: Optional[aioredis.Redis] = None

    async def _get_redis(self) -> aioredis.Redis:
        if not self._redis:
            self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._redis

    async def get_raw_weather(self, lat: float, lon: float) -> dict:
        """Fetch raw weather JSON from WeatherAPI.com with Redis cache."""
        cache_key = f"weather:{lat:.3f}:{lon:.3f}"
        try:
            r = await self._get_redis()
            cached = await r.get(cache_key)
            if cached:
                logger.debug(f"Weather cache hit: {cache_key}")
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Redis unavailable, fetching live weather: {e}")

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{self.base_url}/forecast.json",
                params={
                    "key": self.api_key,
                    "q": f"{lat},{lon}",
                    "days": 7,
                    "aqi": "no",
                    "alerts": "yes",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        try:
            r = await self._get_redis()
            await r.setex(cache_key, self.CACHE_TTL, json.dumps(data))
        except Exception:
            pass

        return data

    async def get_weather_with_advisory(
        self,
        lat: float,
        lon: float,
        language: str = "en",
        crop_context: Optional[dict] = None,
    ) -> dict:
        """Parse weather + generate agricultural advisory via LLM."""
        raw = await self.get_raw_weather(lat, lon)

        current_data = raw.get("current", {})
        forecast_days = raw.get("forecast", {}).get("forecastday", [])
        location_data = raw.get("location", {})
        alerts_data = raw.get("alerts", {}).get("alert", [])

        current = {
            "temperature_c": current_data.get("temp_c", 0),
            "feels_like_c": current_data.get("feelslike_c", 0),
            "humidity_pct": current_data.get("humidity", 0),
            "rainfall_mm": current_data.get("precip_mm", 0),
            "wind_kph": current_data.get("wind_kph", 0),
            "uv_index": current_data.get("uv", 0),
            "condition": current_data.get("condition", {}).get("text", ""),
            "condition_icon": current_data.get("condition", {}).get("icon", ""),
            "is_day": bool(current_data.get("is_day", 1)),
        }

        forecast = []
        for day in forecast_days:
            d = day.get("day", {})
            forecast.append({
                "date": day.get("date", ""),
                "max_temp_c": d.get("maxtemp_c", 0),
                "min_temp_c": d.get("mintemp_c", 0),
                "avg_temp_c": d.get("avgtemp_c", 0),
                "total_rainfall_mm": d.get("totalprecip_mm", 0),
                "avg_humidity_pct": d.get("avghumidity", 0),
                "uv_index": d.get("uv", 0),
                "condition": d.get("condition", {}).get("text", ""),
                "condition_icon": d.get("condition", {}).get("icon", ""),
                "chance_of_rain_pct": d.get("daily_chance_of_rain", 0),
            })

        # Generate agricultural advisory
        advisory = await self._generate_advisory(current, forecast, crop_context, language)

        return {
            "location": {
                "name": location_data.get("name", ""),
                "region": location_data.get("region", ""),
                "country": location_data.get("country", ""),
                "lat": location_data.get("lat", lat),
                "lon": location_data.get("lon", lon),
            },
            "current": current,
            "forecast": forecast,
            "agricultural_advisory": advisory,
            "alerts": alerts_data[:5],  # max 5 alerts
        }

    async def _generate_advisory(
        self,
        current: dict,
        forecast: list,
        crop_context: Optional[dict],
        language: str,
    ) -> str:
        """Use local LLM to generate weather-based agricultural advisory."""
        try:
            from app.ai.llm_service import LLMService

            llm = LLMService()

            rain_next_3_days = sum(d["total_rainfall_mm"] for d in forecast[:3])
            max_temp_next_3 = max((d["max_temp_c"] for d in forecast[:3]), default=0)

            crop_info = ""
            if crop_context:
                crop_info = f"\nFarm crop: {crop_context.get('crop_name', 'unknown')}"
                crop_info += f"\nCrop stage: {crop_context.get('stage', 'unknown')}"

            prompt = f"""You are FarmSaathi AI, an agricultural weather advisor.

Current weather: {current['temperature_c']}°C, {current['humidity_pct']}% humidity, {current['condition']}
Rainfall next 3 days: {rain_next_3_days:.1f} mm
Max temperature next 3 days: {max_temp_next_3:.1f}°C
{crop_info}

Generate a short, practical agricultural advisory (2-3 sentences) for the farmer.
Focus on: irrigation needs, field operations timing, crop protection if needed.
Respond in language: {language}
Do not invent specific chemical recommendations. Keep it simple and actionable."""

            return await llm.complete(prompt, max_tokens=200)
        except Exception as e:
            logger.warning(f"LLM advisory failed, using fallback: {e}")
            return self._fallback_advisory(current, forecast)

    def _fallback_advisory(self, current: dict, forecast: list) -> str:
        rain_total = sum(d.get("total_rainfall_mm", 0) for d in forecast[:3])
        if rain_total > 20:
            return "Heavy rainfall expected in the next 3 days. Avoid irrigation and ensure proper field drainage."
        elif current["temperature_c"] > 38:
            return "Very high temperatures expected. Ensure adequate irrigation and consider shade nets for sensitive crops."
        elif current["humidity_pct"] > 85:
            return "High humidity conditions. Monitor crops for fungal disease symptoms."
        return "Weather conditions are generally favorable for farming operations."
