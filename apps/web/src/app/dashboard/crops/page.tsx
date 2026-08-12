"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sprout, AlertTriangle, Loader2, Info, ChevronRight, CheckCircle, Leaf } from "lucide-react";
import { cropApi, farmApi, type CropRecommendation } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { db, farmsCol, getDocs } from "@/lib/firebase";
import { PageHeader, PageShell } from "@/components/PageHeader";
import { CustomSelect } from "@/components/CustomSelect";
import Link from "next/link";

export default function CropsPage() {
  const { user, profile } = useAuth();
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendationResult, setRecommendationResult] = useState<{
    recommendations: CropRecommendation[];
    explanation: string;
    missing_data: string[];
  } | null>(null);

  // Load farms
  useEffect(() => {
    if (!user) return;
    getDocs(farmsCol(user.uid)).then((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFarms(docs);
      if (docs.length > 0) setSelectedFarmId(docs[0].id);
    });
  }, [user]);

  const handleRecommend = async () => {
    if (!selectedFarmId) return;
    setIsRecommending(true);
    try {
      const { data } = await cropApi.recommend({
        farm_id: selectedFarmId,
        language: profile?.language || "en",
        season: "kharif", // Hardcoded for demo, could be dynamic
      });
      setRecommendationResult(data);
    } catch (err) {
      console.error("Crop recommendation failed:", err);
      alert("Failed to get recommendations. Ensure backend is running.");
    } finally {
      setIsRecommending(false);
    }
  };

  const selectedFarm = farms.find(f => f.id === selectedFarmId);

  return (
    <PageShell>
      <PageHeader 
        title="Crop Intelligence" 
        subtitle="AI-driven crop recommendations based on your soil, weather, and agronomic data" 
        icon="🌾"
        action={
          <Link href="/dashboard/crops/active" className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm">
            <Leaf size={16} /> View Active Crops
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Farm Context */}
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h2 className="font-outfit font-semibold mb-4">Farm Context</h2>
            
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Select Farm</label>
            <div className="mb-4">
              <CustomSelect
                value={selectedFarmId}
                onChange={setSelectedFarmId}
                options={farms.map(f => ({ value: f.id, label: f.name }))}
              />
            </div>

            {selectedFarm && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>Soil Type</div>
                  <div className="text-sm font-semibold">{selectedFarm.soil_type}</div>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>Irrigation</div>
                  <div className="text-sm font-semibold">{selectedFarm.has_irrigation ? selectedFarm.irrigation_type : "Rainfed (No Irrigation)"}</div>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>Area</div>
                  <div className="text-sm font-semibold">{selectedFarm.area_hectares} Hectares</div>
                </div>
              </div>
            )}

            <button
              onClick={handleRecommend}
              disabled={isRecommending || !selectedFarmId}
              className="btn-primary w-full mt-6 py-2.5 text-sm"
            >
              {isRecommending ? <Loader2 size={16} className="animate-spin" /> : <><Sprout size={16} /> Get AI Recommendations</>}
            </button>
          </div>

          <div className="glass-card p-5">
            <h2 className="font-outfit font-semibold mb-3">How it works</h2>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              FarmSaathi uses an XGBoost ML model combined with agronomic rules to calculate a composite score for each crop.
              <br/><br/>
              <strong>Formula:</strong> 40% ML + 20% Weather + 20% Soil + 10% Water + 10% Season.
            </p>
          </div>
        </div>

        {/* Right Column: Recommendations */}
        <div className="md:col-span-2">
          {!recommendationResult && !isRecommending && (
             <div className="glass-card h-full flex flex-col items-center justify-center p-10 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(34,197,94,0.1)" }}>
                   <Sprout size={32} style={{ color: "var(--brand-500)" }} />
                </div>
                <h3 className="font-outfit font-semibold text-lg mb-2">Ready to plan your next harvest?</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                   Select a farm on the left and click "Get AI Recommendations" to see which crops will thrive in your conditions.
                </p>
             </div>
          )}

          {isRecommending && (
             <div className="glass-card h-full flex flex-col items-center justify-center p-10 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-pulse-glow" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                   <Loader2 size={32} color="white" className="animate-spin" />
                </div>
                <h3 className="font-outfit font-semibold text-lg mb-2">Analyzing Agronomic Data</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                   Evaluating soil profile, ML predictions, and current weather patterns...
                </p>
             </div>
          )}

          {recommendationResult && !isRecommending && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              
              {/* Qwen Explanation */}
              <div className="glass-card p-5 border-l-4" style={{ borderLeftColor: "var(--brand-500)" }}>
                 <div className="flex items-center gap-2 mb-2">
                   <div className="badge badge-success">AI Advice</div>
                 </div>
                 <p className="text-sm leading-relaxed">{recommendationResult.explanation}</p>
              </div>

              {/* Missing Data Warnings */}
              {recommendationResult.missing_data && recommendationResult.missing_data.length > 0 && (
                <div className="p-4 rounded-xl text-sm flex items-start gap-3" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <Info size={18} style={{ color: "var(--warning)", marginTop: "2px" }} />
                  <div>
                    <span className="font-semibold block mb-1" style={{ color: "var(--warning)" }}>Missing Context</span>
                    <ul className="list-disc pl-4" style={{ color: "var(--text-muted)" }}>
                       {recommendationResult.missing_data.map(msg => <li key={msg}>{msg}</li>)}
                    </ul>
                    <div className="mt-2 text-xs">Add a recent Soil Test report to improve accuracy.</div>
                  </div>
                </div>
              )}

              {/* Top Crops */}
              <h3 className="font-outfit font-semibold mt-6 mb-3">Top Recommended Crops</h3>
              <div className="space-y-3">
                {recommendationResult.recommendations.map((rec, idx) => (
                  <div key={rec.crop} className="glass-card p-5 hover:border-green-500 transition-colors">
                     <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'text-white' : ''}`} style={{ background: idx === 0 ? "linear-gradient(135deg, #22c55e, #16a34a)" : "var(--bg-card-hover)", color: idx !== 0 ? "var(--text-primary)" : undefined }}>
                              {idx + 1}
                           </div>
                           <div>
                              <h4 className="text-lg font-outfit font-bold capitalize">{rec.crop}</h4>
                              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Composite Match Score</div>
                           </div>
                        </div>
                        <div className="text-2xl font-black gradient-text-green">
                           {(rec.score * 100).toFixed(0)}%
                        </div>
                     </div>

                     {/* Score Breakdown */}
                     <div className="grid grid-cols-5 gap-2 mb-4">
                        {[
                           { label: "ML", val: rec.ml_score },
                           { label: "Weather", val: rec.weather_score },
                           { label: "Soil", val: rec.soil_score },
                           { label: "Water", val: rec.water_score },
                           { label: "Season", val: rec.season_score },
                        ].map(s => (
                           <div key={s.label} className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                              <div className="text-[10px] uppercase mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                              <div className="text-xs font-semibold" style={{ color: s.val > 0.7 ? "#4ade80" : s.val > 0.4 ? "#facc15" : "#fca5a5" }}>
                                 {(s.val * 100).toFixed(0)}%
                              </div>
                           </div>
                        ))}
                     </div>

                     {/* Reasons & Warnings */}
                     <div className="space-y-2">
                        {rec.reasons.map(r => (
                           <div key={r} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                              <CheckCircle size={14} color="#22c55e" className="flex-shrink-0 mt-0.5" /> {r}
                           </div>
                        ))}
                        {rec.warnings.map(w => (
                           <div key={w} className="flex items-start gap-2 text-xs" style={{ color: "var(--warning)" }}>
                              <AlertTriangle size={14} color="#facc15" className="flex-shrink-0 mt-0.5" /> {w}
                           </div>
                        ))}
                     </div>
                  </div>
                ))}
              </div>

            </motion.div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
