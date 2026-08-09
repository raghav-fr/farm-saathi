// FarmSaathi AI — Backend API client
// Automatically attaches Firebase ID token to every request

import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { getIdToken } from "@/lib/firebase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ─── Axios instance ──────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Attach Firebase ID token before every request
api.interceptors.request.use(async (config) => {
  const token = await getIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error handler
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Farm {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  area_hectares: number;
  soil_type: string;
  irrigation_type: string;
  has_irrigation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CropRecommendation {
  crop: string;
  score: number;
  ml_score: number;
  weather_score: number;
  soil_score: number;
  water_score: number;
  season_score: number;
  reasons: string[];
  warnings: string[];
}

export interface DiseaseResult {
  status: "detected" | "uncertain" | "healthy" | "error";
  crop?: string;
  disease?: string;
  confidence?: number;
  severity?: string;
  symptoms: string[];
  management: string[];
  favorable_conditions: string[];
  explanation: string;
  scan_id?: string;
}

export interface WeatherData {
  location: { name: string; region: string; lat: number; lon: number };
  current: {
    temperature_c: number;
    feels_like_c: number;
    humidity_pct: number;
    rainfall_mm: number;
    wind_kph: number;
    uv_index: number;
    condition: string;
    condition_icon: string;
    is_day: boolean;
  };
  forecast: Array<{
    date: string;
    max_temp_c: number;
    min_temp_c: number;
    avg_temp_c: number;
    total_rainfall_mm: number;
    avg_humidity_pct: number;
    condition: string;
    condition_icon: string;
    chance_of_rain_pct: number;
  }>;
  agricultural_advisory: string;
  alerts: Array<{ headline: string; severity: string }>;
}

export interface ChatResponse {
  conversation_id: string;
  message_id: string;
  intent: string;
  answer: string;
  sources: string[];
  language: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: string;
  message: string;
  read: boolean;
  createdAt: string;
  farmId?: string;
}

// ─── API methods ─────────────────────────────────────────────────────────────

export const farmerApi = {
  onboard: (data: object) => api.post("/farmers/onboard", data),
  getMe: () => api.get("/farmers/me"),
  updateMe: (data: object) => api.put("/farmers/me", data),
};

export const farmApi = {
  create: (data: object) => api.post<Farm>("/farms", data),
  list: () => api.get<Farm[]>("/farms"),
  get: (id: string) => api.get<Farm>(`/farms/${id}`),
  update: (id: string, data: object) => api.put<Farm>(`/farms/${id}`, data),
  addSoilTest: (farmId: string, data: object) =>
    api.post(`/farms/${farmId}/soil-test`, data),
  getLatestSoilTest: (farmId: string) =>
    api.get(`/farms/${farmId}/soil-test/latest`),
};

export const cropApi = {
  recommend: (data: object) =>
    api.post<{
      recommendations: CropRecommendation[];
      explanation: string;
      weather_summary: object;
      missing_data: string[];
    }>("/crops/recommend", data),
  addCrop: (farmId: string, data: object) =>
    api.post(`/crops/farms/${farmId}/crops`, data),
  listCrops: (farmId: string) =>
    api.get(`/crops/farms/${farmId}/crops`),
  updateCrop: (farmId: string, cropId: string, data: object) =>
    api.put(`/crops/farms/${farmId}/crops/${cropId}`, data),
};

export const diseaseApi = {
  predict: (formData: FormData) =>
    api.post<DiseaseResult>("/disease/predict", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000, // disease inference can take longer
    }),
  getHistory: (farmId?: string) =>
    api.get<DiseaseResult[]>("/disease/history", { params: { farm_id: farmId } }),
};

export const weatherApi = {
  getCurrent: (lat: number, lon: number, language = "en") =>
    api.get<WeatherData>("/weather/current", { params: { lat, lon, language } }),
  getFarmWeather: (farmId: string) =>
    api.get<WeatherData>(`/weather/farm/${farmId}`),
};

export const chatApi = {
  send: (data: {
    message: string;
    conversation_id?: string;
    farm_id?: string;
    language?: string;
  }) => api.post<ChatResponse>("/chat", data),
  getConversations: () => api.get<Array<{ id: string; title: string; createdAt: string }>>("/chat/conversations"),
  getMessages: (convId: string) =>
    api.get<Array<{ id: string; role: string; content: string; createdAt: string }>>(
      `/chat/conversations/${convId}/messages`
    ),
};

export const alertApi = {
  list: (unreadOnly = false) =>
    api.get<Alert[]>("/alerts", { params: { unread_only: unreadOnly } }),
  markRead: (alertId: string) => api.put(`/alerts/${alertId}/read`),
  markAllRead: () => api.put("/alerts/read-all"),
};

export const healthApi = {
  check: () => api.get("/health"),
};

export default api;
