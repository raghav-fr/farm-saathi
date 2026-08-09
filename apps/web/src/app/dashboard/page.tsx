"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CloudRain, Droplets, Wind, Sprout, AlertTriangle,
  TrendingUp, Shield, Plus, ChevronRight, ArrowRight,
  MapPin, Newspaper, Eye, CheckCircle2, AlertCircle
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

  const { data: weather } = useQuery<WeatherData>({
    queryKey: ["weather", primaryFarm?.latitude, primaryFarm?.longitude],
    queryFn: () =>
      weatherApi
        .getCurrent(primaryFarm?.latitude || 20.29, primaryFarm?.longitude || 85.82)
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
    <div className="px-5 pb-6 pt-4 space-y-4">

      {/* ── Greeting ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-outfit font-bold" style={{ fontSize: "1.75rem", lineHeight: 1.2, color: "var(--text-primary)" }}>
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-all"
            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
          >
            <Plus size={14} /> Add Farm
          </Link>
        </motion.div>
      </div>

      {/* ── Alert strip ─────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <AlertTriangle size={13} className="flex-shrink-0" style={{ color: "#f59e0b" }} />
          <span className="text-xs font-semibold" style={{ color: "#92400e" }}>{alerts.length} alert{alerts.length > 1 ? "s" : ""}</span>
          <span className="text-xs truncate hidden sm:block" style={{ color: "var(--text-muted)" }}>{alerts[0]?.message?.slice(0, 65)}…</span>
          <Link href="/dashboard/alerts" className="ml-auto text-xs font-bold flex items-center gap-0.5 flex-shrink-0" style={{ color: "#d97706" }}>
            View <ChevronRight size={10} />
          </Link>
        </motion.div>
      )}

      {/* ── Two-Column Layout ─────────────────────────────────────────── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 360px" }}>

        {/* LEFT: Weather panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-2xl flex flex-col"
          style={{ background: "linear-gradient(145deg,#14532d 0%,#166534 45%,#15803d 100%)", minHeight: "440px" }}
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-15 pointer-events-none" style={{ background: "radial-gradient(circle,#a3e635,transparent)" }} />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle,#4ade80,transparent)" }} />

          <div className="relative z-10 p-6 flex flex-col h-full gap-4">

            {/* Location + time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                <MapPin size={11} />
                {weather?.location ? `${weather.location.name}, ${weather.location.region}` : profile?.district ? `${profile.district}, ${profile.state}` : "Your Location"}
              </div>
              <span className="text-xs font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.5)" }}>
                {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {/* Big temperature */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-outfit font-black text-white leading-none" style={{ fontSize: "4.5rem", textShadow: "0 2px 16px rgba(0,0,0,0.15)" }}>
                  {weather ? `${Math.round(weather.current.temperature_c)}°` : "—°"}
                </div>
                <div className="text-base font-semibold mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>
                  {weather?.current.condition || "Loading…"}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Feels like {weather ? `${Math.round(weather.current.temperature_c - 2)}°C` : "—"}
                </div>
              </div>
              <div className="text-[5rem] leading-none select-none animate-float" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" }}>
                {conditionEmoji(weather?.current.condition)}
              </div>
            </div>

            {/* Metrics strip */}
            <div className="grid grid-cols-4 gap-2 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.15)" }}>
              {[
                { icon: Droplets, label: "Humidity", value: weather ? `${weather.current.humidity_pct}%` : "—" },
                { icon: Wind, label: "Wind", value: weather ? `${Math.round(weather.current.wind_kph)} km/h` : "—" },
                { icon: CloudRain, label: "Rain", value: weather ? `${weather.current.rainfall_mm}mm` : "—" },
                { icon: Eye, label: "Visibility", value: "Good" },
              ].map((m) => (
                <div key={m.label} className="flex flex-col items-center gap-1 text-center">
                  <m.icon size={14} style={{ color: "rgba(255,255,255,0.55)" }} />
                  <div className="text-xs font-bold text-white">{m.value}</div>
                  <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Advisory */}
            {weather?.agricultural_advisory && (
              <div className="rounded-xl px-3 py-2.5 text-xs leading-relaxed" style={{ background: "rgba(163,230,53,0.12)", border: "1px solid rgba(163,230,53,0.2)" }}>
                <span className="font-semibold" style={{ color: "#a3e635" }}>🌾 Advisory: </span>
                <span style={{ color: "rgba(255,255,255,0.72)" }}>{weather.agricultural_advisory}</span>
              </div>
            )}

            <div className="flex-1" />

            {/* Farm summary in panel */}
            {primaryFarm && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span className="text-lg">🌾</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{primaryFarm.name}</div>
                  <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {primaryFarm.area_hectares} ha · {primaryFarm.soil_type} · {primaryFarm.has_irrigation ? "Irrigated" : "Rainfed"}
                  </div>
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-2">
              <Link href="/dashboard/weather" className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold hover:opacity-80 transition-all" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <CloudRain size={12} /> 7-Day Forecast
              </Link>
              <Link href="/dashboard/crops" className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold hover:opacity-90 transition-all" style={{ background: "#a3e635", color: "#1a2e05" }}>
                <Sprout size={12} /> Crop Advice
              </Link>
            </div>
          </div>
        </motion.div>

        {/* RIGHT: Cards */}
        <div className="flex flex-col gap-3">

          {/* Farm + Alerts */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div {...f(0.1)} className="glass-card p-4 flex flex-col">
              <div className="text-[9px] font-bold tracking-widest mb-2.5" style={{ color: "var(--text-dim)" }}>MY FARM</div>
              {primaryFarm ? (
                <div className="flex-1 space-y-1.5">
                  <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{primaryFarm.name}</div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{primaryFarm.area_hectares} ha · {primaryFarm.soil_type}</div>
                  <div className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: primaryFarm.has_irrigation ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: primaryFarm.has_irrigation ? "#16a34a" : "#b45309" }}>
                    {primaryFarm.has_irrigation ? "✓ Irrigated" : "Rainfed"}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-center">
                  <span className="text-2xl">🌱</span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>No farm added</span>
                </div>
              )}
              <Link href={primaryFarm ? "/dashboard/crops" : "/dashboard/farm/new"} className="mt-2.5 text-center py-1.5 rounded-xl text-[10px] font-bold" style={{ background: "rgba(34,197,94,0.09)", color: "#16a34a" }}>
                {primaryFarm ? "Crop Advice →" : "Add Farm →"}
              </Link>
            </motion.div>

            <motion.div {...f(0.14)} className="glass-card p-4 flex flex-col">
              <div className="text-[9px] font-bold tracking-widest mb-2.5" style={{ color: "var(--text-dim)" }}>ALERTS</div>
              <div className="flex-1 flex flex-col gap-1.5">
                {alerts.length > 0 ? (
                  alerts.slice(0, 3).map((a: Alert, i: number) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <AlertCircle size={10} className="flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
                      <span className="text-[10px] leading-tight line-clamp-2" style={{ color: "var(--text-muted)" }}>{a.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-center">
                    <CheckCircle2 size={22} style={{ color: "#22c55e" }} />
                    <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>All clear</span>
                  </div>
                )}
              </div>
              <Link href="/dashboard/alerts" className="mt-2.5 text-center py-1.5 rounded-xl text-[10px] font-bold" style={{ background: "rgba(34,197,94,0.09)", color: "#16a34a" }}>
                View alerts →
              </Link>
            </motion.div>
          </div>

          {/* AI Recommendations */}
          <motion.div {...f(0.18)} className="rounded-2xl p-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)" }}>
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle,#86efac,transparent)" }} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold" style={{ color: "#14532d" }}>🤖 AI Recommendations</span>
                <Link href="/dashboard/chat" className="text-[10px] font-bold flex items-center gap-0.5" style={{ color: "#16a34a" }}>
                  Ask AI <ArrowRight size={10} />
                </Link>
              </div>
              {weather?.agricultural_advisory ? (
                <div className="rounded-xl px-3 py-2 text-xs leading-relaxed" style={{ background: "rgba(255,255,255,0.7)", color: "#14532d" }}>{weather.agricultural_advisory}</div>
              ) : (
                <div className="space-y-1.5">
                  <div className="rounded-xl px-3 py-2 text-[11px]" style={{ background: "rgba(255,255,255,0.6)", color: "#166534" }}>
                    💡 Apply <strong>5 kg urea</strong> before next rainfall.
                  </div>
                  <Link href="/dashboard/crops" className="flex items-center justify-between rounded-xl px-3 py-2 text-[11px] font-semibold group" style={{ background: "rgba(255,255,255,0.7)", color: "#14532d" }}>
                    Get crop recommendation <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick actions */}
          <motion.div {...f(0.22)} className="grid grid-cols-3 gap-2.5">
            {[
              { label: "Crop Advice", href: "/dashboard/crops", emoji: "🌾", bg: "#f0fdf4", border: "rgba(34,197,94,0.18)", color: "#15803d" },
              { label: "Disease Scan", href: "/dashboard/disease", emoji: "🔬", bg: "#fefce8", border: "rgba(202,138,4,0.18)", color: "#854d0e" },
              { label: "Ask AI", href: "/dashboard/chat", emoji: "💬", bg: "#f5f3ff", border: "rgba(124,58,237,0.15)", color: "#6d28d9" },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="flex flex-col gap-2 p-3 rounded-xl group transition-all hover:scale-[1.03] hover:shadow-md" style={{ background: item.bg, border: `1px solid ${item.border}` }}>
                <span className="text-xl">{item.emoji}</span>
                <span className="text-[11px] font-semibold leading-tight" style={{ color: item.color }}>{item.label}</span>
              </Link>
            ))}
          </motion.div>

          {/* Feature links */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: Shield, title: "Schemes", sub: "3 eligible", href: "/dashboard/schemes" },
              { icon: TrendingUp, title: "Market", sub: "Live rates", href: "/dashboard/market" },
              { icon: Newspaper, title: "News", sub: "Latest", href: "/dashboard/news" },
            ].map((s, i) => (
              <motion.div key={s.title} {...f(0.26 + i * 0.04)}>
                <Link href={s.href} className="glass-card p-3 flex flex-col gap-1.5 group transition-all hover:scale-[1.02]">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: "rgba(34,197,94,0.1)" }}>
                    <s.icon size={15} style={{ color: "#16a34a" }} />
                  </div>
                  <div>
                    <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{s.title}</div>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.sub}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
