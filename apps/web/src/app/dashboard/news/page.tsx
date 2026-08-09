"use client";

import { useState } from "react";
import { Newspaper, ExternalLink, Calendar, Search, Loader2 } from "lucide-react";
import { newsApi, type Article } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/PageHeader";

// Mock news data
const MOCK_NEWS = [
  {
    title: "Monsoon expected to reach Odisha coast by June 15",
    source: "IMD Weather Bulletin",
    date: "2 hours ago",
    category: "Weather",
    excerpt: "The southwest monsoon is advancing steadily and is expected to cover most parts of Odisha within the next 48 hours. Farmers are advised to prepare fields for Kharif sowing."
  },
  {
    title: "Govt increases MSP for Paddy by ₹117 for 2024-25 season",
    source: "Ministry of Agriculture",
    date: "1 day ago",
    category: "Policy",
    excerpt: "The Cabinet Committee on Economic Affairs has approved the increase in the Minimum Support Prices (MSP) for all mandated Kharif crops for the marketing season 2024-25."
  },
  {
    title: "New pest resistant cotton variety released by ICAR",
    source: "ICAR News",
    date: "3 days ago",
    category: "Research",
    excerpt: "The Indian Council of Agricultural Research has developed a new high-yielding, pest-resistant variety of cotton suitable for central and southern zones."
  },
];

export default function NewsPage() {
  const [filter, setFilter] = useState("All");
  
  return (
    <PageShell>
      <PageHeader title="Agriculture News" subtitle="Latest farming trends, weather alerts, and market updates" icon="📰" />

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
         {["All", "Weather", "Policy", "Research", "Market"].map(cat => (
            <button
               key={cat}
               onClick={() => setFilter(cat)}
               className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === cat ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-transparent text-gray-400 border border-gray-700 hover:border-gray-500'}`}
            >
               {cat}
            </button>
         ))}
      </div>

      <div className="space-y-4">
         {MOCK_NEWS.filter(n => filter === "All" || n.category === filter).map((news, i) => (
            <div key={i} className="glass-card p-5 hover:border-green-500 transition-colors">
               <div className="flex items-center gap-3 mb-3">
                  <span className="badge badge-info">{news.category}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{news.date}</span>
               </div>
               
               <h3 className="font-outfit font-bold text-lg mb-2">{news.title}</h3>
               <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
                  {news.excerpt}
               </p>
               
               <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                     <Newspaper size={14} /> {news.source}
                  </div>
                  <button className="btn-ghost text-xs flex items-center gap-1">
                     Read Full <ExternalLink size={12} />
                  </button>
               </div>
            </div>
         ))}
      </div>
    </PageShell>
  );
}
