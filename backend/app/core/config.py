"""
FarmSaathi AI — Core Configuration
All settings loaded from environment variables / .env file
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "FarmSaathi AI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    @property
    def origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    # ── Firebase ─────────────────────────────────────────────────────────────
    FIREBASE_SERVICE_ACCOUNT_PATH: str = "./firebase-service-account.json"
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_STORAGE_BUCKET: str = ""

    # ── ML Model paths ───────────────────────────────────────────────────────
    CROP_MODEL_PATH: str = "./ml/crop_recommendation/models/crop_model.pkl"
    CROP_ENCODER_PATH: str = "./ml/crop_recommendation/models/crop_encoder.pkl"
    DISEASE_MODEL_PATH: str = "./ml/disease_detection/mobilenetv4_best.pth"
    DISEASE_CLASSES_PATH: str = "./ml/disease_detection/models/classes.json"
    SOIL_MODEL_PATH: str = "./ml/soil_classification/models/soil_model.onnx"
    SOIL_CLASSES_PATH: str = "./ml/soil_classification/models/classes.json"

    # ── Qdrant ───────────────────────────────────────────────────────────────
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION_DISEASE: str = "disease_knowledge"
    QDRANT_COLLECTION_CROPS: str = "crop_knowledge"
    QDRANT_COLLECTION_SCHEMES: str = "scheme_knowledge"
    QDRANT_COLLECTION_ADVISORIES: str = "advisories"

    # ── Ollama / LLM ─────────────────────────────────────────────────────────
    OLLAMA_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "qwen3:4b"
    LLM_EMBEDDING_MODEL: str = "nomic-embed-text"
    OPENROUTER_API_KEYS: str = ""

    # ── PostgreSQL ───────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://farmsaathi:farmsaathi@localhost:5432/farmsaathi"

    # ── Redis ────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Market API ───────────────────────────────────────────────────────────
    MARKET_API_BASE: str = "https://api.data.gov.in/resource"
    MARKET_API_KEY: str = ""

    # ── RAG ──────────────────────────────────────────────────────────────────
    KNOWLEDGE_DIR: str = "./knowledge"
    EMBEDDING_MODEL: str = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
