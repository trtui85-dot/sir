"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { X } from "lucide-react";

/* ---------- Toasts ---------- */

type Toast = { id: number; msg: string; kind: "info" | "success" | "error" };
const ToastCtx = createContext<(msg: string, kind?: Toast["kind"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((msg: string, kind: Toast["kind"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack no-print">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop no-print" onClick={onClose}>
      <div
        className="modal-panel"
        style={{ maxWidth: wide ? 860 : 560 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-[var(--surface)] z-10 rounded-t-[20px]">
          <h3 className="font-bold text-base">{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="close">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Badge ---------- */

const badgeTones = ["blue", "green", "orange", "red", "gray"] as const;
export function Badge({ tone = "gray", children }: { tone?: (typeof badgeTones)[number]; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: (typeof badgeTones)[number]; label: string }> = {
    PENDING_CONFIRMATION: { tone: "orange", label: "En attente" },
    CONFIRMED: { tone: "blue", label: "Confirmé" },
    IN_WAITING_ROOM: { tone: "orange", label: "Salle d'attente" },
    IN_TREATMENT: { tone: "blue", label: "En traitement" },
    COMPLETED: { tone: "green", label: "Terminé" },
    CANCELLED: { tone: "red", label: "Annulé" },
    NO_SHOW: { tone: "gray", label: "Absent" },
    PAID: { tone: "green", label: "Payé" },
    PARTIAL: { tone: "orange", label: "Partiel" },
    UNPAID: { tone: "red", label: "Impayé" },
    VOID: { tone: "gray", label: "Annulé" },
    ACTIVE: { tone: "green", label: "Actif" },
    INACTIVE: { tone: "gray", label: "Inactif" },
    IN_PROGRESS: { tone: "blue", label: "En cours" },
  };
  const v = map[status] ?? { tone: "gray" as const, label: status };
  return <Badge tone={v.tone}>{v.label}</Badge>;
}

/* ---------- Empty state ---------- */

export function Empty({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      {icon && <div className="text-[var(--muted)] opacity-50">{icon}</div>}
      <p className="text-sm text-[var(--muted)]">{text}</p>
    </div>
  );
}

/* ---------- Page header ---------- */

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--muted)] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Field ---------- */

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

/* ---------- API helper ---------- */

export async function api<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}
