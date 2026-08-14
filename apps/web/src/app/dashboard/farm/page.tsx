"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, MapPin, Droplets, Loader2, ArrowRight, Mountain, AlertCircle } from "lucide-react";
import { PageHeader, PageShell } from "@/components/PageHeader";
import { CustomSelect } from "@/components/CustomSelect";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db, farmsCol, getDocs } from "@/lib/firebase";
import { farmApi } from "@/lib/api";

export default function FarmPage() {
  const { user } = useAuth();
  const [farms, setFarms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingFarm, setEditingFarm] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDocs(farmsCol(user.uid)).then((snap) => {
      setFarms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    });
  }, [user]);

  const handleDeleteFarm = async (farmId: string, farmName: string) => {
    if (window.confirm(`Are you sure you want to delete ${farmName}? This action cannot be undone.`)) {
      try {
        await farmApi.delete(farmId);
        setFarms((prev) => prev.filter((f) => f.id !== farmId));
      } catch (err) {
        console.error("Failed to delete farm:", err);
        alert("Failed to delete farm. Please try again.");
      }
    }
  };

  const handleUpdateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFarm) return;
    setIsUpdating(true);
    try {
      await farmApi.update(editingFarm.id, {
        name: editingFarm.name,
        area_hectares: Number(editingFarm.area_hectares),
        soil_type: editingFarm.soil_type,
        has_irrigation: editingFarm.has_irrigation,
        irrigation_type: editingFarm.has_irrigation ? editingFarm.irrigation_type : "rainfed"
      });
      setFarms((prev) => prev.map((f) => f.id === editingFarm.id ? editingFarm : f));
      setEditingFarm(null);
    } catch (err) {
      console.error("Failed to update farm:", err);
      alert("Failed to update farm details.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <PageShell>
      <PageHeader 
        title="My Farms" 
        subtitle="Manage your agricultural plots and land profiles" 
        icon="🏡"
        action={
          <Link href="/dashboard/farm/new" className="btn-primary py-2 px-4 flex items-center gap-2 text-sm">
            <Plus size={16} /> Add New Farm
          </Link>
        }
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin mb-4" style={{ color: "var(--brand-500)" }} />
          <p style={{ color: "var(--text-muted)" }}>Loading your farms...</p>
        </div>
      ) : farms.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(34,197,94,0.1)" }}>
             <MapPin size={32} style={{ color: "var(--brand-500)" }} />
          </div>
          <h3 className="font-outfit font-semibold text-lg mb-2">No farms added yet</h3>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
             Add your first farm to unlock personalized crop and weather recommendations.
          </p>
          <Link href="/dashboard/farm/new" className="btn-primary">
            Add Your Farm
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {farms.map((farm, i) => (
             <motion.div key={farm.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card overflow-hidden">
                <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                         <Mountain size={24} color="white" />
                      </div>
                      <div>
                         <h2 className="font-outfit font-bold text-xl">{farm.name}</h2>
                         <div className="flex items-center gap-2 text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                            <MapPin size={12} /> {farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)}
                         </div>
                      </div>
                   </div>
                   <div className="flex gap-2">
                       <button onClick={() => setEditingFarm(farm)} className="btn-ghost text-xs"><Edit2 size={14} /> Edit</button>
                       <button 
                         onClick={() => handleDeleteFarm(farm.id, farm.name)}
                         className="btn-ghost text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                       >
                         <Trash2 size={14} /> Delete
                       </button>
                    </div>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-4">
                      <div>
                         <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Area</div>
                         <div className="text-lg font-medium">{farm.area_hectares} Hectares</div>
                      </div>
                      <div>
                         <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Soil Type</div>
                         <div className="text-lg font-medium">{farm.soil_type}</div>
                      </div>
                      <div>
                         <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Irrigation Status</div>
                         <div className="flex items-center gap-2 text-lg font-medium text-green-400">
                            <Droplets size={18} /> {farm.has_irrigation ? farm.irrigation_type : "Rainfed"}
                         </div>
                      </div>
                   </div>

                   <div className="md:col-span-2">
                      <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                         <div className="p-3 rounded-full" style={{ background: "rgba(245,158,11,0.2)" }}>
                            <AlertCircle size={24} color="#facc15" />
                         </div>
                         <div>
                            <h4 className="font-semibold text-sm" style={{ color: "#fcd34d" }}>No Soil Test Record Found</h4>
                            <p className="text-xs mt-1" style={{ color: "rgba(252,211,77,0.8)" }}>Add a recent NPK / pH soil test report to get highly accurate ML crop recommendations.</p>
                            <button className="btn-secondary mt-3 text-xs py-1.5 border-amber-500 text-amber-500 hover:bg-amber-500/10">Add Soil Test</button>
                         </div>
                      </div>
                   </div>
                </div>
             </motion.div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingFarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card w-full max-w-md p-6">
            <h3 className="font-outfit font-bold text-xl mb-4">Edit Farm Details</h3>
            <form onSubmit={handleUpdateFarm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-500 uppercase">Farm Name</label>
                <input type="text" required className="input-field py-2 text-sm" value={editingFarm.name} onChange={e => setEditingFarm({...editingFarm, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-500 uppercase">Area (Hectares)</label>
                <input type="number" step="0.1" required className="input-field py-2 text-sm" value={editingFarm.area_hectares} onChange={e => setEditingFarm({...editingFarm, area_hectares: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-500 uppercase">Soil Type</label>
                <CustomSelect
                  value={editingFarm.soil_type}
                  onChange={v => setEditingFarm({...editingFarm, soil_type: v})}
                  options={[
                    { value: "clay", label: "Clay" },
                    { value: "sandy", label: "Sandy" },
                    { value: "loamy", label: "Loamy" },
                    { value: "silty", label: "Silty" },
                    { value: "black", label: "Black" },
                    { value: "red", label: "Red" },
                    { value: "laterite", label: "Laterite" },
                    { value: "unknown", label: "Unknown" },
                  ]}
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={editingFarm.has_irrigation} onChange={e => setEditingFarm({...editingFarm, has_irrigation: e.target.checked})} />
                <label className="text-sm font-bold">Has Irrigation</label>
              </div>
              {editingFarm.has_irrigation && (
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-500 uppercase">Irrigation Type</label>
                  <CustomSelect
                    value={editingFarm.irrigation_type}
                    onChange={v => setEditingFarm({...editingFarm, irrigation_type: v})}
                    options={[
                      { value: "drip", label: "Drip" },
                      { value: "sprinkler", label: "Sprinkler" },
                      { value: "canal", label: "Canal" },
                      { value: "borewell", label: "Borewell" },
                      { value: "pond", label: "Pond" },
                      { value: "rainfed", label: "Other" },
                    ]}
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setEditingFarm(null)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">Cancel</button>
                <button type="submit" disabled={isUpdating} className="btn-primary py-2 px-6 text-sm">{isUpdating ? <span key="saving">Saving...</span> : <span key="save">Save Changes</span>}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </PageShell>
  );
}
