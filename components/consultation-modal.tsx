"use client";

import { useEffect, useState } from "react";
import { ToothChart, TOOTH_CONDITIONS } from "@/components/tooth-chart";
import { printPrescription } from "@/components/patient-profile";
import { api, Modal, useToast } from "@/components/ui";
import { formatMoney, useLanguage } from "@/lib/i18n";
import { Sparkles, Pill, CheckCircle2, Stethoscope } from "lucide-react";

type Booking = {
  id: string;
  patientId: string;
  patient: { id: string; name: string };
};

export function ConsultationModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { t, lang } = useLanguage();
  const toast = useToast();
  const [services, setServices] = useState<{ id: string; name: string; price: number; toothChart: boolean; emoji: string | null }[]>([]);
  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>({});
  const [customLabel, setCustomLabel] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [showChart, setShowChart] = useState(false);
  const [teeth, setTeeth] = useState<number[]>([]);
  const [rawNotes, setRawNotes] = useState("");
  const [aiNotes, setAiNotes] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [freeVisit, setFreeVisit] = useState(false);
  const [rxOpen, setRxOpen] = useState(false);
  const [rxText, setRxText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ services: typeof services }>("/api/services").then((d) => setServices(d.services)).catch(() => {});
  }, []);

  const total =
    services.filter((s) => selectedServices[s.id]).reduce((sum, s) => sum + s.price, 0) +
    (customPrice ? Number(customPrice) : 0);

  async function cleanWithAI() {
    if (!rawNotes.trim()) return;
    setAiBusy(true);
    try {
      const d = await api<{ cleaned: string; source: string }>("/api/ai/clean-notes", {
        method: "POST",
        body: JSON.stringify({ text: rawNotes }),
      });
      setAiNotes(d.cleaned);
      toast("✨ IA", "success");
    } catch {
      toast(t("error_occurred"), "error");
    } finally {
      setAiBusy(false);
    }
  }

  const anyToothChartService = Object.keys(selectedServices).some(
    (id) => services.find((s) => s.id === id)?.toothChart
  );

  async function saveAndFinish() {
    const list = [
      ...services.filter((s) => selectedServices[s.id]).map((s) => ({ label: s.name, price: s.price })),
      ...(customLabel.trim() ? [{ label: customLabel.trim(), price: Number(customPrice) || 0 }] : []),
    ];
    if (list.length === 0) {
      toast(t("choose_service"), "error");
      return;
    }
    setBusy(true);
    try {
      await api("/api/visits", {
        method: "POST",
        body: JSON.stringify({
          patientId: booking.patientId,
          bookingId: booking.id,
          services: list,
          teeth,
          rawNotes,
          aiNotes,
          finalNotes: aiNotes || rawNotes || null,
          freeVisit,
        }),
      });
      toast(t("visit_saved"), "success");
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function savePrescription(print: boolean) {
    if (!rxText.trim()) return;
    try {
      await api(`/api/patients/${booking.patientId}/records`, {
        method: "POST",
        body: JSON.stringify({ type: "prescription", content: rxText }),
      });
      toast(t("saved"), "success");
      if (print) printPrescription(booking.patient.name, rxText);
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  function toggleTooth(tooth: number) {
    setTeeth((prev) => (prev.includes(tooth) ? prev.filter((x) => x !== tooth) : [...prev, tooth]));
  }

  return (
    <Modal open onClose={onClose} title={`🦷 ${t("consultation_for")} ${booking.patient.name}`} wide>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <p className="label">{t("choose_service")}</p>
            <div className="grid sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1">
              {services.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center justify-between gap-1 border rounded-xl px-2.5 py-2 cursor-pointer transition ${
                    selectedServices[s.id]
                      ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[13px] font-medium leading-tight">
                    <input
                      type="checkbox"
                      checked={!!selectedServices[s.id]}
                      onChange={(e) => {
                        setSelectedServices((m) => ({ ...m, [s.id]: e.target.checked }));
                        if (e.target.checked && s.toothChart) setShowChart(true);
                      }}
                    />
                    {s.emoji}
                    {s.name}
                  </span>
                  <span className="text-[11px] font-bold whitespace-nowrap">{formatMoney(s.price)}</span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_110px] gap-2 mt-2">
              <input
                className="input"
                placeholder={`${t("custom_services")}…`}
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
              <input
                className="input"
                type="number"
                placeholder="MRU"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
              />
            </div>
          </div>

          {(showChart || anyToothChartService) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="label !mb-0">
                  {t("affected_teeth")} {teeth.length > 0 && `(${teeth.length})`}
                </p>
                <span className="text-xs text-[var(--muted)]">{t("tap_teeth")}</span>
              </div>
              <div className="max-h-72 overflow-y-auto card-sir p-3 bg-[var(--bg)]">
                <ToothChart selected={teeth} onToggle={toggleTooth} />
                <details className="mt-4">
                  <summary className="text-xs font-bold text-[var(--primary)] cursor-pointer">🦷 {t("baby_teeth")}</summary>
                  <div className="mt-3">
                    <ToothChart baby selected={teeth} onToggle={toggleTooth} />
                  </div>
                </details>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {TOOTH_CONDITIONS.filter((c) => c.value !== "healthy").map((c) => (
                  <span key={c.value} className={`badge tooth-cond-${c.value} bg-transparent`} style={{ fontSize: "10px" }}>
                    {lang === "ar" ? c.ar : c.fr}
                  </span>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer w-fit">
            <input type="checkbox" checked={freeVisit} onChange={(e) => setFreeVisit(e.target.checked)} />
            🎁 {t("free_visit")}
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="label !mb-0">{t("raw_notes")}</p>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={aiBusy || !rawNotes.trim()}
                onClick={cleanWithAI}
              >
                <Sparkles size={14} /> {aiBusy ? t("loading") : t("ai_clean")}
              </button>
            </div>
            <textarea
              className="textarea"
              rows={5}
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder={`${t("raw_notes")} (FR / EN / AR)…`}
            />
          </div>

          {(aiNotes || aiBusy) && (
            <div>
              <p className="label flex items-center gap-1">
                <Sparkles size={12} /> {t("ai_suggestion")}
              </p>
              {aiBusy ? (
                <div className="rounded-xl bg-[var(--primary-soft)] p-4 text-sm text-[var(--primary)] animate-pulse">
                  {t("loading")}
                </div>
              ) : (
                <textarea className="textarea" rows={5} value={aiNotes} onChange={(e) => setAiNotes(e.target.value)} />
              )}
            </div>
          )}

          <div className="card-sir p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-sm flex items-center gap-1">
                <Pill size={15} /> {t("prescriptions")}
              </p>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setRxOpen(!rxOpen)}>
                {rxOpen ? "−" : "+"}
              </button>
            </div>
            {rxOpen && (
              <>
                <textarea
                  className="textarea"
                  rows={4}
                  value={rxText}
                  onChange={(e) => setRxText(e.target.value)}
                  placeholder="Amoxicilline 1g — 1 cp × 2/j — 6 jours…"
                />
                <div className="flex gap-2 mt-2">
                  <button type="button" className="btn btn-primary btn-sm flex-1" onClick={() => savePrescription(true)}>
                    <CheckCircle2 size={13} /> {t("save")}
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => savePrescription(false)}>
                    💾
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-between items-center bg-[var(--bg)] rounded-xl px-4 py-3">
            <span className="font-semibold">{t("total")}</span>
            <span className="font-extrabold text-lg">{freeVisit ? "🎁 Gratuit" : formatMoney(total)}</span>
          </div>

          <button className="btn btn-primary w-full py-3.5" disabled={busy} onClick={saveAndFinish}>
            <Stethoscope size={16} /> {busy ? t("loading") : t("save_finish_visit")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
