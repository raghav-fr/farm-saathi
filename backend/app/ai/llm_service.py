"""
FarmSaathi AI — Local LLM service (Qwen3:4B via Ollama)
ONLY used for explanation/communication, never for making decisions.
"""
import asyncio
from typing import Optional

import httpx
from loguru import logger

from app.core.config import settings


class LLMService:
    """
    Thin wrapper around OpenRouter REST API with round-robin API key rotation.
    
    IMPORTANT ARCHITECTURAL RULE:
    The LLM never makes agricultural decisions.
    It only converts verified ML/rule-based outputs into
    farmer-friendly natural language explanations.
    """

    def __init__(self):
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = "google/gemma-4-31b-it:free"
        # Load keys from environment, splitting by comma
        keys_str = getattr(settings, "OPENROUTER_API_KEYS", "")
        self.api_keys = [k.strip() for k in keys_str.split(",")] if keys_str else []
        self.current_key_idx = 0

    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 800,
        temperature: float = 0.3,
        image_base64: Optional[str] = None,
    ) -> str:
        """
        Send a prompt to OpenRouter and return the response.
        Handles rate limits (429) by rotating API keys.
        """
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        else:
            messages.append({
                "role": "system",
                "content": (
                    "You are FarmSaathi AI, a trusted agricultural assistant for Indian farmers. "
                    "You only communicate verified information provided to you. "
                    "You never invent pesticide doses, fertilizer quantities, prices, or medical claims. "
                    "When unsure, you say so clearly and suggest consulting a local agricultural expert. "
                    "CRITICAL INSTRUCTION: DO NOT output any internal thinking process, reasoning steps, or notes. ONLY output the final direct response to the user."
                ),
            })
        if image_base64:
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                ]
            })
            model_to_use = "nvidia/nemotron-nano-12b-v2-vl:free"
        else:
            messages.append({"role": "user", "content": prompt})
            model_to_use = self.model

        # Try up to the total number of keys before giving up
        for _ in range(len(self.api_keys)):
            current_key = self.api_keys[self.current_key_idx]
            headers = {
                "Authorization": f"Bearer {current_key}",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "FarmSaathi",
                "Content-Type": "application/json"
            }
            
            try:
                async with httpx.AsyncClient(timeout=60) as client:
                    resp = await client.post(
                        self.base_url,
                        headers=headers,
                        json={
                            "model": model_to_use,
                            "messages": messages,
                            "temperature": temperature,
                            "max_tokens": max_tokens,
                        },
                    )
                    
                    if resp.status_code == 429:
                        logger.warning(f"OpenRouter API key rate limited. Rotating to next key.")
                        self.current_key_idx = (self.current_key_idx + 1) % len(self.api_keys)
                        continue
                        
                    resp.raise_for_status()
                    data = resp.json()
                    
                    if "error" in data:
                        logger.error(f"OpenRouter API returned error: {data['error']}")
                        if data["error"].get("code") == 429:
                            self.current_key_idx = (self.current_key_idx + 1) % len(self.api_keys)
                            continue
                        raise Exception(f"API Error: {data['error']}")
                        
                    content = data["choices"][0]["message"]["content"]
                    
                    # Strip reasoning tags if present
                    if "<think>" in content and "</think>" in content:
                        content = content.split("</think>")[-1].strip()
                    
                    # Heuristic fallback to strip "Here's a thinking process" or similar outputs 
                    # by extracting everything after standard markdown dividers or specific phrases
                    lower_content = content.lower()
                    if "here's a thinking process" in lower_content or "thinking process:" in lower_content:
                        # Attempt to split by common structural markers
                        if "output:" in lower_content:
                            content = content.split("Output:", 1)[-1].strip()
                            if not content and "output:" in lower_content: # try case-insensitive if exact match fails
                                import re
                                match = re.search(r'(?i)output:\s*(.*)', content, re.DOTALL)
                                if match: content = match.group(1).strip()
                        elif "---" in content:
                            content = content.split("---")[-1].strip()
                        else:
                            # If no clear marker, grab the last paragraph
                            parts = [p.strip() for p in content.split("\n\n") if p.strip()]
                            if len(parts) > 1:
                                content = parts[-1]
                    
                    return content
                    
            except httpx.ConnectError:
                logger.warning("OpenRouter not available. Using fallback response.")
                return self._fallback_response()
            except httpx.HTTPStatusError as e:
                logger.error(f"OpenRouter HTTP error: {e.response.status_code} - {e.response.text}")
                if e.response.status_code == 429:
                    logger.warning("Rate limit hit, rotating key...")
                    self.current_key_idx = (self.current_key_idx + 1) % len(self.api_keys)
                    continue
                return self._fallback_response()
            except Exception as e:
                logger.error(f"LLM error: {e}")
                return self._fallback_response()

        logger.error("All OpenRouter API keys failed or rate-limited.")
        return self._fallback_response()

    def _fallback_response(self) -> str:
        return (
            "I'm having trouble connecting to my AI assistant right now. "
            "Please try again in a moment, or check with your local Krishi Vigyan Kendra."
        )

    async def explain_crop_recommendation(
        self,
        recommendations: list[dict],
        weather: dict,
        soil: dict,
        language: str = "en",
    ) -> str:
        """Generate farmer-friendly crop recommendation explanation."""
        top_crops = ", ".join(r["crop"] for r in recommendations[:3])

        prompt = f"""Convert this crop recommendation data into a simple, friendly explanation for a farmer.

Top recommended crops: {top_crops}
First choice confidence: {recommendations[0]['score']:.0%} if available
Weather conditions: Temperature {weather.get('temp_c', 'unknown')}°C, Humidity {weather.get('humidity', 'unknown')}%
Soil type: {soil.get('soil_type', 'unknown')}

Rules:
- Do NOT change any numbers or crop names
- Use simple farmer language
- Mention 2-3 key reasons why the top crop is recommended
- Keep response under 100 words
- Respond in language: {language}"""

        return await self.complete(prompt, max_tokens=150)

    async def explain_disease_detection(
        self,
        disease_name: str,
        confidence: float,
        management_steps: list[str],
        severity: str,
        language: str = "en",
    ) -> str:
        """Generate farmer-friendly disease explanation."""
        steps_text = "\n".join(f"- {s}" for s in management_steps[:4])

        prompt = f"""Explain this plant disease detection result to a farmer simply.

Disease detected: {disease_name}
AI confidence: {confidence:.0%}
Severity: {severity}
Recommended management steps:
{steps_text}

Rules:
- Do NOT suggest specific pesticide brands or doses
- Do NOT change the management steps provided
- Keep it under 80 words
- Be empathetic and encouraging
- Respond in language: {language}"""

        return await self.complete(prompt, max_tokens=120)

    async def answer_general_question(
        self,
        question: str,
        rag_context: str,
        farmer_profile: Optional[dict],
        language: str = "en",
    ) -> str:
        """Answer general agricultural question using RAG context."""
        farmer_info = ""
        if farmer_profile:
            farmer_info = f"Farmer is in {farmer_profile.get('district', '')}, {farmer_profile.get('state', '')}."

        prompt = f"""Answer this farmer's question using ONLY the verified context below.
If the context doesn't have enough information, say so clearly.
Do NOT invent facts, prices, doses, or eligibility rules.

{farmer_info}

Verified context:
{rag_context}

Farmer question: {question}

Respond in language: {language}
Keep response practical and clear."""

        return await self.complete(prompt, max_tokens=600)

    async def answer_with_universal_context(
        self,
        question: str,
        intent: str,
        universal_context: dict,
        language: str = "en",
        chat_history: Optional[list[dict]] = None,
        image_base64: Optional[str] = None,
    ) -> str:
        """
        Answers a user query using a holistic Universal Context block containing
        farm data, live weather, live market rates, schemes, and news.
        Also evaluates if the user's profile is outdated based on their query.
        """
        
        # Serialize the context dict into a readable text format for the LLM
        context_str = "--- UNIVERSAL CONTEXT ---\n"
        
        # Farm & Profile Context
        prof = universal_context.get("profile", {})
        farm = universal_context.get("farm", {})
        soil = universal_context.get("soil", {})
        
        context_str += "FARMER PROFILE:\n"
        if prof.get('district') or prof.get('state'):
            context_str += f"- Location: {prof.get('district', 'Unknown')}, {prof.get('state', 'Unknown')}\n"
        
        if farm.get('crop_name'):
            stage_info = f" (Stage: {farm.get('stage')})" if farm.get('stage') else ""
            context_str += f"- Active Crop: {farm.get('crop_name')}{stage_info}\n"
            
        if farm.get('size_acres'):
            irrigation_str = 'Yes' if farm.get('has_irrigation') else 'No'
            context_str += f"- Farm Size: {farm.get('size_acres')} acres, Irrigation: {irrigation_str}\n"
            
        if soil.get('ph') or soil.get('nitrogen_kg_ha'):
            context_str += f"- Soil Health: pH {soil.get('ph', 'N/A')}, N: {soil.get('nitrogen_kg_ha', 'N/A')}, P: {soil.get('phosphorus_kg_ha', 'N/A')}, K: {soil.get('potassium_kg_ha', 'N/A')}\n"
            
        context_str += "\n"
        
        # Weather Context
        weather = universal_context.get("weather", {})
        if weather:
            curr = weather.get("current", {})
            context_str += f"LIVE WEATHER:\n- Current: {curr.get('temperature_c')}°C, {curr.get('condition')}, Rain: {curr.get('rainfall_mm')}mm\n"
            forecast = weather.get("forecast", [])
            if forecast:
                context_str += "- Forecast summary: " + ", ".join([f"{d['date']}: {d['condition']}" for d in forecast[:3]]) + "\n\n"
                
        # Market Context
        market = universal_context.get("market", [])
        if market:
            context_str += "LIVE MARKET RATES (MANDI) FOR VARIOUS COMMODITIES IN AREA:\n"
            for rate in market[:20]:
                context_str += f"- {rate.get('commodity')} ({rate.get('variety')}): ₹{rate.get('modal_price')}/Qtl at {rate.get('market')} ({rate.get('arrival_date')})\n"
            context_str += "\n"
            
        # News Context
        news = universal_context.get("news", [])
        if news:
            context_str += "LATEST AGRICULTURAL NEWS:\n"
            for n in news:
                context_str += f"- {n.get('title')} ({n.get('date')})\n"
            context_str += "\n"

        history_str = ""
        if chat_history and len(chat_history) > 1:
            history_str = "--- CONVERSATION HISTORY ---\n"
            for msg in chat_history[-5:-1]:  # Exclude current question which is handled below
                role = "Farmer" if msg.get("role") == "user" else "Assistant"
                history_str += f"{role}: {msg.get('content')}\n"
            history_str += "\n"

        prompt = f"""You are FarmSaathi AI, an expert agricultural assistant.
You have been provided with real-time "Universal Context" about the farmer's location, active crop, weather, local mandi market rates, and news.

{context_str}
{history_str}
USER INTENT CLASSIFIED AS: {intent}
FARMER QUESTION: {question}

INSTRUCTIONS:
1. Answer the farmer's question directly and practically. Use the provided context holistically, regardless of the classified intent.
2. Cross-reference data: 
   - If they ask about spraying pesticides or fertilizer, ALWAYS check the weather (e.g., upcoming rain washes away sprays; high winds drift them).
   - If they ask about selling, ALWAYS check the market rates.
   - If they ask about soil, use their soil health data.
3. CONVERSATIONAL FOLLOW-UPS: If the user's question is missing a crucial detail needed to answer AND it is not available in their profile (e.g. they ask about their crop but "Active Crop" is Unknown), DO NOT guess. Simply ask them a friendly follow-up question. If their Active Crop IS known in the profile, assume they are talking about that crop unless they specify otherwise.
4. Do NOT invent data. If market rates or weather aren't in the context, say you don't have that live data right now.
5. Respond in language: {language}
"""
        return await self.complete(prompt, max_tokens=800, image_base64=image_base64)

    async def generate_daily_insight(
        self,
        universal_context: dict,
        language: str = "en",
    ) -> dict:
        """
        Generate a daily agricultural insight (advisory) using Universal Context.
        Returns a JSON object with insight text, severity, and title.
        """
        import json
        
        # Serialize the context dict into a readable text format for the LLM
        context_str = "--- UNIVERSAL CONTEXT ---\n"
        
        prof = universal_context.get("profile", {})
        farm = universal_context.get("farm", {})
        
        context_str += "FARMER PROFILE:\n"
        if prof.get('district') or prof.get('state'):
            context_str += f"- Location: {prof.get('district', 'Unknown')}, {prof.get('state', 'Unknown')}\n"
        
        if farm.get('crop_name'):
            stage_info = f" (Stage: {farm.get('stage')})" if farm.get('stage') else ""
            context_str += f"- Active Crop: {farm.get('crop_name')}{stage_info}\n"
            
        if farm.get('has_irrigation') is not None:
            context_str += f"- Irrigation: {'Yes' if farm.get('has_irrigation') else 'No'}\n"
            
        context_str += "\n"
        
        weather = universal_context.get("weather", {})
        if weather:
            curr = weather.get("current", {})
            context_str += f"LIVE WEATHER:\n- Current: {curr.get('temperature_c')}°C, {curr.get('condition')}, Rain: {curr.get('rainfall_mm')}mm\n"
            forecast = weather.get("forecast", [])
            if forecast:
                context_str += "- Forecast summary: " + ", ".join([f"{d['date']}: {d['condition']}" for d in forecast[:3]]) + "\n\n"
                
        market = universal_context.get("market", [])
        if market:
            context_str += "LIVE MARKET RATES (MANDI):\n"
            for rate in market[:3]:
                context_str += f"- {rate.get('commodity')}: ₹{rate.get('modal_price')}/Qtl\n"
            context_str += "\n"

        prompt = f"""You are FarmSaathi AI, an expert agricultural assistant.
Review the farmer's live context and generate ONE single crucial, timely insight for today.

{context_str}

RULES:
1. Provide a short, actionable insight based on the most pressing data (e.g. upcoming rain, price drop).
2. Determine a severity: "low" (general tip), "medium" (important reminder), "high" (critical warning like severe weather or pest outbreak).
3. Provide a short title.
4. Output STRICTLY as a JSON object (no markdown formatting, no thinking tags, just raw JSON).
5. Translate the "insight" text to language: {language}

FORMAT:
{{
  "title": "Weather Warning",
  "severity": "high",
  "insight": "Heavy rain expected tomorrow. Delay pesticide spraying."
}}
"""
        response_text = await self.complete(prompt, max_tokens=300)
        
        # Try to parse the JSON
        try:
            # Clean up potential markdown formatting from LLM
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            data = json.loads(response_text)
            return {
                "title": data.get("title", "Daily Insight"),
                "severity": data.get("severity", "low").lower(),
                "insight": data.get("insight", "Have a productive day at the farm!")
            }
        except Exception as e:
            logger.error(f"Failed to parse LLM JSON insight: {e} - Response: {response_text}")
            return {
                "title": "Daily Insight",
                "severity": "low",
                "insight": "Have a productive day at the farm!"
            }
