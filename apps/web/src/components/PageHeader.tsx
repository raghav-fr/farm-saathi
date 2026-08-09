import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: string;
}

/**
 * Shared page header used consistently across all dashboard sub-pages.
 * Provides a uniform title, subtitle and optional right-side action.
 */
export function PageHeader({ title, subtitle, action, icon }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6 pb-4 border-b" style={{ borderColor: "rgba(34,197,94,0.12)" }}>
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
            style={{ background: "rgba(34,197,94,0.1)" }}
          >
            {icon}
          </div>
        )}
        <div>
          <h1 className="font-outfit font-bold" style={{ fontSize: "1.35rem", color: "var(--text-primary)" }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/** Standard page wrapper used by all sub-pages */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-5 max-w-6xl mx-auto">
      {children}
    </div>
  );
}
