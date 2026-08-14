"use client";

import { motion } from "framer-motion";
import { Shield, CheckCircle, XCircle, Info, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import SCHEMES_DATA from "@/data/schemes.json";
import { PageHeader, PageShell } from "@/components/PageHeader";

export default function SchemesPage() {
  const { profile } = useAuth();
  
  // Basic mock eligibility logic (will be replaced by backend API in Phase 12)
  const schemes = SCHEMES_DATA.map(scheme => {
     let eligible = true;
     let reason = "Based on your profile, you appear to meet the basic criteria.";
     
     if (scheme.id === "pm_kisan" && !profile?.onboardingComplete) {
        reason = "Please complete your farm setup to check land ownership eligibility.";
     }
     
     return { ...scheme, eligible, reason };
  });

  return (
    <PageShell>
      <PageHeader title="Government Schemes" subtitle="Discover agricultural schemes and check your eligibility" icon="🏛️" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {schemes.map((scheme, i) => (
            <motion.div key={scheme.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card flex flex-col hover:border-green-500 transition-colors">
               
               {/* Header */}
               <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-start justify-between mb-2">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(244,114,182,0.1)" }}>
                           <Shield size={20} color="#f472b6" />
                        </div>
                        <h3 className="font-outfit font-bold text-lg">{scheme.name}</h3>
                     </div>
                     <div className={`badge ${scheme.eligible ? 'badge-success' : 'badge-warning'}`}>
                        {scheme.eligible ? <CheckCircle size={12} /> : <Info size={12} />}
                        {scheme.eligible ? <span key="elig">Eligible</span> : <span key="check">Check details</span>}
                     </div>
                  </div>
                  <div className="text-sm mt-3" style={{ color: "var(--text-primary)" }}>
                     <span className="font-semibold" style={{ color: "var(--brand-400)" }}>Benefit: </span>
                     {scheme.benefit}
                  </div>
               </div>

               {/* Details */}
               <div className="p-5 flex-1 space-y-4">
                  <div>
                     <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Eligibility Status</div>
                     <p className="text-sm text-gray-300">{scheme.reason}</p>
                  </div>
                  
                  <div>
                     <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Required Documents</div>
                     <ul className="text-sm space-y-1" style={{ color: "var(--text-muted)" }}>
                        {scheme.documents_required.map(doc => (
                           <li key={doc}>• {doc}</li>
                        ))}
                     </ul>
                  </div>
                  
                  <div>
                     <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>How to apply</div>
                     <p className="text-sm text-gray-300">{scheme.application_method}</p>
                  </div>
               </div>
               
               {/* Footer */}
               <div className="p-4 mt-auto border-t" style={{ borderColor: "var(--border)" }}>
                  <a href={scheme.official_url} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full text-sm py-2 flex items-center justify-center gap-2">
                     Visit Official Portal <ExternalLink size={14} />
                  </a>
               </div>
            </motion.div>
         ))}
      </div>
    </PageShell>
  );
}
