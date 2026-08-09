"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";

import {
  Leaf, Brain, CloudRain, TrendingUp, Shield, Globe,
  Camera, MessageSquare, ChevronRight, Sprout, Zap
} from "lucide-react";

const features = [
  {
    icon: Leaf,
    title: "AI Crop Recommendation",
    desc: "XGBoost + composite scoring across soil, weather, season & irrigation — not just ML probability",
    color: "#22c55e",
  },
  {
    icon: Camera,
    title: "Disease Detection",
    desc: "Upload a leaf photo for instant EfficientNet-powered diagnosis with 70%+ confidence gating",
    color: "#86efac",
  },
  {
    icon: CloudRain,
    title: "Weather Intelligence",
    desc: "7-day forecasts with AI-generated crop-specific agricultural advisories",
    color: "#38bdf8",
  },
  {
    icon: TrendingUp,
    title: "Market Intelligence",
    desc: "Real-time mandi prices, 7-day trends, nearby market comparison",
    color: "#facc15",
  },
  {
    icon: Shield,
    title: "Government Schemes",
    desc: "Rule-based eligibility checker for PM-KISAN, PMFBY, KCC and state schemes",
    color: "#f472b6",
  },
  {
    icon: Globe,
    title: "Multilingual AI",
    desc: "Full support for English, Hindi & Odia — voice and text",
    color: "#a78bfa",
  },
  {
    icon: Brain,
    title: "Local LLM (Qwen3:4B)",
    desc: "Decisions made by deterministic ML; Qwen3 only explains and communicates",
    color: "#fb923c",
  },
  {
    icon: MessageSquare,
    title: "Conversational Chat",
    desc: "Context-aware chat that remembers your farm, crops and soil history",
    color: "#34d399",
  },
];

const stats = [
  { value: "22+", label: "Crop Types" },
  { value: "54K+", label: "Disease Images" },
  { value: "3", label: "Languages" },
  { value: "100%", label: "Privacy-first" },
];



const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as any },
  }),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
          >
            <Sprout size={16} color="white" />
          </div>
          <span className="font-outfit font-bold text-lg" style={{ color: "var(--text-primary)" }}>
            FarmSaathi <span className="gradient-text-green">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-sm">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary text-sm py-2 px-5">
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background orbs */}
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #22c55e, transparent 70%)", filter: "blur(80px)" }}
        />
        <div
          className="absolute top-40 right-1/4 w-[400px] h-[400px] rounded-full opacity-8 pointer-events-none"
          style={{ background: "radial-gradient(circle, #facc15, transparent 70%)", filter: "blur(100px)" }}
        />

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid var(--border-strong)" }}
          >
            <Zap size={14} color="#22c55e" />
            <span className="text-sm font-medium" style={{ color: "#86efac" }}>
              Built for Prasunethon · Powered by Qwen3:4B
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-outfit font-black mb-6 leading-tight"
          >
            Agricultural AI for{" "}
            <span className="gradient-text">Every Indian Farmer</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Crop recommendations, disease detection, soil intelligence, weather alerts,
            market prices and government schemes — in English, Hindi and Odia.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            <Link href="/register" className="btn-primary text-base px-8 py-4">
              Start for Free <ChevronRight size={18} />
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-4">
              Sign In
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-4 gap-6 mt-20 max-w-2xl mx-auto"
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-outfit font-black gradient-text-green">{s.value}</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features grid ──────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-outfit font-bold mb-4">
              Complete Agricultural Intelligence
            </h2>
            <p style={{ color: "var(--text-muted)" }} className="text-lg">
              ML models make decisions. The LLM explains them. Your data stays yours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="glass-card p-6"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}
                >
                  <f.icon size={20} color={f.color} />
                </div>
                <h3 className="font-outfit font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Architecture callout ────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12"
            style={{ border: "1px solid var(--border-strong)" }}
          >
            <div className="text-6xl mb-6">🌾</div>
            <h2 className="text-3xl font-outfit font-bold mb-4">
              The Right Architecture for Agriculture
            </h2>
            <p className="text-lg mb-8" style={{ color: "var(--text-muted)" }}>
              We never ask an LLM "which crop should I grow?" The LLM only converts verified ML outputs into farmer-friendly language.
            </p>
            <div
              className="rounded-xl p-6 text-left font-mono text-sm"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)" }}
            >
              <div style={{ color: "#86efac" }}>Farmer question</div>
              <div style={{ color: "var(--text-muted)" }}>↓ Intent classifier</div>
              <div style={{ color: "#86efac" }}>XGBoost / EfficientNet / Rules</div>
              <div style={{ color: "var(--text-muted)" }}>↓ Verified context</div>
              <div style={{ color: "#facc15" }}>Qwen3:4B (explanation only)</div>
              <div style={{ color: "var(--text-muted)" }}>↓ Safety check</div>
              <div style={{ color: "#86efac" }}>Farmer-friendly answer</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-outfit font-bold mb-4">
            Ready to grow smarter?
          </h2>
          <p className="mb-8" style={{ color: "var(--text-muted)" }}>
            Join farmers using AI to make better decisions every day.
          </p>
          <Link href="/register" className="btn-primary text-lg px-10 py-4">
            Create Free Account <ChevronRight size={20} />
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer
        className="py-8 px-6 text-center text-sm"
        style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
      >
        <span className="gradient-text-green font-semibold">FarmSaathi AI</span> — Built for Prasunethon · 
        Powered by Firebase · Qwen3:4B · XGBoost · EfficientNet
      </footer>
    </div>
  );
}
