"""
FarmSaathi AI — Pydantic schemas
Request/response models for all API endpoints.
"""
from datetime import date, datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


# ──────────────────────────────────────────────────────────────────────────────
# ENUMS
# ──────────────────────────────────────────────────────────────────────────────


class SoilType(str, Enum):
    CLAY = "clay"
    SANDY = "sandy"
    LOAMY = "loamy"
    SILTY = "silty"
    BLACK = "black"
    RED = "red"
    LATERITE = "laterite"
    UNKNOWN = "unknown"


class IrrigationType(str, Enum):
    RAINFED = "rainfed"
    CANAL = "canal"
    BOREWELL = "borewell"
    DRIP = "drip"
    SPRINKLER = "sprinkler"
    POND = "pond"


class Season(str, Enum):
    KHARIF = "kharif"
    RABI = "rabi"
    ZAID = "zaid"
    PERENNIAL = "perennial"


class CropStage(str, Enum):
    PLANNING = "planning"
    LAND_PREP = "land_preparation"
    SOWING = "sowing"
    GERMINATION = "germination"
    VEGETATIVE = "vegetative"
    FLOWERING = "flowering"
    FRUITING = "fruiting"
    MATURITY = "maturity"
    HARVEST = "harvest"
    POST_HARVEST = "post_harvest"


class Language(str, Enum):
    EN = "en"
    HI = "hi"
    OD = "od"
    BN = "bn"
    TE = "te"
    TA = "ta"
    MR = "mr"


class AlertType(str, Enum):
    WEATHER = "weather"
    DISEASE_RISK = "disease_risk"
    MARKET = "market"
    SCHEME = "scheme"
    NEWS = "news"
    CROP_ACTIVITY = "crop_activity"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ──────────────────────────────────────────────────────────────────────────────
# FARMER PROFILE
# ──────────────────────────────────────────────────────────────────────────────


class FarmerProfileCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    language: Language = Language.EN
    state: str
    district: str
    village: Optional[str] = None
    phone: Optional[str] = None
    farming_type: Optional[str] = None  # e.g. "organic", "conventional"


class FarmerProfileUpdate(BaseModel):
    name: Optional[str] = None
    language: Optional[Language] = None
    state: Optional[str] = None
    district: Optional[str] = None
    village: Optional[str] = None
    farming_type: Optional[str] = None


class FarmerProfileResponse(BaseModel):
    uid: str
    name: str
    language: str
    state: str
    district: str
    village: Optional[str] = None
    phone: Optional[str] = None
    farming_type: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


# ──────────────────────────────────────────────────────────────────────────────
# FARM
# ──────────────────────────────────────────────────────────────────────────────


class FarmCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    area_hectares: float = Field(..., gt=0)
    soil_type: SoilType = SoilType.UNKNOWN
    irrigation_type: IrrigationType = IrrigationType.RAINFED
    has_irrigation: bool = False


class FarmUpdate(BaseModel):
    name: Optional[str] = None
    area_hectares: Optional[float] = None
    soil_type: Optional[SoilType] = None
    irrigation_type: Optional[IrrigationType] = None
    has_irrigation: Optional[bool] = None


class FarmResponse(BaseModel):
    id: str
    userId: str
    name: str
    latitude: float
    longitude: float
    area_hectares: float
    soil_type: str
    irrigation_type: str
    has_irrigation: bool
    createdAt: datetime
    updatedAt: datetime


# ──────────────────────────────────────────────────────────────────────────────
# SOIL TEST
# ──────────────────────────────────────────────────────────────────────────────


class SoilTestCreate(BaseModel):
    ph: float = Field(..., ge=0, le=14)
    nitrogen_kg_ha: Optional[float] = Field(None, ge=0)
    phosphorus_kg_ha: Optional[float] = Field(None, ge=0)
    potassium_kg_ha: Optional[float] = Field(None, ge=0)
    organic_carbon_pct: Optional[float] = Field(None, ge=0)
    ec_ds_m: Optional[float] = Field(None, ge=0)
    test_date: Optional[date] = None
    source: Optional[str] = None  # e.g. "soil_health_card", "lab"


class SoilTestResponse(SoilTestCreate):
    id: str
    farmId: str
    userId: str
    createdAt: datetime


# ──────────────────────────────────────────────────────────────────────────────
# CROPS
# ──────────────────────────────────────────────────────────────────────────────


class CropCreate(BaseModel):
    crop_name: str
    variety: Optional[str] = None
    sowing_date: Optional[date] = None
    area_hectares: Optional[float] = None
    stage: CropStage = CropStage.PLANNING
    season: Optional[Season] = None


class CropUpdate(BaseModel):
    stage: Optional[CropStage] = None
    variety: Optional[str] = None
    area_hectares: Optional[float] = None


class CropResponse(CropCreate):
    id: str
    farmId: str
    userId: str
    createdAt: datetime
    updatedAt: datetime


# ──────────────────────────────────────────────────────────────────────────────
# CROP RECOMMENDATION
# ──────────────────────────────────────────────────────────────────────────────


class CropRecommendRequest(BaseModel):
    farm_id: Optional[str] = None  # if provided, loads farm context
    latitude: float
    longitude: float
    soil_type: Optional[SoilType] = None
    ph: Optional[float] = None
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    has_irrigation: bool = False
    season: Optional[Season] = None
    previous_crop: Optional[str] = None
    area_hectares: Optional[float] = None
    language: Language = Language.EN


class CropRecommendItem(BaseModel):
    crop: str
    score: float
    ml_score: float
    weather_score: float
    soil_score: float
    water_score: float
    season_score: float
    reasons: list[str]
    warnings: list[str]


class CropRecommendResponse(BaseModel):
    recommendations: list[CropRecommendItem]
    explanation: str  # LLM-generated farmer-friendly explanation
    weather_summary: dict
    missing_data: list[str]
    language: str


# ──────────────────────────────────────────────────────────────────────────────
# DISEASE DETECTION
# ──────────────────────────────────────────────────────────────────────────────


class DiseaseDetectionResponse(BaseModel):
    status: str  # "detected" | "uncertain" | "healthy"
    crop: Optional[str] = None
    disease: Optional[str] = None
    confidence: Optional[float] = None
    severity: Optional[str] = None
    symptoms: list[str] = []
    management: list[str] = []
    favorable_conditions: list[str] = []
    explanation: str
    scan_id: Optional[str] = None


# ──────────────────────────────────────────────────────────────────────────────
# WEATHER
# ──────────────────────────────────────────────────────────────────────────────


class WeatherCurrent(BaseModel):
    temperature_c: float
    feels_like_c: float
    humidity_pct: float
    rainfall_mm: float
    wind_kph: float
    uv_index: float
    condition: str
    condition_icon: str
    is_day: bool


class WeatherForecastDay(BaseModel):
    date: str
    max_temp_c: float
    min_temp_c: float
    avg_temp_c: float
    total_rainfall_mm: float
    avg_humidity_pct: float
    uv_index: float
    condition: str
    condition_icon: str
    chance_of_rain_pct: float


class WeatherResponse(BaseModel):
    location: dict
    current: WeatherCurrent
    forecast: list[WeatherForecastDay]
    agricultural_advisory: str  # LLM advisory based on weather + farmer crops
    alerts: list[dict] = []


# ──────────────────────────────────────────────────────────────────────────────
# SOIL INTELLIGENCE
# ──────────────────────────────────────────────────────────────────────────────


class SoilImageResponse(BaseModel):
    status: str
    soil_type: Optional[str] = None
    confidence: Optional[float] = None
    disclaimer: str
    characteristics: list[str]


class SoilAnalysisResponse(BaseModel):
    ph_status: str
    nitrogen_status: str
    phosphorus_status: str
    potassium_status: str
    organic_carbon_status: str
    overall_health: str
    recommendations: list[str]
    explanation: str


# ──────────────────────────────────────────────────────────────────────────────
# MARKET
# ──────────────────────────────────────────────────────────────────────────────


class MarketPriceItem(BaseModel):
    crop: str
    market: str
    district: str
    state: str
    min_price: float
    max_price: float
    modal_price: float
    unit: str
    date: str


class MarketTrendResponse(BaseModel):
    crop: str
    current_price: float
    avg_7day: float
    avg_30day: float
    trend_pct: float
    trend_direction: str  # "up" | "down" | "stable"
    nearby_markets: list[MarketPriceItem]
    insight: str  # LLM insight


# ──────────────────────────────────────────────────────────────────────────────
# SCHEMES
# ──────────────────────────────────────────────────────────────────────────────


class SchemeEligibilityRequest(BaseModel):
    farm_id: Optional[str] = None


class SchemeEligibilityItem(BaseModel):
    scheme_id: str
    name: str
    status: str  # "eligible" | "likely_eligible" | "more_info_needed" | "not_eligible"
    reason: str
    benefit: str
    official_url: str
    apply_url: Optional[str] = None


class SchemeResponse(BaseModel):
    schemes: list[SchemeEligibilityItem]
    explanation: str


# ──────────────────────────────────────────────────────────────────────────────
# ALERTS
# ──────────────────────────────────────────────────────────────────────────────


class AlertResponse(BaseModel):
    id: str
    type: str
    severity: str
    message: str
    read: bool
    createdAt: datetime
    farmId: Optional[str] = None


# ──────────────────────────────────────────────────────────────────────────────
# CHAT
# ──────────────────────────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None
    farm_id: Optional[str] = None
    language: Language = Language.EN


class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    intent: str
    answer: str
    sources: list[str] = []
    confidence: Optional[float] = None
    language: str


# ──────────────────────────────────────────────────────────────────────────────
# NEWS
# ──────────────────────────────────────────────────────────────────────────────


class NewsItem(BaseModel):
    id: str
    title: str
    summary: str
    source: str
    url: str
    published_at: str
    category: str
    urgency: str
    relevance_score: float


# ──────────────────────────────────────────────────────────────────────────────
# GENERIC
# ──────────────────────────────────────────────────────────────────────────────


class MessageResponse(BaseModel):
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[Any] = None
