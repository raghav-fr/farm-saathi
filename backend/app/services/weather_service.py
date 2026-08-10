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
        self.api_key = settings.GOOGLE_WEATHER_API_KEY
        self.base_url = settings.WEATHER_API_BASE_URL
        self._redis: Optional[aioredis.Redis] = None

    async def _get_redis(self) -> aioredis.Redis:
        if not self._redis:
            self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._redis

    async def get_raw_weather(self, lat: float, lon: float) -> dict:
        """Fetch raw weather JSON from Google Weather API with Redis cache."""
        import asyncio
        
        cache_key = f"google_weather:{lat:.3f}:{lon:.3f}"
        try:
            r = await self._get_redis()
            cached = await r.get(cache_key)
            if cached:
                logger.debug(f"Weather cache hit: {cache_key}")
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Redis unavailable, fetching live weather: {e}")

        async with httpx.AsyncClient(timeout=10) as client:
            current_req = client.get(
                f"{self.base_url}/currentConditions:lookup",
                params={
                    "key": self.api_key,
                    "location.latitude": lat,
                    "location.longitude": lon,
                },
            )
            forecast_req = client.get(
                f"{self.base_url}/forecast/days:lookup",
                params={
                    "key": self.api_key,
                    "location.latitude": lat,
                    "location.longitude": lon,
                    "pageSize": 7,
                },
            )
            current_resp, forecast_resp = await asyncio.gather(current_req, forecast_req)
            
            current_resp.raise_for_status()
            forecast_resp.raise_for_status()
            
            data = {
                "currentConditions": current_resp.json(),
                "forecastDays": forecast_resp.json().get("days", [])
            }

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

        current_data = raw.get("currentConditions", {})
        forecast_days = raw.get("forecastDays", [])

        current = {
            "temperature_c": current_data.get("temperature", {}).get("degrees", 0),
            "feels_like_c": current_data.get("feelsLikeTemperature", {}).get("degrees", 0),
            "humidity_pct": current_data.get("relativeHumidity", 0),
            "rainfall_mm": current_data.get("precipitation", {}).get("qpf", {}).get("quantity", 0),
            "wind_kph": current_data.get("wind", {}).get("speed", {}).get("value", 0),
            "uv_index": current_data.get("uvIndex", 0),
            "condition": current_data.get("weatherCondition", {}).get("description", {}).get("text", ""),
            "condition_icon": current_data.get("weatherCondition", {}).get("iconBaseUri", "") + ".png" if current_data.get("weatherCondition", {}).get("iconBaseUri", "") else "",
            "is_day": bool(current_data.get("isDaytime", True)),
        }

        forecast = []
        for day in forecast_days:
            # Construct date safely
            d_date = day.get("displayDate", {})
            date_str = f"{d_date.get('year', 2026)}-{d_date.get('month', 1):02d}-{d_date.get('day', 1):02d}"
            
            dtf = day.get("daytimeForecast", {})
            ntf = day.get("nighttimeForecast", {})
            
            rain_day = dtf.get("precipitation", {}).get("qpf", {}).get("quantity", 0)
            rain_night = ntf.get("precipitation", {}).get("qpf", {}).get("quantity", 0)
            
            forecast.append({
                "date": date_str,
                "max_temp_c": day.get("maxTemperature", {}).get("degrees", 0),
                "min_temp_c": day.get("minTemperature", {}).get("degrees", 0),
                "avg_temp_c": (day.get("maxTemperature", {}).get("degrees", 0) + day.get("minTemperature", {}).get("degrees", 0)) / 2,
                "total_rainfall_mm": rain_day + rain_night,
                "avg_humidity_pct": (dtf.get("relativeHumidity", 0) + ntf.get("relativeHumidity", 0)) / 2,
                "uv_index": dtf.get("uvIndex", 0),
                "condition": dtf.get("weatherCondition", {}).get("description", {}).get("text", ""),
                "condition_icon": dtf.get("weatherCondition", {}).get("iconBaseUri", "") + ".png" if dtf.get("weatherCondition", {}).get("iconBaseUri", "") else "",
                "chance_of_rain_pct": max(
                    dtf.get("precipitation", {}).get("probability", {}).get("percent", 0),
                    ntf.get("precipitation", {}).get("probability", {}).get("percent", 0)
                ),
            })

        # Generate agricultural advisory
        advisory = await self._generate_advisory(current, forecast, crop_context, language)

        # Reverse geocode for accurate location name
        location_name = "Current Location"
        region_name = ""
        country_name = ""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                geo_resp = await client.get(
                    "https://maps.googleapis.com/maps/api/geocode/json",
                    params={"latlng": f"{lat},{lon}", "key": self.api_key}
                )
                if geo_resp.status_code == 200:
                    geo_data = geo_resp.json()
                    if geo_data.get("results"):
                        comps = geo_data["results"][0].get("address_components", [])
                        for c in comps:
                            if "locality" in c["types"]:
                                location_name = c["long_name"]
                            elif "administrative_area_level_1" in c["types"]:
                                region_name = c["long_name"]
                            elif "country" in c["types"]:
                                country_name = c["long_name"]
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
