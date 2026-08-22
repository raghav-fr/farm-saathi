"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Upload, Loader2, CheckCircle, AlertTriangle,
  Info, Leaf, ThumbsUp, ThumbsDown, RefreshCw
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { diseaseApi, type DiseaseResult } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/PageHeader";
import { FormattedText } from "@/components/FormattedText";
import { uploadDiseaseScanImage } from "@/lib/firebase";

const SEVERITY_COLORS = {
  Mild: "#facc15",
  Moderate: "#f97316",
  Severe: "#ef4444",
};

export default function DiseasePage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<DiseaseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleFile = (selectedFile: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
      setError("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10 MB.");
      return;
    }
    setError("");
    setFile(selectedFile);
    setResult(null);
    setFeedback(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const analyzeImage = async () => {
    if (!file) return;
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("language", "en");
      const { data } = await diseaseApi.predict(formData);
      setResult(data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const errorMsg = Array.isArray(detail) ? detail[0]?.msg : (typeof detail === 'string' ? detail : "Analysis failed. Please try again with a clearer image.");
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    setFeedback(null);
  };

  const StatusIcon = () => {
    if (!result) return null;
    if (result.status === "healthy") return <CheckCircle size={20} color="#22c55e" />;
    if (result.status === "uncertain") return <Info size={20} color="#38bdf8" />;
    if (result.status === "detected") return <AlertTriangle size={20} color="#f97316" />;
    return null;
  };

  return (
    <PageShell>
      <PageHeader title="Disease Detection" subtitle="Upload a clear leaf or plant photo for AI-powered diagnosis" icon="🔬" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Upload panel ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            ref={dropRef}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="glass-card border-dashed cursor-pointer flex flex-col items-center justify-center p-8 transition-all hover:border-green-500"
            style={{
              borderStyle: "dashed",
              borderColor: preview ? "var(--brand-500)" : "var(--border)",
              minHeight: "220px",
            }}
          >
            {preview ? (
              <img
                src={preview}
                alt="Uploaded leaf"
                className="max-h-40 rounded-xl object-cover"
              />
            ) : (
              <>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(34,197,94,0.1)" }}
                >
                  <Camera size={24} style={{ color: "#22c55e" }} />
                </div>
                <p className="font-medium text-sm mb-1" style={{ color: "var(--text-primary)" }}>
                  Drop leaf image here
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  JPG, PNG, WebP · Max 10 MB
                </p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            id="disease-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {error && (
            <div
              className="p-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {file && !result && (
            <button
              id="analyze-btn"
              onClick={analyzeImage}
              disabled={isLoading}
              className="btn-primary w-full py-3"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Leaf size={16} /> Analyze Image
                </>
              )}
            </button>
          )}

          {result && (
            <button onClick={reset} className="btn-secondary w-full py-3 text-sm">
              <RefreshCw size={14} /> Analyze Another Image
            </button>
          )}

          {/* Tips */}
          <div className="glass-card p-4 space-y-2">
            <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>📸 Tips for better results</p>
            {[
              "Clear, well-lit photo of affected leaf",
              "Focus on the diseased area",
              "Include close-up of spots or lesions",
              "Avoid blurry or backlit images",
            ].map((tip) => (
              <p key={tip} className="text-xs" style={{ color: "var(--text-muted)" }}>• {tip}</p>
            ))}
          </div>
        </div>

        {/* ── Result panel ─────────────────────────────────────────── */}
        <div>
          <AnimatePresence mode="wait">
            {!result && !isLoading && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card p-8 flex flex-col items-center justify-center text-center"
                style={{ minHeight: "400px" }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(34,197,94,0.08)" }}
                >
                  <Leaf size={28} style={{ color: "var(--text-muted)" }} />
                </div>
                <p className="font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                  Analysis results will appear here
                </p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Upload a leaf photo and click Analyze
                </p>
              </motion.div>
            )}

            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card p-8 flex flex-col items-center justify-center text-center"
                style={{ minHeight: "400px" }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 animate-pulse-glow"
                  style={{ background: "rgba(34,197,94,0.1)" }}
                >
                  <Loader2 size={28} className="animate-spin" style={{ color: "#22c55e" }} />
                </div>
                <p className="font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                  Analyzing your image...
                </p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  EfficientNet-B0 is processing the leaf
                </p>
              </motion.div>
            )}

            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-card p-6 space-y-5"
              >
                {/* Status header */}
                <div className="flex items-center gap-2">
                  <StatusIcon />
                  <h2 className="font-outfit font-bold text-lg">
                    {result.status === "healthy" ? "✅ Healthy Plant" :
                     result.status === "uncertain" ? "🔍 Uncertain" :
                     result.status === "detected" ? "⚠️ Disease Detected" : "Analysis Result"}
                  </h2>
                </div>

                {/* Disease details */}
                {result.status === "detected" && (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Crop", value: result.crop },
                      { label: "Disease", value: result.disease },
                      {
                        label: "Confidence",
                        value: result.confidence ? `${(result.confidence * 100).toFixed(1)}%` : "—",
                      },
                      { label: "Severity", value: result.severity },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-xl p-3"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
                      >
                        <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
                        <div
                          className="font-semibold text-sm"
                          style={{
                            color: label === "Severity" && result.severity
                              ? SEVERITY_COLORS[result.severity as keyof typeof SEVERITY_COLORS] || "var(--text-primary)"
                              : "var(--text-primary)",
                          }}
                        >
                          {value || "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Explanation */}
                <div
                  className="p-4 rounded-xl text-sm leading-relaxed"
                  style={{ background: "rgba(34,197,94,0.06)", border: "1px solid var(--border)" }}
                >
                  <p className="font-medium gradient-text-green mb-1 text-xs">AI Explanation</p>
                  <FormattedText text={result.explanation} />
                </div>

                {/* Symptoms */}
                {result.symptoms.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Symptoms</p>
                    <ul className="space-y-1">
                      {result.symptoms.map((s) => (
                        <li key={s} className="text-sm flex items-start gap-2" style={{ color: "var(--text-muted)" }}>
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#f97316" }} />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Management */}
                {result.management.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Recommended Actions</p>
                    <ul className="space-y-1">
                      {result.management.map((m, i) => (
                        <li key={i} className="text-sm flex items-start gap-2" style={{ color: "var(--text-muted)" }}>
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-bold"
                            style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", marginTop: "1px" }}
                          >
                            {i + 1}
                          </span>
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Disclaimer */}
                <p className="text-xs p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.2)" }}>
                  ⚠️ This is an AI estimate, not a veterinary or agronomist diagnosis. Consult your local Krishi Vigyan Kendra for official guidance.
                </p>

                {/* Feedback */}
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Was this helpful?</span>
                  {(["helpful", "not_helpful"] as const).map((fb) => (
                    <button
                      key={fb}
                      id={`feedback-${fb}`}
                      onClick={() => setFeedback(fb)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{
                        background: feedback === fb ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${feedback === fb ? "var(--brand-500)" : "var(--border)"}`,
                        color: feedback === fb ? "#22c55e" : "var(--text-muted)",
                      }}
                    >
                      {fb === "helpful" ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
                      {fb === "helpful" ? <span key="yes">Yes</span> : <span key="no">No</span>}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageShell>
  );
}
