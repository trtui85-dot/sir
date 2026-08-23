"use client";

import { useCallback, useEffect, useState } from "react";
import { api, Field, PageHeader, useToast } from "@/components/ui";
import { useLanguage } from "@/lib/i18n";
import { Save, ShieldAlert } from "lucide-react";

type ClinicSettings = {
  clinicName: string; headerTitle: string; headerPhone: string; headerAddress: string;
  refundPolicy: string; defaultLanguage: string; reportLanguage: string;
  whatsappPhone: string; primaryColor: string;
  childAgeLimit: number; reminder1Hours: number; reminder2Hours: number; cancelHours: number;
  whatsappConnected: boolean; aiEnabled: boolean; useLetterhead: boolean;
  adminPhones: string[];
};

export function SettingsTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [s, setS] = useState<ClinicSettings | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ settings: ClinicSettings }>("/api/settings");
      setS(d.settings);
    } catch {
      toast(t("error_occurred"), "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!s) return;
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify(s) });
      toast(t("saved"), "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  if (!s) return <p className="text-center p-8 text-sm text-[var(--muted)]">{t("loading")}</p>;

  return (
    <div>
      <PageHeader
        title={t("settings")}
        actions={<button className="btn btn-primary btn-sm" onClick={save}><Save size={14} /> {t("save")}</button>}
      />

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card-sir p-5 space-y-3">
          <h3 className="font-bold text-sm">🏥 Identité de la clinique</h3>
          <Field label="Nom de la clinique">
            <input className="input" value={s.clinicName ?? ""} onChange={(e) => setS({ ...s, clinicName: e.target.value })} />
          </Field>
          <Field label="Titre en-tête documents">
            <input className="input" value={s.headerTitle ?? ""} onChange={(e) => setS({ ...s, headerTitle: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Téléphone en-tête">
              <input className="input" value={s.headerPhone ?? ""} onChange={(e) => setS({ ...s, headerPhone: e.target.value })} />
            </Field>
            <Field label="Couleur principale">
              <input type="color" className="input h-11 p-1" value={s.primaryColor || "#5b5bf0"} onChange={(e) => setS({ ...s, primaryColor: e.target.value })} />
            </Field>
          </div>
          <Field label="Adresse en-tête">
            <textarea className="textarea text-xs" rows={2} value={s.headerAddress ?? ""} onChange={(e) => setS({ ...s, headerAddress: e.target.value })} />
          </Field>
          <Field label="Politique de remboursement / mentions">
            <textarea className="textarea text-xs" rows={2} value={s.refundPolicy ?? ""} onChange={(e) => setS({ ...s, refundPolicy: e.target.value })} />
          </Field>
          <label className="flex items-center justify-between text-sm cursor-pointer border border-[var(--border)] rounded-xl p-3">
            Utiliser le papier à en-tête (documents)
            <input type="checkbox" checked={!!s.useLetterhead} onChange={(e) => setS({ ...s, useLetterhead: e.target.checked })} />
          </label>
        </div>

        <div className="space-y-5">
          <div className="card-sir p-5 space-y-3">
            <h3 className="font-bold text-sm">⚙️ Règles cliniques</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Âge max dossier enfant">
                <input type="number" className="input" value={s.childAgeLimit ?? 12} onChange={(e) => setS({ ...s, childAgeLimit: Number(e.target.value) })} />
              </Field>
              <Field label="Langue des rapports">
                <select className="select" value={s.reportLanguage || "fr"} onChange={(e) => setS({ ...s, reportLanguage: e.target.value })}>
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </Field>
            </div>
            <label className="flex items-center justify-between text-sm cursor-pointer border border-[var(--border)] rounded-xl p-3">
              ✨ Assistant IA activé (nettoyage notes)
              <input type="checkbox" checked={!!s.aiEnabled} onChange={(e) => setS({ ...s, aiEnabled: e.target.checked })} />
            </label>
          </div>

          <div className="card-sir p-5 space-y-3">
            <h3 className="font-bold text-sm">💬 WhatsApp</h3>
            <Field label="Numéro WhatsApp de la clinique">
              <input className="input" placeholder="+222 ..." value={s.whatsappPhone ?? ""} onChange={(e) => setS({ ...s, whatsappPhone: e.target.value })} />
            </Field>
            <label className="flex items-center justify-between text-sm cursor-pointer border border-[var(--border)] rounded-xl p-3">
              Session connectée
              <input type="checkbox" checked={!!s.whatsappConnected} onChange={(e) => setS({ ...s, whatsappConnected: e.target.checked })} />
            </label>
            <p className="text-xs text-[var(--muted)]">
              La connexion réelle au device WhatsApp se fait côté serveur (session QR). Les rappels et confirmations utilisent ce numéro.
            </p>
          </div>

          <div className="card-sir p-5 space-y-3 !border-rose-300 dark:!border-rose-900">
            <h3 className="font-bold text-sm flex items-center gap-2 text-rose-500"><ShieldAlert size={16} /> Zone sensible</h3>
            <p className="text-xs text-[var(--muted)]">
              Les données patients sont confidentielles. Toute exportation doit respecter la politique de la clinique.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
