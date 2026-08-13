"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CloudRain, Wind, Droplets, Sun, Moon, MapPin, Loader2, ThermometerSun, AlertCircle, Cloud, CloudLightning, Snowflake } from "lucide-react";
import { weatherApi, type WeatherData } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { db, farmsCol, getDocs } from "@/lib/firebase";
import { PageHeader, PageShell } from "@/components/PageHeader";
import { CustomSelect } from "@/components/CustomSelect";

export default function WeatherPage() {
  const { user } = useAuth();
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    getDocs(farmsCol(user.uid)).then((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFarms(docs);
      if (docs.length > 0) setSelectedFarmId(docs[0].id);
    });
  }, [user]);

  const selectedFarm = farms.find(f => f.id === selectedFarmId);

  const { data: weather, isLoading } = useQuery<WeatherData>({
    queryKey: ["weather", selectedFarm?.latitude, selectedFarm?.longitude],
    queryFn: () => weatherApi.getCurrent(selectedFarm?.latitude || 20.29, selectedFarm?.longitude || 85.82).then(r => r.data),
    enabled: !!selectedFarm,
    staleTime: 30 * 60 * 1000,
  });

  return (
    <PageShell>
      <PageHeader
        title="Weather Intelligence"
        subtitle="Real-time conditions and 7-day forecast for your farm"
        icon="⛅"
        action={
          farms.length > 0 ? (
            <div className="w-[200px]">
              <CustomSelect
                value={selectedFarmId}
                onChange={setSelectedFarmId}
                options={farms.map(f => ({ value: f.id, label: f.name }))}
              />
            </div>
          ) : undefined
        }
      />

      {isLoading && (
         <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin mb-4" style={{ color: "var(--brand-500)" }} />
            <p style={{ color: "var(--text-muted)" }}>Loading weather data...</p>
         </div>
      )}

      {weather && (
        <div className="space-y-6">
          {/* Current Weather Banner */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              
              <div className="flex items-center gap-6">
                {/* Weather Icon (using placeholder colors based on condition) */}
                <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg" style={{ background: weather.current.is_day ? "linear-gradient(135deg, #facc15, #f59e0b)" : "linear-gradient(135deg, #3b82f6, #1e3a8a)" }}>
                   {weather.current.is_day ? <Sun size={48} color="white" /> : <Moon size={48} color="white" />}
                </div>
                
                <div>
                  <div className="text-6xl font-outfit font-black mb-2" style={{ color: "var(--text-primary)" }}>
                    {Math.round(weather.current.temperature_c)}°C
                  </div>
                  <div className="text-xl font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    {weather.current.condition}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
                    <MapPin size={14} /> {[weather.location.name, weather.location.region].filter(Boolean).join(", ") || "Your Location"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                 <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    <ThermometerSun size={20} color="#facc15" />
                    <div>
                       <div className="text-xs" style={{ color: "var(--text-muted)" }}>Feels Like</div>
                       <div className="font-semibold text-lg">{Math.round(weather.current.feels_like_c)}°C</div>
                    </div>
                 </div>
                 <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    <Droplets size={20} color="#38bdf8" />
                    <div>
                       <div className="text-xs" style={{ color: "var(--text-muted)" }}>Humidity</div>
                       <div className="font-semibold text-lg">{weather.current.humidity_pct}%</div>
                    </div>
                 </div>
                 <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    <Wind size={20} color="#a78bfa" />
                    <div>
                       <div className="text-xs" style={{ color: "var(--text-muted)" }}>Wind</div>
                       <div className="font-semibold text-lg">{Math.round(weather.current.wind_kph)} kph</div>
                    </div>
                 </div>
                 <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    <CloudRain size={20} color="#22c55e" />
                    <div>
                       <div className="text-xs" style={{ color: "var(--text-muted)" }}>Precipitation</div>
                       <div className="font-semibold text-lg">{weather.current.rainfall_mm} mm</div>
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>

          {/* AI Advisory */}
          {weather.agricultural_advisory && (
             <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 border-l-4" style={{ borderLeftColor: "var(--brand-500)" }}>
                <div className="flex items-center gap-2 mb-2">
                   <div className="badge badge-success">AI Agricultural Advisory</div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{weather.agricultural_advisory}</p>
             </motion.div>
          )}

          {/* 7-Day Forecast */}
          {weather.forecast && weather.forecast.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
               <h2 className="font-outfit font-semibold mb-4 text-lg">7-Day Forecast</h2>
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {weather.forecast.map((day, i) => (
                     <div key={day.date} className="glass-card p-4 flex flex-col items-center text-center hover:border-green-500 transition-colors">
                        <div className="text-xs font-medium mb-3" style={{ color: i === 0 ? "var(--brand-400)" : "var(--text-muted)" }}>
                           {i === 0 ? "Today" : new Date(day.date).toLocaleDateString("en-US", { weekday: 'short' })}
                        </div>
                        <div className="w-10 h-10 mb-3 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                           {day.total_rainfall_mm > 5 ? <CloudRain size={20} color="#38bdf8" /> : <Sun size={20} color="#facc15" />}
                        </div>
                        <div className="font-bold text-lg mb-1">{Math.round(day.max_temp_c)}°</div>
                        <div className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{Math.round(day.min_temp_c)}°</div>
                        
                        <div className="w-full flex items-center justify-center gap-1 text-[10px]" style={{ color: day.chance_of_rain_pct > 30 ? "#38bdf8" : "var(--text-dim)" }}>
                           <Droplets size={10} /> {day.chance_of_rain_pct}%
                        </div>
                     </div>
                  ))}
               </div>
            </motion.div>
          )}
        </div>
      )}
    </PageShell>
  );
}
