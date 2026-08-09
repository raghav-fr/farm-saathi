"use client";

import { useState } from "react";
import { Loader2, User, MapPin, Globe, Save, Check } from "lucide-react";
import { PageHeader, PageShell } from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { farmerApi } from "@/lib/api";

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  
  const [name, setName] = useState(profile?.name || user?.displayName || "");
  const [language, setLanguage] = useState(profile?.language || "en");
  const [phone, setPhone] = useState(profile?.phone || "");
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");
    
    try {
      await farmerApi.updateMe({ name, language, phone });
      await refreshProfile();
      
      setMessage("Settings saved successfully!");
      setTimeout(() => {
         setMessage("");
         window.location.reload();
      }, 800);
    } catch (err) {
      setMessage("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader title="Settings" subtitle="Manage your profile and preferences" icon="⚙️" />

      <div className="glass-card p-8">
        <form onSubmit={handleSave} className="space-y-8">
          
          <div className="flex items-center gap-5 pb-8 border-b" style={{ borderColor: "var(--border)" }}>
             <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                {name ? name[0].toUpperCase() : "F"}
             </div>
             <div>
                <div className="text-sm" style={{ color: "var(--text-muted)" }}>Email</div>
                <div className="font-medium">{user?.email}</div>
             </div>
          </div>

          <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                   <User size={16} /> Full Name
                </label>
                <input
                   type="text"
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="input-field"
                />
             </div>
             
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                   <User size={16} /> Phone Number (Optional)
                </label>
                <input
                   type="tel"
                   value={phone}
                   onChange={(e) => setPhone(e.target.value)}
                   placeholder="+91"
                   className="input-field"
                />
             </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                   <Globe size={16} /> App Language
                </label>
                <select
                   value={language}
                   onChange={(e) => setLanguage(e.target.value)}
                   className="input-field"
                >
                   <option value="en">English</option>
                   <option value="hi">हिंदी (Hindi)</option>
                   <option value="od">ଓଡ଼ିଆ (Odia)</option>
                </select>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                   This language will be used for AI explanations, chat, and app UI.
                </p>
             </div>
          </div>

          {message && (
             <div className={`p-3 rounded-xl text-sm ${message.includes('success') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {message}
             </div>
          )}

          <button
             type="submit"
             disabled={isSaving}
             className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
             <Loader2 size={16} className={`animate-spin ${isSaving ? '' : 'hidden'}`} />
             <Save size={16} className={isSaving ? 'hidden' : ''} />
             <span>Save Changes</span>
          </button>
        </form>
      </div>
    </PageShell>
  );
}
