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
    Thin wrapper around Ollama REST API.
    
    IMPORTANT ARCHITECTURAL RULE:
    The LLM never makes agricultural decisions.
    It only converts verified ML/rule-based outputs into
    farmer-friendly natural language explanations.
    """

    def __init__(self):
        self.base_url = settings.OLLAMA_URL
        self.model = settings.LLM_MODEL

    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 500,
        temperature: float = 0.3,
    ) -> str:
        """
        Send a prompt to Qwen3:4B and return the response.
        Low temperature (0.3) for factual, consistent agricultural advice.
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
                    "When unsure, you say so clearly and suggest consulting a local agricultural expert."
                ),
            })
        messages.append({"role": "user", "content": prompt})

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens,
                        },
                    },
                )
                resp.raise_for_status()
                content = resp.json()["message"]["content"]
                # Strip Qwen3 thinking tags if present
                if "<think>" in content and "</think>" in content:
                    content = content.split("</think>")[-1].strip()
                return content
        except httpx.ConnectError:
            logger.warning("Ollama not available. Using fallback response.")
            return self._fallback_response()
        except Exception as e:
            logger.error(f"LLM error: {e}")
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
Keep response practical and under 150 words."""

        return await self.complete(prompt, max_tokens=200)
