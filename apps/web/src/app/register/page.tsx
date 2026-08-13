"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Sprout, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CustomSelect } from "@/components/CustomSelect";

const STATES = [
  "Andhra Pradesh", "Bihar", "Chhattisgarh", "Gujarat", "Haryana",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export default function RegisterPage() {
  const { registerEmail, signInGoogle } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [language, setLanguage] = useState<"en" | "hi" | "od">("en");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError("");
    setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state || !district) { setError("Please select your state and district."); return; }
    setError("");
    setIsSubmitting(true);
    try {
      await registerEmail(email, password, name);
      // Profile info will be collected on onboarding page
      router.push("/dashboard/onboarding");
    } catch (err: any) {
      const msg = err?.code === "auth/email-already-in-use"
        ? "An account with this email already exists."
        : err?.message || "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setIsSubmitting(true);
    try {
      const { onboardingComplete } = await signInGoogle();
      if (onboardingComplete) {
        router.push("/dashboard");
        return;
      }
      
      // Fallback: Check if farm is already available via API
      try {
        const { farmApi } = await import("@/lib/api");
        const { data: farms } = await farmApi.list();
        if (farms && farms.length > 0) {
          router.push("/dashboard");
          return;
        }
      } catch (e) {
        console.error("Failed to check farms:", e);
      }

      router.push("/dashboard/onboarding");
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-8 pointer-events-none"
        style={{ background: "radial-gradient(circle, #22c55e, transparent 70%)", filter: "blur(80px)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
          >
            <Sprout size={20} color="white" />
          </div>
          <span className="font-outfit font-bold text-2xl">
            FarmSaathi <span className="gradient-text-green">AI</span>
          </span>
        </div>

        <div className="glass-card p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: step >= s ? "linear-gradient(135deg,#22c55e,#16a34a)" : "var(--bg-card)",
                    border: `1px solid ${step >= s ? "#22c55e" : "var(--border)"}`,
                    color: step >= s ? "white" : "var(--text-muted)",
                  }}
                >
                  {s}
                </div>
                {s < 2 && (
                  <div
                    className="flex-1 h-px w-8"
                    style={{ background: step > s ? "#22c55e" : "var(--border)" }}
                  />
                )}
              </div>
            ))}
            <span className="ml-2 text-sm" style={{ color: "var(--text-muted)" }}>
              {step === 1 ? "Account details" : "Farm location"}
            </span>
          </div>

          <h1 className="text-2xl font-outfit font-bold mb-1">Create account</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Join FarmSaathi AI — free forever
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-4 p-3 rounded-lg text-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}

          {step === 1 ? (
            <>
              {/* Google */}
              <button
                id="google-register-btn"
                onClick={handleGoogle}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold mb-4 transition-all hover:scale-[1.01]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              </div>

              <form onSubmit={handleStep1} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Full Name</label>
                  <input id="name-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ravi Kumar" required className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
                  <input id="reg-email-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Password</label>
                  <div className="relative">
                    <input id="reg-password-input" type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required className="input-field pr-10" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Preferred Language</label>
                  <CustomSelect 
                    value={language} 
                    onChange={v => setLanguage(v as "en" | "hi" | "od")} 
                    options={[
                      { value: "en", label: "English" },
                      { value: "hi", label: "हिंदी (Hindi)" },
                      { value: "od", label: "ଓଡ଼ିଆ (Odia)" },
                    ]}
                  />
                </div>

                <button id="next-step-btn" type="submit" className="btn-primary w-full py-3">
                  Continue →
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>State</label>
                <CustomSelect 
                  value={state} 
                  onChange={setState} 
                  required
                  placeholder="Select your state"
                  options={STATES.map(s => ({ value: s, label: s }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>District</label>
                <input id="district-input" type="text" value={district} onChange={e => setDistrict(e.target.value)} placeholder="e.g. Sundargarh" required className="input-field" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 py-3 text-sm">
                  ← Back
                </button>
                <button id="register-submit-btn" type="submit" disabled={isSubmitting} className="btn-primary flex-1 py-3">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Create Account"}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--brand-400)" }} className="font-medium">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
