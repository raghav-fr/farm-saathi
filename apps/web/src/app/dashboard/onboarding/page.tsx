"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, MapPin, Droplets, Sprout } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { farmerApi, farmApi } from "@/lib/api";
import { CustomSelect } from "@/components/CustomSelect";

const SOIL_TYPES = [
  { value: "clay", label: "Clay" },
  { value: "sandy", label: "Sandy" },
  { value: "loamy", label: "Loamy" },
  { value: "silty", label: "Silty" },
  { value: "black", label: "Black" },
  { value: "red", label: "Red" },
  { value: "laterite", label: "Laterite" },
  { value: "unknown", label: "Other / Unknown" }
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
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleGetLocation = () => {
    setIsLocating(true);
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setIsLocating(false);
      },
      (err) => {
        setError("Unable to retrieve your location. Please allow location access.");
        setIsLocating(false);
      }
    );
  };

  useEffect(() => {
    handleGetLocation();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (latitude === null || longitude === null) {
      setError("Please get your farm's location first.");
      return;
    }
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
        latitude: latitude,
        longitude: longitude,
        area_hectares: Number(area),
        soil_type: soilType,
        irrigation_type: irrigationType || "rainfed",
        has_irrigation: irrigation,
      });

      // 2. Mark onboarding complete
      await farmerApi.updateMe({ onboardingComplete: true });
      await refreshProfile();

      // 3. Go to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const errorMsg = Array.isArray(detail) ? detail[0]?.msg : (typeof detail === 'string' ? detail : "Failed to save farm details. Please try again.");
      setError(errorMsg);
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
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Farm Location</label>
              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors flex-1 shadow-sm"
                  style={{ background: latitude ? "rgba(195, 245, 60, 0.2)" : "rgba(0,0,0,0.03)", color: latitude ? "#65a30d" : "#000", border: latitude ? "1px solid #c3f53c" : "1px solid rgba(0,0,0,0.1)" }}
                >
                  {isLocating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                  {latitude ? "Location Acquired" : "Get Current Location"}
                </button>
                {latitude && (
                  <div className="text-xs font-medium text-gray-500 min-w-[80px]">
                    {latitude.toFixed(4)}<br/>{longitude?.toFixed(4)}
                  </div>
                )}
              </div>
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
              <CustomSelect
                value={soilType}
                onChange={setSoilType}
                required
                placeholder="Select soil type"
                options={SOIL_TYPES}
              />
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
                  <CustomSelect
                    value={irrigationType}
                    onChange={setIrrigationType}
                    required={irrigation}
                    placeholder="Select method"
                    options={[
                      { value: "drip", label: "Drip Irrigation" },
                      { value: "sprinkler", label: "Sprinkler" },
                      { value: "canal", label: "Canal" },
                      { value: "borewell", label: "Tube Well / Borewell" },
                      { value: "pond", label: "Pond" },
                      { value: "rainfed", label: "Other / Rainfed" }
                    ]}
                  />
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
