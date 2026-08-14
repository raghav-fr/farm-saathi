"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, MapPin, Search, AlertCircle, RefreshCw, SlidersHorizontal, Settings } from "lucide-react";
import { PageHeader, PageShell } from "@/components/PageHeader";
import { marketApi, weatherApi, farmApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function MarketPage() {
  const { profile } = useAuth();
  
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState(profile?.state || "");
  const [districtFilter, setDistrictFilter] = useState(profile?.district || "");
  const [isInferringLocation, setIsInferringLocation] = useState(false);

  // Auto-infer location if missing
  useEffect(() => {
    if (!profile?.state && !stateFilter && !isInferringLocation) {
      setIsInferringLocation(true);
      farmApi.list().then(res => {
        const farms = res.data;
        if (farms && farms.length > 0) {
          weatherApi.getFarmWeather(farms[0].id).then(wRes => {
            if (wRes.data?.location) {
              setStateFilter(wRes.data.location.region || "");
              setDistrictFilter(wRes.data.location.name || "");
            }
          }).catch(console.error).finally(() => setIsInferringLocation(false));
        } else {
          setIsInferringLocation(false);
        }
      }).catch(() => setIsInferringLocation(false));
    }
  }, [profile, stateFilter, isInferringLocation]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["marketRates", stateFilter, districtFilter],
    queryFn: async () => {
      const dFilter = districtFilter && districtFilter.toLowerCase() !== "current location" ? districtFilter : undefined;
      const res = await marketApi.getRates({
        state: stateFilter || undefined,
        district: dFilter,
        limit: 50,
      });
      return res.data;
    },
  });

  const records = data?.records || [];
  
  // Client-side search for commodity/market
  const filteredRecords = records.filter(r => 
    r.commodity.toLowerCase().includes(search.toLowerCase()) || 
    r.market.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell>
      <PageHeader title="Market Prices" subtitle="Real-time Mandi prices across India (data.gov.in)" icon="📈" />



      {isInferringLocation && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-500">
           <RefreshCw size={18} className="shrink-0 animate-spin" />
           <div className="text-sm font-medium">Locating your farm to find the nearest Mandi rates...</div>
        </motion.div>
      )}

      <div className="glass-card p-3 mb-6 flex flex-col md:flex-row gap-3 shadow-sm">
         <div className="flex-1 flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-xl px-4 focus-within:ring-2 focus-within:ring-green-500/50 transition-all">
           <Search size={18} style={{ color: "var(--text-muted)" }} />
           <input 
             type="text" 
             placeholder="Search crops or mandis..." 
             className="bg-transparent border-none outline-none flex-1 py-3 text-sm font-medium text-black dark:text-white"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
         </div>
         <div className="flex items-center gap-2">
           <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-xl px-3 focus-within:ring-2 focus-within:ring-green-500/50 transition-all">
             <SlidersHorizontal size={16} className="text-gray-400" />
             <input 
               type="text" 
               placeholder="State" 
               className="bg-transparent border-none outline-none py-3 text-sm font-medium text-black dark:text-white w-24 md:w-32"
               value={stateFilter}
               onChange={(e) => setStateFilter(e.target.value)}
             />
           </div>
           <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-xl px-3 focus-within:ring-2 focus-within:ring-green-500/50 transition-all">
             <input 
               type="text" 
               placeholder="District" 
               className="bg-transparent border-none outline-none py-3 text-sm font-medium text-black dark:text-white w-24 md:w-32"
               value={districtFilter}
               onChange={(e) => setDistrictFilter(e.target.value)}
             />
           </div>
           <button onClick={() => refetch()} className="btn-primary flex items-center justify-center w-12 h-11 shrink-0 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
             <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
           </button>
         </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-green-500/20 border-t-green-500 animate-spin"></div>
          <div className="text-sm font-bold text-gray-500">Fetching live mandi rates...</div>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500 bg-red-500/5 rounded-3xl border border-red-500/10">
          <AlertCircle size={32} />
          <div className="font-bold">Failed to load market data</div>
          <div className="text-sm opacity-80">The data.gov.in service might be down. Please try again later.</div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-20 text-gray-500 bg-black/5 dark:bg-white/5 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
          <div className="text-4xl mb-3">🏪</div>
          <div className="font-bold text-lg text-black dark:text-white">No market rates found</div>
          <div className="text-sm mt-1">Try adjusting your state or district filters.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
           {filteredRecords.map((item, i) => (
              <motion.div key={`${item.market}-${item.commodity}-${i}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="glass-card p-5 hover:border-green-500 transition-colors shadow-sm hover:shadow-md">
                 <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-outfit font-black text-lg leading-tight text-black dark:text-white">{item.commodity}</h3>
                      <p className="text-[10px] font-black tracking-widest uppercase mt-0.5" style={{ color: "var(--text-muted)" }}>{item.variety || "Common"}</p>
                    </div>
                 </div>

                 <div className="flex items-baseline gap-1.5 mb-3">
                    <span className="text-3xl font-black gradient-text-green">₹{item.modal_price}</span>
                    <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>/ Qtl</span>
                 </div>
                 
                 <div className="flex justify-between items-center mb-4 text-[11px] font-bold px-3 py-2 rounded-xl bg-green-500/10 text-green-800 dark:text-green-400">
                    <span>Min: ₹{item.min_price}</span>
                    <span className="opacity-40">|</span>
                    <span>Max: ₹{item.max_price}</span>
                 </div>

                 <div className="flex flex-col gap-2.5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-start gap-2.5 text-xs font-bold text-black dark:text-white">
                       <div className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0 mt-0.5">
                         <MapPin size={12} className="text-green-600 dark:text-green-400" /> 
                       </div>
                       <div>
                         <div className="text-sm">{item.market}</div>
                         <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mt-0.5">{item.district}, {item.state}</div>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold mt-1" style={{ color: "var(--text-muted)" }}>
                       <Clock size={12} /> Reported: {item.arrival_date}
                    </div>
                 </div>
              </motion.div>
           ))}
        </div>
      )}
    </PageShell>
  );
}
