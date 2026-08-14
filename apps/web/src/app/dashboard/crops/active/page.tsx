"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sprout, Camera, Plus, Calendar, AlertCircle, Trash2, X, Upload } from "lucide-react";
import { PageHeader, PageShell } from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { cropApi } from "@/lib/api";
import { db, farmsCol, getDocs } from "@/lib/firebase";
import { CustomSelect } from "@/components/CustomSelect";
import Link from "next/link";

export default function ActiveCropsPage() {
  const { user } = useAuth();
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [activeCrops, setActiveCrops] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [newCrop, setNewCrop] = useState({ name: "", variety: "", plantedDate: "" });
  
  // Modal state
  const [stageModal, setStageModal] = useState<{isOpen: boolean, cropId: string, cropName: string}>({ isOpen: false, cropId: "", cropName: "" });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{stage: string, recommendation: string} | null>(null);
  const [manualStage, setManualStage] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDocs(farmsCol(user.uid)).then((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFarms(docs);
      if (docs.length > 0) setSelectedFarmId(docs[0].id);
    });
  }, [user]);

  const loadCrops = async (farmId: string) => {
    setIsLoading(true);
    try {
      const res = await cropApi.listCrops(farmId);
      // Filter for active crops
      setActiveCrops(res.data.filter((c: any) => c.status === "active" || !c.status));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFarmId) loadCrops(selectedFarmId);
  }, [selectedFarmId]);

  const handleAddCrop = async () => {
    if (!newCrop.name || !selectedFarmId) return;
    try {
      const payload: any = {
        crop_name: newCrop.name,
        stage: "vegetative"
      };
      if (newCrop.variety) payload.variety = newCrop.variety;
      if (newCrop.plantedDate) {
        payload.sowing_date = new Date(newCrop.plantedDate).toISOString().split('T')[0];
      }
      
      await cropApi.addCrop(selectedFarmId, payload);
      setIsAdding(false);
      setNewCrop({ name: "", variety: "", plantedDate: "" });
      loadCrops(selectedFarmId);
    } catch (err: any) {
      console.error(err.response?.data || err);
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail) ? JSON.stringify(detail) : (detail || "Failed to add crop");
      alert(msg);
    }
  };
  const handleDeleteCrop = async (cropId: string) => {
    if (!confirm("Are you sure you want to delete this crop?")) return;
    try {
      await cropApi.deleteCrop(selectedFarmId, cropId);
      loadCrops(selectedFarmId);
    } catch (err) {
      console.error(err);
      alert("Failed to delete crop");
    }
  };

  const handleUpdateStage = async () => {
    if (!manualStage && !analysisResult) return;
    const stage = analysisResult ? analysisResult.stage : manualStage;
    setIsUpdating(true);
    try {
      await cropApi.updateCrop(selectedFarmId, stageModal.cropId, { stage });
      setStageModal({ isOpen: false, cropId: "", cropName: "" });
      setAnalysisResult(null);
      setManualStage("");
      loadCrops(selectedFarmId);
    } catch (err) {
      console.error(err);
      alert("Failed to update stage");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCapturePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("image", file);
    
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await cropApi.analyzeCropStage(selectedFarmId, stageModal.cropId, formData);
      setAnalysisResult({
        stage: res.data.stage,
        recommendation: res.data.recommendation
      });
      loadCrops(selectedFarmId); // to update the stage shown on the card instantly
    } catch (err) {
      console.error(err);
      alert("Failed to analyze image");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <PageShell>
      <PageHeader title="Active Crops" subtitle="Track growth, upload images, and manage your current harvest" icon="🌱" />

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto min-w-[250px]">
           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">Farm:</label>
           <div className="w-full">
             <CustomSelect
                value={selectedFarmId}
                onChange={setSelectedFarmId}
                options={farms.map(f => ({ value: f.id, label: f.name }))}
             />
           </div>
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className="btn-primary flex items-center gap-2 px-5 py-2.5 w-full md:w-auto justify-center">
           <Plus size={18} /> Add Crop
        </button>
      </div>

      {isAdding && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass-card p-6 mb-8 border-l-4 border-green-500 shadow-sm">
           <h3 className="font-outfit font-bold text-lg mb-4 text-black dark:text-white">Log New Active Crop</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
             <div>
               <label className="block text-xs font-bold mb-1 text-gray-500 uppercase tracking-wider">Crop Name</label>
               <input type="text" className="input-field w-full text-sm font-medium" placeholder="e.g. Tomato" value={newCrop.name} onChange={e => setNewCrop({...newCrop, name: e.target.value})} />
             </div>
             <div>
               <label className="block text-xs font-bold mb-1 text-gray-500 uppercase tracking-wider">Variety (Optional)</label>
               <input type="text" className="input-field w-full text-sm font-medium" placeholder="e.g. Roma" value={newCrop.variety} onChange={e => setNewCrop({...newCrop, variety: e.target.value})} />
             </div>
             <div>
               <label className="block text-xs font-bold mb-1 text-gray-500 uppercase tracking-wider">Planted Date</label>
               <input type="date" className="input-field w-full text-sm font-medium" value={newCrop.plantedDate} onChange={e => setNewCrop({...newCrop, plantedDate: e.target.value})} />
             </div>
           </div>
           <div className="flex justify-end gap-3">
             <button onClick={() => setIsAdding(false)} className="px-5 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">Cancel</button>
             <button onClick={handleAddCrop} className="btn-primary px-6 py-2 shadow-md hover:shadow-lg">Save Crop</button>
           </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-green-500/20 border-t-green-500 animate-spin"></div>
          <div className="text-sm font-bold text-gray-500">Loading your crops...</div>
        </div>
      ) : activeCrops.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center px-4 shadow-sm border border-dashed border-gray-300 dark:border-gray-700">
           <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-5">
             <Sprout size={36} className="text-green-500" />
           </div>
           <h3 className="font-outfit font-black text-2xl mb-2 text-black dark:text-white">No active crops</h3>
           <p className="text-gray-500 mb-8 max-w-sm font-medium leading-relaxed">Track your current harvest to receive timely disease alerts, irrigation tips, and growth insights.</p>
           <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center gap-2 px-6 py-3 shadow-md hover:shadow-lg">
             <Plus size={18} /> Log First Crop
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {activeCrops.map((crop, i) => (
             <motion.div key={crop.id || i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="glass-card overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all hover:border-green-500">
                <div className="h-36 bg-gradient-to-br from-green-500/10 to-green-500/5 relative flex items-center justify-center border-b border-green-500/10">
                   {crop.image_url ? (
                     <img src={crop.image_url} alt={crop.crop_name} className="w-full h-full object-cover" />
                   ) : (
                     <Sprout size={56} className="text-green-500/20 drop-shadow-sm" />
                   )}
                   <div className="absolute top-3 right-3 flex items-center gap-2">
                     <div className="bg-white/95 dark:bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm text-green-700 dark:text-green-400 border border-green-500/20">
                       {crop.stage || "Seedling"}
                     </div>
                     <button onClick={() => handleDeleteCrop(crop.id)} className="bg-white/95 dark:bg-black/80 backdrop-blur-md p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-500/20 transition-all">
                       <Trash2 size={14} />
                     </button>
                   </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                   <h3 className="font-outfit font-black text-2xl mb-0.5 capitalize text-black dark:text-white">{crop.crop_name}</h3>
                   <div className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-5">{crop.variety || "Standard Variety"}</div>
                   
                   <div className="flex items-center gap-3 text-xs font-bold text-gray-700 dark:text-gray-300 mb-6 bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/5 dark:border-white/5">
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                        <Calendar size={14} className="text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">Planted On</div>
                        <div className="text-sm">{crop.sowing_date ? new Date(crop.sowing_date).toLocaleDateString() : "Unknown"}</div>
                      </div>
                   </div>

                   <div className="mt-auto grid grid-cols-2 gap-3">
                      <Link href={`/dashboard/disease?crop=${crop.crop_name}`} className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 transition-all dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 border border-green-500/10 hover:border-green-500/30">
                        <Camera size={16} /> Scan Image
                      </Link>
                      <button onClick={() => setStageModal({isOpen: true, cropId: crop.id, cropName: crop.crop_name})} className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 border border-blue-500/10 hover:border-blue-500/30">
                        Update Stage
                      </button>
                   </div>
                </div>
             </motion.div>
           ))}
        </div>
      )}

      {/* Update Stage / Analyze Modal */}
      {stageModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-outfit font-black text-xl text-black dark:text-white">Update Stage: {stageModal.cropName}</h3>
              <button onClick={() => { setStageModal({isOpen: false, cropId: "", cropName: ""}); setAnalysisResult(null); setManualStage(""); }} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Option 1: AI Camera Capture */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Camera size={80} />
                </div>
                <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <Sprout size={18} /> Auto-Detect Stage
                </h4>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80 font-medium mb-4">
                  Take a photo of your crop. Our AI will analyze its current growth stage and provide tailored recommendations.
                </p>
                <div className="relative">
                  <input type="file" accept="image/*" capture="environment" onChange={handleCapturePhoto} disabled={isAnalyzing} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <button disabled={isAnalyzing} className="w-full btn-primary bg-blue-600 hover:bg-blue-700 border-blue-600 flex items-center justify-center gap-2 py-3 shadow-blue-500/20">
                    {isAnalyzing ? (
                      <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> Analyzing...</>
                    ) : (
                      <><Camera size={18} /> Capture Photo</>
                    )}
                  </button>
                </div>
              </div>

              {/* Analysis Result */}
              {analysisResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-2xl p-4">
                  <div className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Detected Stage</div>
                  <div className="font-black text-xl text-green-800 dark:text-green-300 capitalize mb-3">{analysisResult.stage}</div>
                  <div className="text-sm text-green-700 dark:text-green-400 bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-green-200 dark:border-green-900/50">
                    <span className="font-bold">Recommendation:</span> {analysisResult.recommendation}
                  </div>
                </motion.div>
              )}

              {/* Option 2: Manual Update */}
              {!analysisResult && (
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">OR MANUAL UPDATE</div>
                    <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
                  </div>
                  <CustomSelect
                    value={manualStage}
                    onChange={setManualStage}
                    options={[
                      { value: "land_preparation", label: "Land Preparation" },
                      { value: "sowing", label: "Sowing" },
                      { value: "germination", label: "Germination" },
                      { value: "vegetative", label: "Vegetative" },
                      { value: "flowering", label: "Flowering" },
                      { value: "fruiting", label: "Fruiting" },
                      { value: "maturity", label: "Maturity" },
                      { value: "harvest", label: "Harvest" },
                    ]}
                  />
                  <button onClick={handleUpdateStage} disabled={!manualStage || isUpdating} className="w-full mt-3 btn-secondary py-3 flex items-center justify-center gap-2">
                    {isUpdating ? (
                      <><div className="w-4 h-4 rounded-full border-2 border-blue-600/30 border-t-blue-600 animate-spin"></div> Saving...</>
                    ) : (
                      <><Upload size={18} /> Save Manual Stage</>
                    )}
                  </button>
                </div>
              )}
              
              {analysisResult && (
                <button onClick={() => { setStageModal({isOpen: false, cropId: "", cropName: ""}); setAnalysisResult(null); }} className="w-full btn-primary py-3">
                  Done
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </PageShell>
  );
}
