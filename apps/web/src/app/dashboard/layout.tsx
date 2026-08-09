"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Sprout, Camera, CloudRain,
  TrendingUp, Shield, Newspaper, MessageSquare,
  Bell, Settings, LogOut, Search, Menu, X
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/crops", icon: Sprout, label: "Crops" },
  { href: "/dashboard/weather", icon: CloudRain, label: "Weather" },
  { href: "/dashboard/market", icon: TrendingUp, label: "Market" },
  { href: "/dashboard/disease", icon: Camera, label: "Disease" },
  { href: "/dashboard/schemes", icon: Shield, label: "Schemes" },
  { href: "/dashboard/news", icon: Newspaper, label: "News" },
  { href: "/dashboard/chat", icon: MessageSquare, label: "Ask AI" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse-glow"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
          >
            <Sprout size={24} color="white" />
          </div>
          <p style={{ color: "var(--text-muted)" }} className="text-sm font-medium">Loading FarmSaathi...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const displayName = profile?.name?.split(" ")[0] || user.displayName?.split(" ")[0] || "Farmer";
  const initials = (profile?.name || user.displayName || "F").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>

      {/* ── Sticky Top Navigation ─────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 transition-all duration-200"
        style={{
          background: "var(--bg-primary)",
          borderBottom: scrolled ? "1px solid rgba(34,197,94,0.15)" : "1px solid transparent",
          boxShadow: scrolled ? "0 2px 12px rgba(0,0,0,0.05)" : "none",
        }}
      >
        <div className="flex items-center justify-between px-6 py-3 max-w-screen-2xl mx-auto">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
            >
              <Sprout size={18} color="white" />
            </div>
            <span className="font-outfit font-bold text-[17px]" style={{ color: "var(--text-primary)" }}>
              Farm<span style={{ color: "#16a34a" }}>Saathi</span>
              <span
                className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md align-middle"
                style={{ background: "#a3e635", color: "#1a2e05" }}
              >
                AI
              </span>
            </span>
          </Link>

          {/* Dark pill nav — desktop */}
          <nav className="top-nav hidden lg:flex">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`top-nav-link ${isActive ? "active" : ""}`}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Alerts */}
            <Link
              href="/dashboard/alerts"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(0,0,0,0.06)" }}
              title="Alerts"
            >
              <Bell size={16} style={{ color: "var(--text-muted)" }} />
            </Link>

            {/* Settings */}
            <Link
              href="/dashboard/settings"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(0,0,0,0.06)" }}
              title="Settings"
            >
              <Settings size={16} style={{ color: "var(--text-muted)" }} />
            </Link>

            {/* Profile dropdown */}
            <div className="relative group">
              <button
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all hover:shadow-md"
                style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.07)" }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
                >
                  {initials}
                </div>
                <span className="text-sm font-medium hidden sm:block" style={{ color: "var(--text-primary)" }}>
                  {displayName}
                </span>
              </button>

              {/* Dropdown */}
              <div
                className="absolute right-0 top-11 w-52 rounded-2xl shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"
                style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
              >
                <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                  <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {profile?.name || user.displayName}
                  </div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{user.email}</div>
                </div>
                <div className="py-1">
                  <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors" style={{ color: "var(--text-secondary)" }}>
                    <Settings size={14} /> Settings
                  </Link>
                  <Link href="/dashboard/chat" className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors" style={{ color: "var(--text-secondary)" }}>
                    <MessageSquare size={14} /> Ask AI
                  </Link>
                </div>
                <div className="border-t" style={{ borderColor: "rgba(0,0,0,0.05)" }} />
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(0,0,0,0.06)" }}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden lg:hidden border-t"
              style={{ borderColor: "rgba(34,197,94,0.12)" }}
            >
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {navItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
                      style={{
                        background: isActive ? "#111a12" : "rgba(255,255,255,0.8)",
                        color: isActive ? "#a3e635" : "var(--text-secondary)",
                      }}
                    >
                      <item.icon size={14} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Page Content ─────────────────────────────────────────────── */}
      <main className="flex-1">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-full max-w-screen-2xl mx-auto"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
