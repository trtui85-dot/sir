"use client";

import { useCallback, useEffect, useState } from "react";
import { api, Badge, Field, PageHeader, useToast } from "@/components/ui";
import { useLanguage } from "@/lib/i18n";
import { Bot, Save } from "lucide-react";

type TemplateRow = { id: string; key: string; label: string; content: string; enabled: boolean };

type BotSettings = {
  reminder1Hours: number;
  reminder2Hours: number;
  cancelHours: number;
  adminPhones: string[];
  whatsappConnected: boolean;
};

export function BotflowTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [settings, setSettings] = useState<BotSettings | null>(null);

  const load = useCallback(async () => {
    try {
      const [tpl, st] = await Promise.all([
        api<{ templates: TemplateRow[] }>("/api/templates"),
        api<{ settings: BotSettings }>("/api/settings"),
      ]);
      setTemplates(tpl.templates);
      setSettings(st.settings);
    } catch {
      toast(t("error_occurred"), "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveTemplate(tpl: TemplateRow) {
    try {
      await api("/api/templates", { method: "PATCH", body: JSON.stringify({ key: tpl.key, content: tpl.content }) });
      toast(t("saved"), "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  async function saveSettings() {
    if (!settings) return;
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify(settings) });
      toast(t("saved"), "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  if (!settings) return <p className="text-center p-8 text-sm text-[var(--muted)]">{t("loading")}</p>;

  return (
    <div>
      <PageHeader
        title={t("bot_flow")}
        actions={<button className="btn btn-primary btn-sm" onClick={saveSettings}><Save size={14} /> {t("save")}</button>}
      />

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card-sir p-4 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2"><Bot size={16} /> Automatisations</h3>
          <Field label="Rappel principal (heures avant RDV)">
            <input
              type="number"
              className="input"
              value={settings.reminder1Hours}
              onChange={(e) => setSettings({ ...settings, reminder1Hours: Number(e.target.value) })}
            />
          </Field>
          <Field label="2e rappel (heures avant)">
            <input
              type="number"
              className="input"
              value={settings.reminder2Hours}
              onChange={(e) => setSettings({ ...settings, reminder2Hours: Number(e.target.value) })}
            />
          </Field>
          <Field label="Annulation autorisée jusqu'à (h avant)">
            <input
              type="number"
              className="input"
              value={settings.cancelHours}
              onChange={(e) => setSettings({ ...settings, cancelHours: Number(e.target.value) })}
            />
          </Field>
          <Field label="Téléphones admin (un par ligne)">
            <textarea
              className="textarea font-mono text-xs"
              rows={2}
              placeholder={"+222...\n+222..."}
              value={(settings.adminPhones ?? []).join("\n")}
              onChange={(e) =>
                setSettings({ ...settings, adminPhones: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })
              }
            />
          </Field>
          <label className="flex items-center justify-between text-sm cursor-pointer border border-[var(--border)] rounded-xl p-3">
            WhatsApp connecté
            <Badge tone={settings.whatsappConnected ? "green" : "gray"}>{settings.whatsappConnected ? "Oui" : "Non"}</Badge>
          </label>

          <div className="rounded-xl bg-[var(--primary-soft)] p-4 text-xs leading-relaxed text-[var(--primary)]">
            <p className="font-bold mb-1">Flux du bot :</p>
            <p>
              Bonjour → 1 Prendre RDV / 2 Mes rendez-vous / 3 Parler à un humain
              <br />
              RDV → choix du jour → heure proposée → confirmation (template booking_confirmation)
            </p>
          </div>
        </div>

        <div className="space-y-3 max-h-[70vh] overflow-y-auto pe-1">
          {templates.map((tpl) => (
            <div key={tpl.id} className="card-sir p-4">
              <p className="font-bold text-sm mb-2">{tpl.label}</p>
              <textarea
                className="textarea text-xs"
                rows={3}
                value={tpl.content}
                onChange={(e) =>
                  setTemplates((prev) => prev.map((x) => (x.id === tpl.id ? { ...x, content: e.target.value } : x)))
                }
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-mono text-[var(--muted)]">#{tpl.key}</span>
                <button className="btn btn-outline btn-sm" onClick={() => saveTemplate(tpl)}>
                  <Save size={12} /> {t("save")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
