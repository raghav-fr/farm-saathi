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
