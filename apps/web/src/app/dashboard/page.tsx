"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CloudRain, Droplets, Wind, Sprout, AlertTriangle,
  TrendingUp, Shield, Plus, ChevronRight, ArrowRight,
  MapPin, Newspaper, Eye, CheckCircle2, AlertCircle, Brain
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { weatherApi, alertApi, type Alert, type WeatherData } from "@/lib/api";
import { db, farmsCol, getDocs } from "@/lib/firebase";

function conditionEmoji(c?: string) {
  if (!c) return "🌤";
  const s = c.toLowerCase();
  if (s.includes("thunder")) return "⛈";
  if (s.includes("rain") || s.includes("drizzle")) return "🌧";
  if (s.includes("cloud") || s.includes("overcast")) return "⛅";
  if (s.includes("fog") || s.includes("mist")) return "🌫";
  if (s.includes("snow")) return "❄️";
  return "☀️";
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [farms, setFarms] = useState<any[]>([]);
  const [time, setTime] = useState(new Date());
  const [deviceLat, setDeviceLat] = useState<number | null>(null);
  const [deviceLon, setDeviceLon] = useState<number | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDeviceLat(pos.coords.latitude);
          setDeviceLon(pos.coords.longitude);
        },
        (err) => {
          console.warn("Location permission denied. Falling back to farm location.");
        }
      );
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    getDocs(farmsCol(user.uid)).then((snap) =>
      setFarms(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const primaryFarm = farms[0];
  const weatherLat = deviceLat || primaryFarm?.latitude || 20.29;
  const weatherLon = deviceLon || primaryFarm?.longitude || 85.82;

  const { data: weather } = useQuery<WeatherData>({
    queryKey: ["weather", weatherLat, weatherLon],
    queryFn: () =>
      weatherApi
        .getCurrent(weatherLat, weatherLon)
        .then((r) => r.data),
    enabled: true,
    staleTime: 30 * 60 * 1000,
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["alerts-unread"],
    queryFn: () => alertApi.list(true).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const firstName = profile?.name?.split(" ")[0] || user?.displayName?.split(" ")[0] || "Farmer";

  const greet = () => {
    const h = time.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const f = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, delay },
  });

  return (
    <div className="px-5 pb-4 pt-2 space-y-4 flex flex-col max-w-[1400px] mx-auto h-[calc(100vh-90px)]">

      {/* ── Greeting ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-outfit font-bold" style={{ fontSize: "1.85rem", lineHeight: 1.2, color: "var(--text-primary)" }}>
            {greet()},{" "}
            <em style={{ color: "var(--text-muted)", fontStyle: "italic" }}>{firstName}</em>
          </h1>
          <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            {time.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            {profile?.district && (
              <><span className="opacity-40">·</span><MapPin size={10} />{profile.district}, {profile.state}</>
            )}
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
          <Link
            href="/dashboard/farm/new"
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold text-white hover:opacity-90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
          >
            <Plus size={16} /> Add Farm
          </Link>
        </motion.div>
      </div>

      {/* ── Alert strip ─────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl shrink-0"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <AlertTriangle size={14} className="flex-shrink-0" style={{ color: "#f59e0b" }} />
          <span className="text-xs font-bold" style={{ color: "#92400e" }}>{alerts.length} alert{alerts.length > 1 ? "s" : ""}</span>
          <span className="text-xs truncate hidden sm:block flex-1" style={{ color: "var(--text-muted)" }}>{alerts[0]?.message}</span>
          <Link href="/dashboard/alerts" className="ml-auto text-xs font-bold flex items-center gap-1 flex-shrink-0" style={{ color: "#d97706" }}>
            View Details <ChevronRight size={12} />
          </Link>
        </motion.div>
      )}

      {/* ── Two-Column Layout ─────────────────────────────────────────── */}
      <div className="grid gap-4 flex-1 min-h-0" style={{ gridTemplateColumns: "minmax(0, 1fr) 380px" }}>

        {/* LEFT: Weather panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-3xl flex flex-col h-full shadow-lg"
          style={{ background: "linear-gradient(145deg,#14532d 0%,#166534 45%,#15803d 100%)" }}
        >
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full opacity-15 pointer-events-none" style={{ background: "radial-gradient(circle,#a3e635,transparent)" }} />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle,#4ade80,transparent)" }} />

          <div className="relative z-10 p-6 flex flex-col h-full gap-3">

            {/* Location + time */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                <MapPin size={12} />
                {weather?.location ? `${weather.location.name}, ${weather.location.region}` : profile?.district ? `${profile.district}, ${profile.state}` : "Your Location"}
              </div>
              <span className="text-xs font-bold tabular-nums" style={{ color: "rgba(255,255,255,0.6)" }}>
                {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {/* Big temperature */}
            <div className="flex items-center justify-between mt-1 shrink-0">
              <div>
                <div className="font-outfit font-black text-white leading-none" style={{ fontSize: "5rem", textShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>
                  {weather ? `${Math.round(weather.current.temperature_c)}°` : "—°"}
                </div>
                <div className="text-lg font-bold mt-1" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {weather?.current.condition || "Loading…"}
                </div>
                <div className="text-xs mt-0.5 font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Feels like {weather ? `${Math.round(weather.current.temperature_c - 2)}°C` : "—"}
                </div>
              </div>
              <div className="text-[5.5rem] leading-none select-none animate-float" style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.25))" }}>
                {conditionEmoji(weather?.current.condition)}
              </div>
            </div>

            {/* Advisory */}
            {weather?.agricultural_advisory && (
              <div className="rounded-2xl px-4 py-3 text-xs leading-relaxed shrink-0" style={{ background: "rgba(163,230,53,0.12)", border: "1px solid rgba(163,230,53,0.2)" }}>
                <span className="font-bold text-sm block mb-0.5" style={{ color: "#a3e635" }}>🌾 Advisory</span>
                <span style={{ color: "rgba(255,255,255,0.85)" }}>{weather.agricultural_advisory}</span>
              </div>
            )}

            <div className="flex-1" />

            {/* Metrics strip */}
            <div className="grid grid-cols-4 gap-2 rounded-2xl p-4 shrink-0" style={{ background: "rgba(0,0,0,0.15)" }}>
              {[
                { icon: Droplets, label: "Humidity", value: weather ? `${weather.current.humidity_pct}%` : "—" },
                { icon: Wind, label: "Wind", value: weather ? `${Math.round(weather.current.wind_kph)} km/h` : "—" },
                { icon: CloudRain, label: "Rain", value: weather ? `${weather.current.rainfall_mm}mm` : "—" },
                { icon: Eye, label: "Visibility", value: "Good" },
              ].map((m) => (
                <div key={m.label} className="flex flex-col items-center gap-1 text-center">
                  <m.icon size={16} style={{ color: "rgba(255,255,255,0.55)" }} />
                  <div className="text-sm font-black text-white">{m.value}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Farm summary in panel */}
            {primaryFarm && (
              <div className="rounded-2xl px-4 py-3 flex items-center gap-3 shrink-0" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <span className="text-xl">🌾</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{primaryFarm.name}</div>
                  <div className="text-[11px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {primaryFarm.area_hectares} ha · {primaryFarm.soil_type} · {primaryFarm.has_irrigation ? "Irrigated" : "Rainfed"}
                  </div>
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <Link href="/dashboard/weather" className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold hover:opacity-80 transition-all" style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}>
                <CloudRain size={14} /> 7-Day Forecast
              </Link>
              <Link href="/dashboard/crops" className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-glow" style={{ background: "#a3e635", color: "#1a2e05" }}>
                <Sprout size={14} /> Crop Advice
              </Link>
            </div>
          </div>
        </motion.div>

        {/* RIGHT: Cards */}
        <div className="flex flex-col gap-3 h-full min-h-0">

          {/* Farm + Alerts */}
          <div className="grid grid-cols-2 gap-3 flex-1 min-h-0 shrink-0">
            <motion.div {...f(0.1)} className="glass-card p-4 flex flex-col h-full hover:shadow-md transition-all overflow-hidden">
              <div className="text-[9px] font-black tracking-widest mb-2 shrink-0" style={{ color: "var(--text-dim)" }}>MY FARM</div>
              {primaryFarm ? (
                <div className="flex-1 space-y-1 min-h-0 overflow-hidden">
                  <div className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>{primaryFarm.name}</div>
                  <div className="text-[11px] font-medium truncate" style={{ color: "var(--text-muted)" }}>{primaryFarm.area_hectares} ha · {primaryFarm.soil_type}</div>
                  <div className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 shrink-0" style={{ background: primaryFarm.has_irrigation ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: primaryFarm.has_irrigation ? "#16a34a" : "#b45309" }}>
                    {primaryFarm.has_irrigation ? "✓ Irrigated" : "Rainfed"}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-1 text-center min-h-0">
                  <span className="text-2xl shrink-0">🌱</span>
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>No farm added</span>
                </div>
              )}
              <Link href={primaryFarm ? "/dashboard/crops" : "/dashboard/farm/new"} className="mt-2 shrink-0 w-full text-center py-2 rounded-lg text-[11px] font-bold transition-all hover:bg-green-100" style={{ background: "rgba(34,197,94,0.09)", color: "#16a34a" }}>
                {primaryFarm ? "Manage Farm →" : "Add Farm →"}
              </Link>
            </motion.div>

            <motion.div {...f(0.14)} className="glass-card p-4 flex flex-col h-full hover:shadow-md transition-all overflow-hidden">
              <div className="text-[9px] font-black tracking-widest mb-2 shrink-0" style={{ color: "var(--text-dim)" }}>ALERTS</div>
              <div className="flex-1 flex flex-col items-center justify-center min-h-0 text-center">
                {alerts.length > 0 ? (
                  <>
                    <div className="flex items-baseline gap-1" style={{ color: "#d97706" }}>
                      <span className="text-4xl font-black leading-none">{alerts.length}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Active</span>
                    </div>
                    <span className="text-[10px] font-medium mt-1" style={{ color: "var(--text-muted)" }}>Action required</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={24} className="shrink-0 mb-1" style={{ color: "#22c55e" }} />
                    <span className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>All clear</span>
                  </>
                )}
              </div>
              <Link href="/dashboard/alerts" className="mt-2 shrink-0 w-full text-center py-2 rounded-lg text-[11px] font-bold transition-all hover:bg-green-100" style={{ background: "rgba(34,197,94,0.09)", color: "#16a34a" }}>
                View all alerts →
              </Link>
            </motion.div>
          </div>

          {/* AI Recommendations */}
          <motion.div {...f(0.18)} className="rounded-3xl p-5 relative overflow-hidden flex-[1.2] flex flex-col min-h-0 shadow-sm hover:shadow-md transition-all border border-green-100" style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)" }}>
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle,#86efac,transparent)" }} />
            <div className="relative z-10 flex flex-col h-full min-h-0">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <span className="text-xs font-black flex items-center gap-1.5" style={{ color: "#14532d" }}><Brain size={14} className="text-green-600"/> AI Insights</span>
                <Link href="/dashboard/chat" className="text-[10px] font-bold flex items-center gap-1 hover:underline shrink-0" style={{ color: "#16a34a" }}>
                  Ask AI <ArrowRight size={10} />
                </Link>
              </div>
              {weather?.agricultural_advisory ? (
                <div className="rounded-xl px-4 py-3 text-sm font-medium leading-relaxed shadow-sm bg-white/70 backdrop-blur-sm flex-1 overflow-hidden min-h-0" style={{ color: "#14532d" }}>
                  <div className="line-clamp-4">{weather.agricultural_advisory}</div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-end gap-2 min-h-0">
                  <div className="rounded-xl px-3 py-2.5 text-xs font-medium shadow-sm bg-white/60 shrink-0 line-clamp-2" style={{ color: "#166534" }}>
                    💡 Apply <strong className="text-green-800">5 kg urea</strong> before next rainfall.
                  </div>
                  <Link href="/dashboard/crops" className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold group shadow-sm bg-white/80 hover:bg-white transition-colors shrink-0" style={{ color: "#14532d" }}>
                    <span className="truncate">Get crop recommendation</span> <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform shrink-0 ml-1" />
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Combined Features Grid */}
          <motion.div {...f(0.22)} className="grid grid-cols-3 grid-rows-2 gap-3 flex-[1.5] min-h-0 shrink-0">
            {[
              { label: "Crop Advice", href: "/dashboard/crops", emoji: "🌾", bg: "#f0fdf4", border: "rgba(34,197,94,0.18)", color: "#15803d" },
              { label: "Disease Scan", href: "/dashboard/disease", emoji: "🔬", bg: "#fefce8", border: "rgba(202,138,4,0.18)", color: "#854d0e" },
              { label: "Ask AI", href: "/dashboard/chat", emoji: "💬", bg: "#f5f3ff", border: "rgba(124,58,237,0.15)", color: "#6d28d9" },
              { label: "Schemes", href: "/dashboard/schemes", emoji: "🛡️", bg: "#f0fdfa", border: "rgba(20,184,166,0.18)", color: "#0f766e" },
              { label: "Market Rates", href: "/dashboard/market", emoji: "📈", bg: "#fff7ed", border: "rgba(249,115,22,0.18)", color: "#c2410c" },
              { label: "Agri News", href: "/dashboard/news", emoji: "📰", bg: "#f8fafc", border: "rgba(100,116,139,0.18)", color: "#334155" },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl group transition-all hover:scale-[1.03] hover:shadow-md text-center min-h-0 h-full overflow-hidden" style={{ background: item.bg, border: `1px solid ${item.border}` }}>
                <span className="text-2xl transform group-hover:scale-110 transition-transform shrink-0">{item.emoji}</span>
                <span className="text-[10px] font-black leading-tight truncate w-full px-1" style={{ color: item.color }}>{item.label}</span>
              </Link>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
