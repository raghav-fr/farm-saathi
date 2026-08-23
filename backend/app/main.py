"""
FarmSaathi AI — FastAPI Application Entry Point
"""
import sys
import os

# Add the parent directory (backend/) to sys.path so we can run this file directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from app.core.config import settings
from app.core.firebase import initialize_firebase

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.workers.scheduler import check_and_notify_crops

# Global scheduler instance
scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle handler."""
    # ── Startup ──────────────────────────────────────────────────────────────
    logger.info(f"🌾 Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Initialize Firebase Admin SDK
    try:
        initialize_firebase()
        logger.info("✅ Firebase Admin SDK initialized")
    except Exception as e:
        logger.error(f"❌ Firebase initialization failed: {e}")
        logger.warning("Continuing without Firebase — auth will not work")

    # Start APScheduler for background jobs
    scheduler.add_job(check_and_notify_crops, 'cron', hour=9, minute=0, id='daily_crop_update')
    scheduler.start()
    logger.info("✅ Background job scheduler started")

    # Pre-load AI models (lazy load in engines, but log status)
    logger.info("✅ AI engines ready (lazy-load on first request)")

    logger.info(f"✅ {settings.APP_NAME} is ready!")
    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    logger.info(f"👋 Shutting down {settings.APP_NAME}")
    scheduler.shutdown()
    logger.info("🛑 Background job scheduler stopped")

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "A multilingual, multimodal agricultural intelligence platform for Indian farmers. "
        "Deterministic ML models make decisions; LLM explains and communicates them."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────────
from app.api import alerts, chatbot, crops, disease, farmer, farms, weather, market, news, insights

app.include_router(farmer.router, prefix="/api/v1")
app.include_router(farms.router, prefix="/api/v1")
app.include_router(crops.router, prefix="/api/v1")
app.include_router(disease.router, prefix="/api/v1")
app.include_router(weather.router, prefix="/api/v1")
app.include_router(chatbot.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(market.router, prefix="/api/v1")
app.include_router(news.router, prefix="/api/v1")
app.include_router(insights.router, prefix="/api/v1")


# ── Health endpoints ──────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    """Detailed health check for all services."""
    checks = {}

    # Firebase
    try:
        import firebase_admin
        checks["firebase"] = "ok" if firebase_admin.get_app() else "not_initialized"
    except Exception:
        checks["firebase"] = "error"

    # Redis
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.REDIS_URL)
        await r.ping()
        await r.aclose()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "unavailable"

    # Qdrant
    try:
        from qdrant_client import AsyncQdrantClient
        qc_kwargs = {"url": settings.QDRANT_URL}
        if settings.QDRANT_API_KEY:
            qc_kwargs["api_key"] = settings.QDRANT_API_KEY
        qc = AsyncQdrantClient(**qc_kwargs)
        await qc.get_collections()
        await qc.close()
        checks["qdrant"] = "ok"
    except Exception:
        checks["qdrant"] = "unavailable"

    # Ollama / LLM
    try:
        import httpx
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{settings.OLLAMA_URL}/api/tags")
            checks["ollama"] = "ok" if resp.status_code == 200 else "error"
    except Exception:
        checks["ollama"] = "unavailable"

    overall = "healthy" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": overall, "checks": checks}


# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc) if settings.DEBUG else ""},
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
