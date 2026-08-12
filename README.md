# FarmSaathi AI 🌾

> A multilingual, multimodal agricultural intelligence platform for Indian farmers.

**Stack:** Next.js · FastAPI · Firebase (Auth + Firestore + Storage) · XGBoost · EfficientNet · Qwen3:4B · Qdrant · Docker

---

## Project Structure

```
FarmSaathi/
├── apps/
│   ├── web/          ← Next.js 14 (TypeScript + Tailwind + shadcn/ui)
│   └── mobile/       ← Flutter (Phase 2)
├── backend/          ← FastAPI (AI/ML APIs, verified via Firebase Admin)
├── ml/               ← Model training (XGBoost, EfficientNet, DistilBERT)
├── data/             ← Datasets (raw / processed)
├── knowledge/        ← Crop/disease/scheme JSON + PDFs for RAG
├── infra/            ← Docker, nginx configs
├── docs/             ← Architecture & requirements
└── scripts/          ← Utility scripts (knowledge ingestion, etc.)
```

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env   # fill in Firebase + WeatherAPI keys

# 2. Start infrastructure
docker-compose up -d

# 3. Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# 4. Frontend
cd apps/web && npm install && npm run dev
```

## Core Modules

| Module | Technology | Status |
|--------|-----------|--------|
| Auth | Firebase Auth | 🔨 Building |
| Database | Firebase Firestore | 🔨 Building |
| Storage | Firebase Storage | 🔨 Building |
| Crop AI | XGBoost + composite scoring | 🔨 Building |
| Disease AI | EfficientNet-B0 (PlantVillage) | 🔨 Building |
| Soil AI | EfficientNet-B0 + lab test | 🔨 Building |
| Weather | WeatherAPI.com | 🔨 Building |
| RAG | Qdrant + multilingual embeddings | 🔨 Building |
| LLM | Qwen3:4B via Ollama | 🔨 Building |
| Languages | English · Hindi · Odia | 🔨 Building |

## Architecture Principle

> **Deterministic/ML systems make agricultural decisions; the LLM explains and communicates those decisions.**

## Free Serverless Production Deployment

The backend is architected to run on a 100% free serverless tier by splitting up the microservices:

1. **Database (PostgreSQL + PostGIS):** Supabase (Free Tier)
2. **Cache (Redis):** Upstash Serverless Redis (Free Tier)
3. **Vector Store (Qdrant):** Qdrant Cloud (Forever Free 1GB)
4. **App Hosting (FastAPI):** Render Web Service (Free Tier) or Koyeb Eco

**To deploy:**
1. Create free accounts on Supabase, Upstash, and Qdrant Cloud.
2. Obtain connection URLs for all three services.
3. Deploy the `backend` folder on Render or Koyeb. Use `uvicorn app.main:app --host 0.0.0.0 --port $PORT` as the start command.
4. Supply the `.env` variables to Render/Koyeb.
Note: APScheduler replaces Celery to ensure background tasks run smoothly inside the free web instance!
