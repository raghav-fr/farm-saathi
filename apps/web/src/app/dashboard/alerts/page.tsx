"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Trash2, Loader2, AlertTriangle, CloudRain, Droplets } from "lucide-react";
import { alertApi, type Alert } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/PageHeader";

const ICON_MAP: Record<string, any> = {
  weather_alert: CloudRain,
  disease_alert: AlertTriangle,
  irrigation_alert: Droplets,
  default: Bell
};

export default function AlertsPage() {
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ["alerts"],
    queryFn: () => alertApi.list().then(r => r.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => alertApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => alertApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  return (
    <PageShell>
      <PageHeader 
        title="Alerts & Notifications" 
        subtitle="Important updates about your farm and crops" 
        icon="🔔"
        action={
          alerts.some(a => !a.read) ? (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: "rgba(34,197,94,0.1)", color: "#16a34a" }}
            >
              <Check size={14} /> Mark all as read
            </button>
          ) : undefined
        }
      />

      {isLoading ? (
         <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-green-500" />
         </div>
      ) : alerts.length === 0 ? (
         <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.05)" }}>
               <Bell size={28} style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="font-medium" style={{ color: "var(--text-primary)" }}>You're all caught up!</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No new alerts at this time.</p>
         </div>
      ) : (
         <div className="space-y-3">
            {alerts.map(alert => {
               const Icon = ICON_MAP[alert.type] || ICON_MAP.default;
               const isUnread = !alert.read;
               
               return (
                  <div key={alert.id} className={`glass-card p-4 flex gap-4 transition-colors ${isUnread ? 'border-l-4' : 'opacity-70'}`} style={{ borderLeftColor: isUnread ? "var(--brand-500)" : "transparent" }}>
                     <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isUnread ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)" }}>
                        <Icon size={18} style={{ color: isUnread ? "var(--brand-400)" : "var(--text-muted)" }} />
                     </div>
                     <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                           <h4 className="text-sm font-semibold" style={{ color: isUnread ? "var(--text-primary)" : "var(--text-muted)" }}>{alert.type.replace('_', ' ').toUpperCase()}</h4>
                           <span className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(alert.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: isUnread ? "var(--text-secondary)" : "var(--text-muted)" }}>{alert.message}</p>
                     </div>
                     
                     {isUnread && (
                        <button
                           onClick={() => markReadMutation.mutate(alert.id)}
                           className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-colors"
                           title="Mark as read"
                        >
                           <Check size={16} style={{ color: "var(--brand-400)" }} />
                        </button>
                     )}
                  </div>
               );
            })}
         </div>
      )}
    </PageShell>
  );
}
