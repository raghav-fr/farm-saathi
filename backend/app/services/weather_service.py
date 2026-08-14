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
        self._redis: Optional[aioredis.Redis] = None

    async def _get_redis(self) -> aioredis.Redis:
        if not self._redis:
            self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._redis

    async def get_raw_weather(self, lat: float, lon: float) -> dict:
        """Fetch raw weather JSON from Open-Meteo API with Redis cache."""
        import asyncio
        
        cache_key = f"openmeteo_weather:{lat:.3f}:{lon:.3f}"
        try:
            r = await self._get_redis()
            cached = await r.get(cache_key)
            if cached:
                logger.debug(f"Weather cache hit: {cache_key}")
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Redis unavailable, fetching live weather: {e}")

        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                url = "https://api.open-meteo.com/v1/forecast"
                params = {
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day",
                    "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max",
                    "timezone": "auto"
                }
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            logger.error(f"Weather API request failed: {e}")
            # Fallback data if Open-Meteo is completely down or times out
            data = {
                "current": {"temperature_2m": 25, "relative_humidity_2m": 50, "apparent_temperature": 25, "precipitation": 0, "weather_code": 0, "wind_speed_10m": 5, "is_day": 1},
                "daily": {"time": [], "temperature_2m_max": [], "temperature_2m_min": [], "precipitation_sum": [], "precipitation_probability_max": [], "uv_index_max": [], "weather_code": []}
            }

        try:
            r = await self._get_redis()
            await r.setex(cache_key, self.CACHE_TTL, json.dumps(data))
        except Exception:
            pass

        return data

    def _get_condition_text(self, code: int) -> str:
        # WMO Weather interpretation codes
        if code == 0: return "Clear sky"
        elif code in [1, 2, 3]: return "Mainly clear, partly cloudy, and overcast"
        elif code in [45, 48]: return "Fog and depositing rime fog"
        elif code in [51, 53, 55]: return "Drizzle"
        elif code in [56, 57]: return "Freezing Drizzle"
        elif code in [61, 63, 65]: return "Rain"
        elif code in [66, 67]: return "Freezing Rain"
        elif code in [71, 73, 75]: return "Snow fall"
        elif code in [77]: return "Snow grains"
        elif code in [80, 81, 82]: return "Rain showers"
        elif code in [85, 86]: return "Snow showers"
        elif code in [95]: return "Thunderstorm"
        elif code in [96, 99]: return "Thunderstorm with hail"
        return "Unknown"

    async def get_weather_with_advisory(
        self,
        lat: float,
        lon: float,
        language: str = "en",
        crop_context: Optional[dict] = None,
    ) -> dict:
        """Parse weather + generate agricultural advisory via LLM with full caching."""
        import json
        
        cache_key = f"weather_advisory:{lat:.3f}:{lon:.3f}:{language}"
        if crop_context:
            cache_key += f":{crop_context.get('crop_name', 'none')}"
            
        try:
            r = await self._get_redis()
            cached = await r.get(cache_key)
            if cached:
                logger.debug(f"Weather advisory cache hit: {cache_key}")
                return json.loads(cached)
        except Exception:
            pass

        raw = await self.get_raw_weather(lat, lon)

        curr = raw.get("current", {})
        daily = raw.get("daily", {})

        current = {
            "temperature_c": curr.get("temperature_2m", 0),
            "feels_like_c": curr.get("apparent_temperature", 0),
            "humidity_pct": curr.get("relative_humidity_2m", 0),
            "rainfall_mm": curr.get("precipitation", 0),
            "wind_kph": curr.get("wind_speed_10m", 0),
            "uv_index": 0, # Not in current for open-meteo, use daily
            "condition": self._get_condition_text(curr.get("weather_code", 0)),
            "condition_icon": "", 
            "is_day": bool(curr.get("is_day", 1)),
        }

        forecast = []
        if "time" in daily:
            for i in range(len(daily["time"])):
                forecast.append({
                    "date": daily["time"][i],
                    "max_temp_c": daily["temperature_2m_max"][i],
                    "min_temp_c": daily["temperature_2m_min"][i],
                    "avg_temp_c": (daily["temperature_2m_max"][i] + daily["temperature_2m_min"][i]) / 2,
                    "total_rainfall_mm": daily["precipitation_sum"][i],
                    "avg_humidity_pct": 50, # Approximation, open-meteo daily doesn't have humidity
                    "uv_index": daily["uv_index_max"][i] if "uv_index_max" in daily else 0,
                    "condition": self._get_condition_text(daily["weather_code"][i]),
                    "condition_icon": "",
                    "chance_of_rain_pct": daily["precipitation_probability_max"][i] if "precipitation_probability_max" in daily else 0,
                })

        # Generate agricultural advisory
        advisory = await self._generate_advisory(current, forecast, crop_context, language)

        # Reverse geocode for accurate location name
        location_name = "Current Location"
        region_name = ""
        country_name = ""
        try:
            async with httpx.AsyncClient(timeout=5, follow_redirects=True) as client:
                geo_resp = await client.get(
                    "https://api.bigdatacloud.net/data/reverse-geocode-client",
                    params={"latitude": lat, "longitude": lon, "localityLanguage": "en"}
                )
                if geo_resp.status_code == 200:
                    geo_data = geo_resp.json()
                    location_name = geo_data.get("locality") or geo_data.get("city") or "Current Location"
                    region_name = geo_data.get("principalSubdivision", "")
                    country_name = geo_data.get("countryName", "")
        except Exception as e:
            logger.warning(f"Reverse geocoding failed: {e}")

        result = {
            "location": {
                "name": location_name,
                "region": region_name,
                "country": country_name,
                "lat": lat,
                "lon": lon,
            },
            "current": current,
            "forecast": forecast,
            "agricultural_advisory": advisory,
            "alerts": [],  # Google Weather doesn't natively include simple alerts string array in the same way, we can leave this empty or fetch alerts explicitly
        }

        try:
            r = await self._get_redis()
            await r.setex(cache_key, self.CACHE_TTL, json.dumps(result))
        except Exception:
            pass

        return result

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
