"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, MapPin, Droplets, Sprout } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { farmerApi, farmApi } from "@/lib/api";

const SOIL_TYPES = [
  "Alluvial", "Black", "Red", "Laterite", "Arid", "Forest/Mountain", "Peaty/Marshy", "Other"
];

export default function OnboardingPage() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();

  const [farmName, setFarmName] = useState("My Farm");
  const [area, setArea] = useState("");
  const [soilType, setSoilType] = useState("");
  const [irrigation, setIrrigation] = useState(false);
  const [irrigationType, setIrrigationType] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!area || isNaN(Number(area)) || Number(area) <= 0) {
      setError("Please enter a valid area in hectares.");
      return;
    }
    if (!soilType) {
      setError("Please select your primary soil type.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      // 1. Create Farm
      await farmApi.create({
        name: farmName,
        latitude: 20.2961, // Defaulting to Bhubaneswar for demo (should use geolocation API)
        longitude: 85.8245,
        area_hectares: Number(area),
        soil_type: soilType,
        irrigation_type: irrigationType || "None",
        has_irrigation: irrigation,
      });

      // 2. Mark onboarding complete
      await farmerApi.updateMe({ onboardingComplete: true });
      await refreshProfile();

      // 3. Go to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save farm details. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-primary)" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <div className="glass-card p-10">
          <div className="text-center mb-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
            >
              <Sprout size={32} color="white" />
            </div>
            <h1 className="text-2xl font-outfit font-bold mb-2">Welcome to FarmSaathi, {profile?.name?.split(' ')[0] || 'Farmer'}!</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Let's set up your first farm to get personalized AI recommendations.
            </p>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 mb-6 p-3 rounded-lg text-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
            >
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Farm Name</label>
              <input
                type="text"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="e.g. North Field"
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Area (Hectares)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. 2.5"
                  required
                  className="input-field pl-10"
                />
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Primary Soil Type</label>
              <select
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                required
                className="input-field"
              >
                <option value="">Select soil type</option>
                {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={irrigation}
                  onChange={(e) => setIrrigation(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 text-green-500 focus:ring-green-500 bg-transparent"
                />
                <div>
                  <div className="font-medium text-sm">I have irrigation available</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>Farm is not purely rainfed</div>
                </div>
              </label>
            </div>

            {irrigation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden mt-4"
              >
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Irrigation Method</label>
                <div className="relative">
                  <select
                    value={irrigationType}
                    onChange={(e) => setIrrigationType(e.target.value)}
                    required={irrigation}
                    className="input-field pl-10"
                  >
                    <option value="">Select method</option>
                    <option value="Drip">Drip Irrigation</option>
                    <option value="Sprinkler">Sprinkler</option>
                    <option value="Canal">Canal</option>
                    <option value="Tube Well">Tube Well / Borewell</option>
                    <option value="Other">Other</option>
                  </select>
                  <Droplets size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-4 mt-6 text-base"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : "Complete Setup"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
