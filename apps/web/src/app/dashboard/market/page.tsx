"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Clock, MapPin, Search, AlertCircle } from "lucide-react";
import { PageHeader, PageShell } from "@/components/PageHeader";

const DEMO_MARKET_DATA = [
  { crop: "Tomato", mandi: "APMC Bhubaneswar", price: "₹2400", unit: "Qtl", trend: "up", change: "+120", date: "Today" },
  { crop: "Potato", mandi: "APMC Cuttack", price: "₹1850", unit: "Qtl", trend: "down", change: "-50", date: "Today" },
  { crop: "Onion", mandi: "APMC Bhubaneswar", price: "₹3200", unit: "Qtl", trend: "up", change: "+200", date: "Today" },
  { crop: "Paddy (Common)", mandi: "Bargarh", price: "₹2183", unit: "Qtl", trend: "flat", change: "MSP", date: "Yesterday" },
  { crop: "Maize", mandi: "Nabarangpur", price: "₹2090", unit: "Qtl", trend: "up", change: "+40", date: "Today" },
];

export default function MarketPage() {
  return (
    <PageShell>
      <PageHeader title="Market Prices" subtitle="Current Mandi prices and market trends (Demo Mode)" icon="📈" />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "#93c5fd" }}>
         <AlertCircle size={18} />
         <div className="text-sm">Real-time AgMarkNet integration is scheduled for Phase 12. Currently showing simulated local market data.</div>
      </motion.div>

      <div className="glass-card p-2 mb-6 flex items-center gap-2">
         <Search size={18} className="ml-3" style={{ color: "var(--text-muted)" }} />
         <input type="text" placeholder="Search crops or mandis..." className="bg-transparent border-none outline-none flex-1 py-2 text-sm" style={{ color: "var(--text-primary)" }} />
         <button className="btn-primary text-xs py-1.5 px-4 mr-1">Search</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {DEMO_MARKET_DATA.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-5 hover:border-green-500 transition-colors">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="font-outfit font-bold text-lg">{item.crop}</h3>
                  <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${item.trend === 'up' ? 'bg-green-500/20 text-green-400' : item.trend === 'down' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                     {item.trend === 'up' ? <TrendingUp size={12} /> : item.trend === 'down' ? <TrendingDown size={12} /> : null}
                     {item.change}
                  </div>
               </div>

               <div className="flex items-end gap-2 mb-4">
                  <span className="text-3xl font-black gradient-text-green">{item.price}</span>
                  <span className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>/ {item.unit}</span>
               </div>

               <div className="flex flex-col gap-2 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                     <MapPin size={12} /> {item.mandi}
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                     <Clock size={12} /> Updated: {item.date}
                  </div>
               </div>
            </motion.div>
         ))}
      </div>
    </PageShell>
  );
}
