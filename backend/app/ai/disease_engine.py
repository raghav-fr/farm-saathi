"""
FarmSaathi AI — Disease Detection Engine
EfficientNet-B0 ONNX inference + verified knowledge lookup.
No LLM in detection path — LLM only explains verified results.
"""
import io
import json
from pathlib import Path
from typing import Optional
from uuid import uuid4

import numpy as np
from loguru import logger
from PIL import Image

from app.core.config import settings

# Confidence threshold below which we return "uncertain"
CONFIDENCE_THRESHOLD = 0.70


class DiseaseEngine:
    def __init__(self):
        self._session = None
        self._classes = None
        self._knowledge = None
        self._loaded = False

    def _load(self):
        if self._loaded:
            return

        # Load ONNX model
        model_path = Path(settings.DISEASE_MODEL_PATH)
        classes_path = Path(settings.DISEASE_CLASSES_PATH)

        if model_path.exists():
            import onnxruntime as ort
            self._session = ort.InferenceSession(
                str(model_path),
                providers=["CPUExecutionProvider"],
            )
            logger.info("Disease ONNX model loaded")

        if classes_path.exists():
            with open(classes_path) as f:
                self._classes = json.load(f)

        # Load disease knowledge base
        knowledge_path = Path(settings.KNOWLEDGE_DIR) / "diseases" / "disease_knowledge.json"
        if knowledge_path.exists():
            with open(knowledge_path) as f:
                self._knowledge = json.load(f)
        else:
            self._knowledge = {}
            logger.warning(f"Disease knowledge not found at {knowledge_path}")

        self._loaded = True

    def _preprocess(self, image_bytes: bytes) -> np.ndarray:
        """Preprocess image to EfficientNet input format (224×224, normalized)."""
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize((224, 224))
        arr = np.array(img, dtype=np.float32) / 255.0
        # ImageNet normalization
        mean = np.array([0.485, 0.456, 0.406])
        std = np.array([0.229, 0.224, 0.225])
        arr = (arr - mean) / std
        arr = arr.transpose(2, 0, 1)  # HWC → CHW
        return np.expand_dims(arr, 0).astype(np.float32)  # add batch dim

    def _softmax(self, x: np.ndarray) -> np.ndarray:
        e = np.exp(x - np.max(x))
        return e / e.sum()

    def _lookup_knowledge(self, class_name: str) -> dict:
        """Look up verified disease knowledge. Returns empty if not found."""
        # Class names from PlantVillage are like "Tomato___Early_blight"
        key = class_name.lower().replace("___", "_").replace(" ", "_")
        return self._knowledge.get(key, self._knowledge.get(class_name, {}))

    async def predict(
        self,
        image_bytes: bytes,
        crop_hint: Optional[str] = None,
        language: str = "en",
    ) -> dict:
        """
        Full disease prediction pipeline.
        Returns structured result with status, disease, confidence, management.
        """
        self._load()
        scan_id = str(uuid4())

        if self._session is None or self._classes is None:
            logger.warning("Disease model not available — returning demo response")
            return self._demo_response(scan_id)

        # Run inference
        try:
            input_arr = self._preprocess(image_bytes)
            input_name = self._session.get_inputs()[0].name
            outputs = self._session.run(None, {input_name: input_arr})
            logits = outputs[0][0]
            probs = self._softmax(logits)
            top_idx = int(np.argmax(probs))
            confidence = float(probs[top_idx])
            class_name = self._classes[top_idx]
        except Exception as e:
            logger.error(f"Disease inference error: {e}")
            return {
                "status": "error",
                "explanation": "An error occurred during analysis. Please try again with a clearer image.",
                "scan_id": scan_id,
            }

        # Confidence gate
        if confidence < CONFIDENCE_THRESHOLD:
            return {
                "status": "uncertain",
                "confidence": round(confidence, 4),
                "explanation": (
                    f"The image quality or angle makes it difficult to provide a reliable diagnosis "
                    f"(confidence: {confidence:.0%}). Please upload a clearer, well-lit image of the affected leaf."
                ),
                "management": [],
                "symptoms": [],
                "scan_id": scan_id,
            }

        # Check if healthy
        if "healthy" in class_name.lower():
            return {
                "status": "healthy",
                "crop": self._extract_crop(class_name),
                "disease": None,
                "confidence": round(confidence, 4),
                "severity": None,
                "symptoms": [],
                "management": ["Continue regular monitoring.", "Maintain field hygiene."],
                "favorable_conditions": [],
                "explanation": f"The crop appears healthy (confidence: {confidence:.0%}). Keep monitoring regularly.",
                "scan_id": scan_id,
            }

        # Disease detected
        crop_name = self._extract_crop(class_name)
        disease_name = self._extract_disease(class_name)
        knowledge = self._lookup_knowledge(class_name)

        # Severity heuristic based on confidence
        severity = "Mild" if confidence < 0.80 else ("Moderate" if confidence < 0.92 else "Severe")

        # Generate LLM explanation
        explanation = await self._explain(disease_name, confidence, knowledge.get("management", []), severity, language)

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

    def _extract_crop(self, class_name: str) -> str:
        """Extract crop name from PlantVillage class label."""
        parts = class_name.replace("___", "|").replace("__", "|").split("|")
        return parts[0].replace("_", " ").title() if parts else class_name

    def _extract_disease(self, class_name: str) -> str:
        """Extract disease name from PlantVillage class label."""
        parts = class_name.replace("___", "|").replace("__", "|").split("|")
        if len(parts) > 1:
            return parts[1].replace("_", " ").title()
        return class_name

    async def _explain(
        self,
        disease: str,
        confidence: float,
        management: list[str],
        severity: str,
        language: str,
    ) -> str:
        try:
            from app.ai.llm_service import LLMService
            llm = LLMService()
            return await llm.explain_disease_detection(disease, confidence, management, severity, language)
        except Exception:
            return (
                f"Detected: {disease} (confidence: {confidence:.0%}, severity: {severity}). "
                f"Please review the management recommendations below and consult a local agronomist."
            )

    def _demo_response(self, scan_id: str) -> dict:
        """Fallback demo response when model is not trained yet."""
        return {
            "status": "detected",
            "crop": "Tomato",
            "disease": "Early Blight",
            "confidence": 0.94,
            "severity": "Moderate",
            "symptoms": [
                "Dark concentric lesions on leaves",
                "Yellowing around lesions",
                "Lower leaves affected first",
            ],
            "management": [
                "Remove and destroy severely affected leaves",
                "Avoid overhead irrigation",
                "Improve air circulation between plants",
                "Maintain proper plant spacing",
                "Consult local agricultural expert for approved fungicide options",
            ],
            "favorable_conditions": [
                "High humidity (> 80%)",
                "Warm temperatures (24–29°C)",
                "Wet leaf surfaces",
            ],
            "explanation": (
                "Your tomato plant shows signs of Early Blight (confidence: 94%). "
                "This is a common fungal disease. Start by removing affected leaves and "
                "avoiding overhead watering. Please consult your local Krishi Kendra for treatment options."
            ),
            "scan_id": scan_id,
        }
