"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { newsApi } from "@/lib/api";
import {
  LayoutDashboard, Sprout, Camera, CloudRain,
  TrendingUp, Shield, Newspaper, MessageSquare,
  Bell, Settings, LogOut, Search, Menu, X, User
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
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user) {
      queryClient.prefetchQuery({
        queryKey: ["news"],
        queryFn: async () => {
          const { data } = await newsApi.getNews();
          return data;
        },
        staleTime: 10 * 60 * 1000, // 10 mins
      });
    }
  }, [user, queryClient]);

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
      <header className="sticky top-0 z-50">
        <div className="flex items-start justify-between max-w-screen-2xl mx-auto px-6">
          
          {/* Logo (Left) */}
          <Link href="/dashboard" className="flex items-center gap-2.5 mt-6 flex-shrink-0 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
            >
              <Sprout size={18} color="white" />
            </div>
            <span className="font-outfit font-bold text-[17px] text-black tracking-tight">
              Farm<span style={{ color: "#16a34a" }}>Saathi</span>
              <span
                className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md align-middle"
                style={{ background: "#a3e635", color: "#1a2e05" }}
              >
                AI
              </span>
            </span>
          </Link>

          {/* Center Black Nav */}
          <nav className="hidden lg:flex items-center gap-2 px-8 py-3 bg-black rounded-b-[2.5rem] shadow-lg relative -top-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${
                    isActive ? "bg-[#c3f53c] text-black" : "text-gray-300 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3 mt-6">
            <Link href="/dashboard/alerts" className="relative w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-black hover:bg-gray-50 transition-colors">
              <Bell size={18} strokeWidth={2.5} />
              <span className="absolute top-2 right-2 w-[9px] h-[9px] bg-red-500 rounded-full border-[1.5px] border-white"></span>
            </Link>
            
            <div className="relative group">
              <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-black hover:bg-gray-50 transition-colors">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
                >
                  {initials}
                </div>
              </button>
              
              {/* Dropdown */}
              <div className="absolute right-0 top-12 w-52 rounded-2xl shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 bg-white border border-gray-100">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-900">{profile?.name || user.displayName}</div>
                  <div className="text-xs mt-0.5 truncate text-gray-500">{user.email}</div>
                </div>
                <div className="py-1">
                  <Link href="/dashboard/farm" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Sprout size={14} /> My Farms
                  </Link>
                  <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Settings size={14} /> Settings
                  </Link>
                </div>
                <div className="border-t border-gray-100" />
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
              className="lg:hidden w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-black"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
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
              className="overflow-hidden lg:hidden bg-black mx-4 mt-4 rounded-2xl"
            >
              <div className="px-4 py-3 flex flex-col gap-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive ? "bg-[#c3f53c] text-black" : "text-white"
                      }`}
                    >
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
