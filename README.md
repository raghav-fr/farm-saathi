# FarmSaathi AI 🌾

> **An AI-Powered Full-Stack Ecosystem for Agricultural Intelligence**

**FarmSaathi** is a comprehensive, full-stack agricultural platform designed to deliver advanced AI-driven insights, real-time data, and localized assistance to farmers. The project is architected as a highly modular ecosystem consisting of a responsive Next.js web application and a robust, asynchronous Python backend powered by FastAPI.

By combining deterministic machine learning models (XGBoost, EfficientNet) for agricultural decisions and a conversational generative AI (Qwen via Ollama) for explanation, FarmSaathi translates complex agronomic data into actionable, plain-language guidance.

---

## Technical Architecture

The system is technically feasible as it leverages well-established, open-source technologies. No specialized hardware is required beyond a standard computer or mobile device with internet access to utilize the web platform.

| Component | Technology Used |
| :--- | :--- |
| **Web Frontend** | Next.js (React), Tailwind CSS, Radix UI |
| **Backend Services** | FastAPI (Python), asynchronous API architecture |
| **AI / Machine Learning** | XGBoost (Crop Prediction), Computer Vision (Disease Detection) |
| **Conversational RAG / LLM** | Qdrant (Vector Database), Ollama (Local LLM) |
| **Authentication** | Firebase Auth |
| **Database (Relational & Spatial)** | PostgreSQL, asyncpg, GeoAlchemy2 (PostGIS) |
| **Caching & Job Scheduling** | Redis, APScheduler |
| **External Data Integration** | PyOWM (Weather API), BeautifulSoup/Feedparser (Web Scraping) |

---

## Core Features & Intelligence Services

*   **Conversational AI & RAG:** Integrates a Retrieval-Augmented Generation (RAG) pipeline backed by the Qdrant vector database and locally hosted Large Language Models (via Ollama).
*   **Predictive & Computer Vision Models:** Features dedicated backend modules for predictive crop recommendations (XGBoost) and visual disease identification (EfficientNet-B0 on PlantVillage data).
*   **Real-Time Agricultural Data:** Actively aggregates dynamic external data streams, including real-time weather alerts (via PyOWM), market prices, and agricultural news scraping.
*   **Asynchronous Processing:** Background processing and scheduled alerts (e.g., daily crop updates) are efficiently managed using Redis and APScheduler.

---

## Economic Strategy (100% Free Serverless Tier)

The system is highly economically feasible, designed from the ground up to operate with minimal to zero recurring infrastructure costs during its initial phases.

*   **Frontend Hosting:** Vercel or Netlify (Free Tier for Next.js)
*   **Backend API Hosting:** Render Web Service / Koyeb (Free Tier)
*   **Relational Database:** Supabase (Free Tier PostgreSQL instance)
*   **Caching / Job Queue:** Upstash Serverless Redis (Free Tier)
*   **Vector Database (RAG):** Qdrant Cloud (Forever Free 1GB Tier)
*   **AI / LLM Inference:** Ollama (Locally hosted/Open-source models)

---

## Project Structure

```
FarmSaathi/
├── apps/
│   ├── web/          ← Next.js 14 (TypeScript + Tailwind + Radix UI)
│   └── mobile/       ← Flutter (Phase 2 Future Work)
├── backend/          ← FastAPI (AI/ML APIs, asyncpg, APScheduler)
├── ml/               ← Model training notebooks/assets
├── knowledge/        ← JSON/PDFs for RAG pipeline
└── infra/            ← Docker, nginx configs
```

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env   # fill in Firebase + WeatherAPI keys

# 2. Start infrastructure (Redis, PostgreSQL, Qdrant if running locally)
docker-compose up -d

# 3. Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# 4. Frontend
cd apps/web
npm install
npm run dev
```

## Future Works

*   **Cross-Platform Mobile Application (Phase 2):** Development of the native Flutter mobile application for Android and iOS for offline capabilities and direct camera integration.
*   **On-Device AI Inference:** Integrating localized models (`llama_cpp_dart`) directly into the mobile app.
*   **Hardware / IoT Integration:** Expanding the platform to accept real-time data streams from physical on-farm sensors.
