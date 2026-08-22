"""
FarmSaathi AI — Disease Detection Engine
LLM Vision-based inference + verified knowledge lookup.
"""
import base64
import json
from pathlib import Path
from typing import Optional
from uuid import uuid4

from loguru import logger
from app.core.config import settings

# Confidence threshold below which we return "uncertain"
CONFIDENCE_THRESHOLD = 0.70

class DiseaseEngine:
    def __init__(self):
        self._knowledge = None
        self._loaded = False

    def _load(self):
        if self._loaded:
            return

        # Load disease knowledge base
        knowledge_path = Path(settings.KNOWLEDGE_DIR) / "diseases" / "disease_knowledge.json"
        if knowledge_path.exists():
            with open(knowledge_path) as f:
                self._knowledge = json.load(f)
        else:
            self._knowledge = {}
            logger.warning(f"Disease knowledge not found at {knowledge_path}")

        self._loaded = True

    def _lookup_knowledge(self, class_name: str) -> dict:
        """Look up verified disease knowledge. Returns empty if not found."""
        key = class_name.lower().replace("___", "_").replace(" ", "_")
        return self._knowledge.get(key, self._knowledge.get(class_name, {}))

    async def predict(
        self,
        image_bytes: bytes,
        crop_hint: Optional[str] = None,
        language: str = "en",
    ) -> dict:
        """
        Full disease prediction pipeline using Vision LLM.
        Returns structured result with status, disease, confidence, management.
        """
        self._load()
        scan_id = str(uuid4())

        if not self._knowledge:
            logger.warning("Disease knowledge not available — returning error")
            return {
                "status": "error",
                "explanation": "Knowledge base not loaded.",
                "scan_id": scan_id,
            }

        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        valid_keys = list(self._knowledge.keys())

        system_prompt = (
            "You are an expert plant pathologist AI for FarmSaathi. Analyze the provided image of a plant/leaf. "
            "Identify the disease from the provided list of valid disease keys. "
            "If the plant looks completely healthy, output the key 'healthy'. "
            "If the image is not a plant or you are extremely uncertain, output 'unknown'. "
            "CRITICAL: You MUST output your response in raw valid JSON format ONLY, without any markdown formatting, code blocks, or extra text. "
            "Schema: {\"disease_key\": \"<one_of_the_keys>\", \"confidence\": <float_0_to_1>, \"explanation\": \"<brief_explanation_of_visual_symptoms>\"}"
        )
        
        prompt = f"Valid disease keys:\n{json.dumps(valid_keys)}\n\nAnalyze the image and return the raw JSON object."

        try:
            from app.ai.llm_service import LLMService
            llm = LLMService()
            response_text = await llm.complete(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=500,
                temperature=0.1,
                image_base64=image_b64
            )
            
            # Clean up potential markdown formatting from the response
            cleaned_text = response_text.replace('```json', '').replace('```', '').strip()
            llm_result = json.loads(cleaned_text)
            
            disease_key = llm_result.get("disease_key", "unknown").strip().lower()
            confidence = float(llm_result.get("confidence", 0.0))
            explanation = llm_result.get("explanation", "")
            
        except Exception as e:
            logger.error(f"Disease inference error via LLM: {e}")
            return {
                "status": "error",
                "explanation": "An error occurred during AI analysis. Please try again with a clearer image.",
                "scan_id": scan_id,
            }

        # Confidence gate or unknown key
        if confidence < CONFIDENCE_THRESHOLD or disease_key == "unknown":
            return {
                "status": "uncertain",
                "confidence": round(confidence, 4),
                "explanation": explanation or "The image quality or angle makes it difficult to provide a reliable diagnosis. Please upload a clearer, well-lit image of the affected leaf.",
                "management": [],
                "symptoms": [],
                "scan_id": scan_id,
            }

        # Check if healthy
        if disease_key == "healthy":
            crop_name = crop_hint or "Unknown Crop"
            return {
                "status": "healthy",
                "crop": crop_name,
                "disease": None,
                "confidence": round(confidence, 4),
                "severity": None,
                "symptoms": [],
                "management": ["Continue regular monitoring.", "Maintain field hygiene."],
                "favorable_conditions": [],
                "explanation": explanation or f"The crop appears healthy (confidence: {confidence:.0%}). Keep monitoring regularly.",
                "scan_id": scan_id,
            }

        # Disease detected
        if disease_key not in self._knowledge:
            # Fallback if LLM hallucinated a key
            return {
                "status": "uncertain",
                "confidence": round(confidence, 4),
                "explanation": "The AI identified a disease that is not in our verified knowledge base. Please consult an expert.",
                "management": [],
                "symptoms": [],
                "scan_id": scan_id,
            }

        knowledge = self._knowledge[disease_key]
        crop_name = knowledge.get("crop", crop_hint or "Unknown Crop")
        disease_name = knowledge.get("disease", disease_key.title())
        
        # Severity heuristic based on confidence
        severity = "Mild" if confidence < 0.80 else ("Moderate" if confidence < 0.92 else "Severe")
        
        return {
            "status": "detected",
            "crop": crop_name,
            "disease": disease_name,
            "confidence": round(confidence, 4),
            "severity": severity,
            "symptoms": knowledge.get("symptoms", []),
            "management": knowledge.get("management", []),
            "favorable_conditions": knowledge.get("favorable_conditions", []),
            "explanation": explanation,
            "scan_id": scan_id,
        }
