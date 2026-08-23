"use client";

import { useCallback, useEffect, useState } from "react";
import { api, Badge, Empty, Field, Modal, StatusBadge, useToast, PageHeader } from "@/components/ui";
import { useLanguage, formatMoney, formatDate, formatDateTime } from "@/lib/i18n";
import { ToothChart, TOOTH_CONDITIONS } from "@/components/tooth-chart";
import {
  ArrowLeft, FileText, Printer, Trash2, Plus, Wallet, CalendarDays,
  Pill, Activity, FolderOpen, Image as ImageIcon,
} from "lucide-react";

type FullPatient = {
  id: string;
  name: string;
  phone: string | null;
  age: number | null;
  gender: string | null;
  address: string | null;
  medicalBackground: string | null;
  status: string;
  internalNote: string | null;
  createdAt: string;
  visits: VisitT[];
  bookings: BookingT[];
  treatmentPlans: PlanT[];
  prescriptions: { id: string; content: string; createdBy: string | null; createdAt: string }[];
  medicalNotes: { id: string; content: string; createdAt: string }[];
  toothConditions: { tooth: number; condition: string; note: string | null }[];
  invoices: InvoiceT[];
  payments: PaymentT[];
  documents: DocT[];
};

type VisitT = {
  id: string; servicesJson: unknown; teeth: number[]; rawNotes: string | null; aiNotes: string | null;
  totalAmount: number; paidAmount: number; freeVisit: boolean; visitDate: string; doctor?: { name: string } | null;
};
type BookingT = {
  id: string; date: string; time: string | null; reason: string | null; status: string;
  source: string; secretaryNotes: string | null; doctor?: { name: string } | null;
};
type PlanT = {
  id: string; name: string; description: string | null; itemsJson: unknown; totalAmount: number;
  sessionsTotal: number; sessionsDone: number; sessionAmount: number; status: string; createdAt: string;
};
type InvoiceT = {
  id: string; number: number; itemsJson: unknown; subtotal: number; discountType: string;
  discountValue: number; total: number; paid: number; status: string; createdAt: string;
};
type PaymentT = {
  id: string; amount: number; method: string; note: string | null; voided: boolean;
  verified: boolean; screenshotUrl: string | null; createdAt: string; invoiceId: string | null;
};
type DocT = { id: string; title: string; url: string; mediaType: string; createdAt: string };

const TABS = ["info", "dental_chart", "treatments", "prescriptions", "finances", "visit_history", "documents"] as const;

export function PatientProfile({
  patientId,
  onBack,
  role,
}: {
  patientId: string;
  onBack: () => void;
  role: "OWNER" | "DOCTOR" | "SECRETARY";
}) {
  const { t, lang } = useLanguage();
  const toast = useToast();
  const [patient, setPatient] = useState<FullPatient | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("info");

  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [rxOpen, setRxOpen] = useState(false);
  const [rxText, setRxText] = useState("");
  const [toothEdits, setToothEdits] = useState<Record<number, string>>({});
  const [docOpen, setDocOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api<{ patient: FullPatient }>(`/api/patients/${patientId}`);
      setPatient(d.patient);
      const map: Record<number, string> = {};
      for (const c of d.patient.toothConditions) map[c.tooth] = c.condition;
      setToothEdits(map);
    } catch {
      toast("Impossible de charger le dossier patient", "error");
    }
  }, [patientId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!patient) return <p className="text-sm text-[var(--muted)] p-8 text-center">{t("loading")}</p>;

  const conditionsMap: Record<number, string> = {};
  for (const c of patient.toothConditions) conditionsMap[c.tooth] = c.condition;

  const billed = patient.invoices.filter((i) => i.status !== "VOID").reduce((s, i) => s + i.total, 0);
  const paid = patient.payments.filter((p) => !p.voided).reduce((s, p) => s + p.amount, 0);

  async function saveInfo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api(`/api/patients/${patientId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: f.get("name"),
          phone: f.get("phone"),
          age: f.get("age"),
          gender: f.get("gender"),
          address: f.get("address"),
          medicalBackground: f.get("medicalBackground"),
          internalNote: f.get("internalNote"),
        }),
      });
      toast(t("patient_updated"), "success");
      setEditInfoOpen(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  async function addNote() {
    if (!noteText.trim()) return;
    await api(`/api/patients/${patientId}/records`, { method: "POST", body: JSON.stringify({ type: "note", content: noteText }) });
    setNoteText("");
    toast(t("saved"), "success");
    load();
  }

  async function saveRx() {
    if (!rxText.trim()) return;
    await api(`/api/patients/${patientId}/records`, { method: "POST", body: JSON.stringify({ type: "prescription", content: rxText }) });
    setRxOpen(false);
    setRxText("");
    toast(t("saved"), "success");
    load();
  }

  async function saveTeeth() {
    const conditions = Object.entries(toothEdits).map(([tooth, condition]) => ({ tooth: Number(tooth), condition }));
    await api(`/api/patients/${patientId}/records`, { method: "POST", body: JSON.stringify({ type: "teeth", conditions }) });
    toast(t("conditions_saved"), "success");
    load();
  }

  async function deleteResource(resource: string, id: string) {
    await api(`/api/patients/${patientId}/records?resource=${resource}&id=${id}`, { method: "DELETE" });
    toast(t("delete") + " ✓", "success");
    load();
  }

  async function toggleStatus() {
    if (!patient) return;
    await api(`/api/patients/${patientId}?mode=${patient.status === "ACTIVE" ? "deactivate" : "reactivate"}`, { method: "DELETE" });
    load();
  }

  async function completeSession(planId: string) {
    await api(`/api/plans/${planId}`, { method: "PATCH", body: JSON.stringify({ action: "complete-session" }) });
    toast(t("session_marked"), "success");
    load();
  }

  function printReport() {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w || !patient) return;
    const visitsHtml = patient.visits
      .map(
        (v) => `<tr><td>${formatDate(v.visitDate)}</td><td>${servicesLabel(v.servicesJson)}</td>
        <td>${v.freeVisit ? "Gratuit" : formatMoney(v.totalAmount)}</td></tr>`
      )
      .join("");
    w.document.write(`<!DOCTYPE html><html dir="${lang === "ar" ? "rtl" : "ltr"}"><head><meta charset="utf-8">
      <title>${patient.name}</title><style>body{font-family:sans-serif;padding:32px;color:#111}
      h1{margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}
      td,th{border:1px solid #ddd;padding:8px;text-align:start;font-size:13px}</style></head><body>
      <h1>SIR — ${t("patient_file")}</h1>
      <p>${patient.name}${patient.age ? ` · ${patient.age} ans` : ""}${patient.phone ? ` · ${patient.phone}` : ""}</p>
      <h3>${t("medical_background")}</h3><p>${patient.medicalBackground ?? "—"}</p>
      <h3>${t("visit_history")}</h3><table><tr><th>${t("date")}</th><th>${t("treatments")}</th><th>${t("total")}</th></tr>${visitsHtml}</table>
      </body></html>`);
    w.document.close();
    w.print();
  }

  const tabIcons: Record<string, React.ReactNode> = {
    info: <FolderOpen size={15} />,
    dental_chart: <Activity size={15} />,
    treatments: <CalendarDays size={15} />,
    prescriptions: <Pill size={15} />,
    finances: <Wallet size={15} />,
    visit_history: <FileText size={15} />,
    documents: <ImageIcon size={15} />,
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button className="btn btn-outline btn-sm" onClick={onBack}>
          <ArrowLeft size={15} className="rtl-flip" />
          <span className="hidden sm:inline">{t("back")}</span>
        </button>
        <div className="flex-1 min-w-0">
          <PageHeader
            title={patient.name}
            subtitle={`${patient.age ? patient.age + " " + t("age") : ""}${patient.phone ? " · " + patient.phone : ""}`}
            actions={
              <>
                <StatusBadge status={patient.status} />
                <button className="btn btn-outline btn-sm" onClick={() => setEditInfoOpen(true)}>{t("edit")}</button>
                <button className="btn btn-outline btn-sm" onClick={toggleStatus}>
                  {patient.status === "ACTIVE" ? t("deactivate") : t("reactivate")}
                </button>
                <button className="btn btn-primary btn-sm" onClick={printReport}>
                  <Printer size={14} /> <span className="hidden sm:inline">{t("print")}</span>
                </button>
              </>
            }
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {TABS.map((k) => (
          <button
            key={k}
            className={`btn btn-sm shrink-0 ${tab === k ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab(k)}
          >
            {tabIcons[k]}
            {t(k)}
          </button>
        ))}
      </div>

      {/* INFO */}
      {tab === "info" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card-sir p-5">
            <h3 className="font-bold mb-3">{t("info")}</h3>
            <dl className="text-sm space-y-2">
              <Row label={t("phone")} value={patient.phone ?? "—"} ltr />
              <Row label={t("age")} value={patient.age ? `${patient.age}` : "—"} />
              <Row label="Sexe" value={patient.gender ?? "—"} />
              <Row label="Adresse" value={patient.address ?? "—"} />
              <Row label={t("last_visit")} value={patient.visits[0] ? formatDate(patient.visits[0].visitDate) : "—"} />
              <Row label={t("visits_count")} value={String(patient.visits.length)} />
            </dl>
          </div>
          <div className="card-sir p-5">
            <h3 className="font-bold mb-3">{t("medical_background")}</h3>
            <p className="text-sm whitespace-pre-wrap min-h-[60px] bg-[var(--bg)] rounded-xl p-3">
              {patient.medicalBackground || "—"}
            </p>
            <h3 className="font-bold mt-5 mb-2">{t("note")} ({t("internal")})</h3>
            <div className="flex gap-2">
              <input className="input" placeholder={t("notes")} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
              <button className="btn btn-primary btn-sm shrink-0" onClick={addNote}><Plus size={14} /></button>
            </div>
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {patient.medicalNotes.map((n) => (
                <div key={n.id} className="text-xs bg-[var(--bg)] rounded-xl p-3 flex justify-between gap-2">
                  <div>
                    <p className="whitespace-pre-wrap">{n.content}</p>
                    <p className="text-[var(--muted)] mt-1">{formatDateTime(n.createdAt)}</p>
                  </div>
                  <button className="text-[var(--danger)]" onClick={() => deleteResource("note", n.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DENTAL CHART */}
      {tab === "dental_chart" && (
        <div className="card-sir p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-xs text-[var(--muted)]">{t("tap_teeth")}</p>
            <button className="btn btn-primary btn-sm" onClick={saveTeeth}>{t("save_conditions")}</button>
          </div>
          <ToothChart
            selected={[]}
            conditions={Object.fromEntries(
              Object.entries(toothEdits).filter(([, v]) => v && v !== "healthy")
            ) as Record<number, string>}
            onToggle={(tooth) =>
              setToothEdits((m) => {
                const nextVal = nextCondition(m[tooth]);
                const copy = { ...m };
                if (!nextVal || nextVal === "healthy") delete copy[tooth];
                else copy[tooth] = nextVal;
                return copy;
              })
            }
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-6 justify-center">
            {TOOTH_CONDITIONS.filter((c) => c.value !== "healthy").map((c) => (
              <span key={c.value} className={`badge tooth-cond-${c.value}`} style={{ background: "transparent", border: "none", padding: 0 }}>
                <span className={`w-2.5 h-2.5 rounded-full inline-block me-1`} style={{ border: `2px solid currentColor` }} />
                <span className="text-[11px] font-semibold">{lang === "ar" ? c.ar : c.fr}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* TREATMENTS */}
      {tab === "treatments" && (
        <div className="space-y-4">
          {patient.treatmentPlans.length === 0 && <Empty text={t("no_data")} />}
          {patient.treatmentPlans.map((plan) => {
            const items = plan.itemsJson as { label: string; price: number }[];
            return (
              <div key={plan.id} className="card-sir p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold">{plan.name}</h3>
                    <p className="text-xs text-[var(--muted)]">{formatDate(plan.createdAt)}</p>
                  </div>
                  <StatusBadge status={plan.status} />
                </div>
                <ul className="text-sm space-y-1 mb-3">
                  {(items ?? []).map((it, i) => (
                    <li key={i} className="flex justify-between border-b border-dashed border-[var(--border)] pb-1">
                      <span>{it.label}</span>
                      <span className="font-semibold tabular-nums">{formatMoney(it.price)}</span>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-[var(--bg)] rounded-xl p-2">
                    <div className="text-[var(--muted)]">{t("total")}</div>
                    <div className="font-bold">{formatMoney(plan.totalAmount)}</div>
                  </div>
                  <div className="bg-[var(--bg)] rounded-xl p-2">
                    <div className="text-[var(--muted)]">{t("sessions_total")}</div>
                    <div className="font-bold">{plan.sessionsDone}/{plan.sessionsTotal}</div>
                  </div>
                  <div className="bg-[var(--bg)] rounded-xl p-2">
                    <div className="text-[var(--muted)]">{t("session_amount")}</div>
                    <div className="font-bold">{formatMoney(plan.sessionAmount)}</div>
                  </div>
                </div>
                {plan.status === "IN_PROGRESS" && (
                  <button className="btn btn-outline btn-sm mt-3 w-full" onClick={() => completeSession(plan.id)}>
                    ✓ {t("mark_complete")} ({t("sessions_done")})
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PRESCRIPTIONS */}
      {tab === "prescriptions" && (
        <div className="space-y-3">
          <button className="btn btn-primary btn-sm" onClick={() => setRxOpen(true)}>
            <Plus size={14} /> {t("new_prescription")}
          </button>
          {patient.prescriptions.length === 0 && <Empty icon={<Pill size={36} />} text={t("no_data")} />}
          {patient.prescriptions.map((rx) => (
            <div key={rx.id} className="card-sir p-4">
              <div className="flex justify-between items-start gap-2">
                <pre className="text-sm whitespace-pre-wrap font-sans flex-1">{rx.content}</pre>
                <div className="flex flex-col gap-1">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => printPrescription(patient.name, rx.content)}
                  >
                    <Printer size={13} />
                  </button>
                  <button className="btn btn-ghost btn-sm text-[var(--danger)]" onClick={() => deleteResource("prescription", rx.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-[var(--muted)] mt-2">{formatDateTime(rx.createdAt)}{rx.createdBy ? ` · ${rx.createdBy}` : ""}</p>
            </div>
          ))}
        </div>
      )}

      {/* FINANCES */}
      {tab === "finances" && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label={t("total_billed")} value={formatMoney(billed)} />
            <Stat label={t("total_paid")} value={formatMoney(paid)} tone="green" />
            <Stat label={t("balance_due")} value={formatMoney(Math.max(0, billed - paid))} tone="red" />
          </div>
          <div className="card-sir overflow-hidden">
            <div className="table-wrap">
              <table className="sir">
                <thead>
                  <tr>
                    <th>{t("date")}</th>
                    <th>{t("description")}</th>
                    <th>{t("amount")}</th>
                    <th>{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...patient.invoices.map((i) => ({
                      key: i.id,
                      date: i.createdAt,
                      desc: `${t("invoice_number")} #${i.number}`,
                      amount: i.total,
                      status: i.status as string,
                    })),
                    ...patient.payments.filter((p) => !p.voided).map((p) => ({
                      key: p.id,
                      date: p.createdAt,
                      desc: `${t("payment_recorded")} · ${methodLabel(p.method)}`,
                      amount: -p.amount,
                      status: "",
                    })),
                  ]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((row) => (
                      <tr key={row.key}>
                        <td>{formatDate(row.date)}</td>
                        <td>{row.desc}</td>
                        <td className={row.amount < 0 ? "text-[var(--success)] font-bold" : "font-bold"} style={{ direction: "ltr", textAlign: "end" }}>
                          {row.amount < 0 ? "+" : ""}
                          {formatMoney(Math.abs(row.amount))}
                        </td>
                        <td>{row.status ? <StatusBadge status={row.status} /> : null}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VISIT HISTORY */}
      {tab === "visit_history" && (
        <div className="space-y-3">
          {patient.visits.length === 0 && <Empty icon={<FileText size={36} />} text={t("no_data")} />}
          {patient.visits.map((v) => (
            <div key={v.id} className="card-sir p-4">
              <div className="flex flex-wrap justify-between gap-2 mb-2">
                <div className="font-bold text-sm">{formatDateTime(v.visitDate)}</div>
                <div className="flex gap-2 items-center">
                  {v.doctor && <Badge tone="blue">{v.doctor.name}</Badge>}
                  <Badge tone={v.freeVisit ? "gray" : "green"}>
                    {v.freeVisit ? t("free_visit") : formatMoney(v.totalAmount)}
                  </Badge>
                </div>
              </div>
              <p className="text-sm">{servicesLabel(v.servicesJson)}</p>
              {v.teeth?.length > 0 && <p className="text-xs text-[var(--muted)] mt-1">🦷 {v.teeth.join(", ")}</p>}
              {(v.aiNotes || v.rawNotes) && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-[var(--primary)] font-semibold">{t("history")}</summary>
                  <pre className="text-xs whitespace-pre-wrap mt-2 bg-[var(--bg)] rounded-xl p-3">{v.aiNotes || v.rawNotes}</pre>
                </details>
              )}
            </div>
          ))}

          <h3 className="font-bold mt-6 mb-2">{t("bookings")}</h3>
          {patient.bookings.slice(0, 10).map((b) => (
            <div key={b.id} className="card-sir p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                {formatDate(b.date)} {b.time ?? ""} {b.reason ? `· ${b.reason}` : ""}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={b.status} />
                {b.source === "WHATSAPP" && <Badge tone="green">WhatsApp</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DOCUMENTS */}
      {tab === "documents" && (
        <div>
          <button className="btn btn-primary btn-sm mb-3" onClick={() => setDocOpen(true)}>
            <Plus size={14} /> {t("documents")}
          </button>
          {patient.documents.length === 0 && <Empty icon={<ImageIcon size={36} />} text={t("no_data")} />}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {patient.documents.map((d) => (
              <div key={d.id} className="card-sir p-4">
                <a href={d.url} target="_blank" rel="noreferrer" className="font-semibold text-sm hover:text-[var(--primary)] break-all">
                  📎 {d.title}
                </a>
                <p className="text-[11px] text-[var(--muted)] mt-1">{formatDate(d.createdAt)}</p>
                <button className="btn btn-ghost btn-sm mt-2 text-[var(--danger)]" onClick={() => deleteResource("document", d.id)}>
                  <Trash2 size={13} /> {t("delete")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit info modal */}
      <Modal open={editInfoOpen} onClose={() => setEditInfoOpen(false)} title={t("edit")}>
        <form onSubmit={saveInfo} className="space-y-4">
          <Field label={t("name")}><input name="name" defaultValue={patient.name} className="input" required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("phone")}><input name="phone" defaultValue={patient.phone ?? ""} className="input" dir="ltr" /></Field>
            <Field label={t("age")}><input name="age" type="number" defaultValue={patient.age ?? ""} className="input" /></Field>
          </div>
          <Field label="Sexe">
            <select name="gender" defaultValue={patient.gender ?? ""} className="select">
              <option value="">—</option>
              <option value="M">{t("gender_m")}</option>
              <option value="F">{t("gender_f")}</option>
            </select>
          </Field>
          <Field label="Adresse"><input name="address" defaultValue={patient.address ?? ""} className="input" /></Field>
          <Field label={t("medical_background")}>
            <textarea name="medicalBackground" rows={3} defaultValue={patient.medicalBackground ?? ""} className="textarea" />
          </Field>
          <Field label={`${t("note")} (${t("optional")})`}>
            <textarea name="internalNote" rows={2} defaultValue={patient.internalNote ?? ""} className="textarea" />
          </Field>
          <button className="btn btn-primary w-full py-3">{t("save")}</button>
        </form>
      </Modal>

      {/* Prescription modal */}
      <Modal open={rxOpen} onClose={() => setRxOpen(false)} title={t("new_prescription")}>
        <textarea
          className="textarea"
          rows={8}
          placeholder="Médicament, posologie, fréquence, durée..."
          value={rxText}
          onChange={(e) => setRxText(e.target.value)}
        />
        <button className="btn btn-primary w-full py-3 mt-4" onClick={saveRx}>{t("save")}</button>
      </Modal>

      {/* Document modal */}
      <Modal open={docOpen} onClose={() => setDocOpen(false)} title={t("documents")}>
        <div className="space-y-4">
          <Field label={t("name")}><input className="input" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} /></Field>
          <Field label="URL">
            <input className="input" dir="ltr" placeholder="https://…" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} />
          </Field>
          <button
            className="btn btn-primary w-full py-3"
            onClick={async () => {
              if (!docTitle.trim() || !docUrl.trim()) return;
              await api(`/api/patients/${patientId}/records`, {
                method: "POST",
                body: JSON.stringify({ type: "document", title: docTitle, url: docUrl }),
              });
              setDocOpen(false); setDocTitle(""); setDocUrl(""); load(); toast(t("saved"), "success");
            }}
          >
            {t("save")}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function nextCondition(current?: string): string {
  const order = TOOTH_CONDITIONS.map((c) => c.value);
  const idx = order.indexOf(current ?? "healthy");
  return order[(idx + 1) % order.length];
}

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed border-[var(--border)] pb-1.5">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className={`font-semibold text-end ${ltr ? "dir-ltr" : ""}`}>{value}</dd>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <div className="card-sir p-4 text-center">
      <p className="text-[11px] text-[var(--muted)] uppercase tracking-wide font-semibold">{label}</p>
      <p className={`text-lg font-extrabold mt-1 ${tone === "green" ? "text-[var(--success)]" : tone === "red" ? "text-[var(--danger)]" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export function servicesLabel(json: unknown): string {
  if (!Array.isArray(json)) return "—";
  return (json as { label: string; qty?: number }[])
    .map((s) => `${s.label}${s.qty && s.qty > 1 ? ` ×${s.qty}` : ""}`)
    .join(", ");
}

function methodLabel(m: string): string {
  return { CASH: "Espèces", BANKILY: "Bankily", MASRIVI: "Masrivi", BANK_TRANSFER: "Virement", CREDIT: "Crédit" }[m] ?? m;
}

export function printPrescription(patientName: string, content: string) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ordonnance</title>
    <style>body{font-family:sans-serif;padding:40px;color:#111;max-width:700px;margin:auto}
    h1{color:#4a4ad8;border-bottom:3px solid #4a4ad8;padding-bottom:8px}
    pre{white-space:pre-wrap;font-family:inherit;font-size:15px;line-height:1.7}
    .sig{margin-top:80px;text-align:end;color:#555}</style></head><body>
    <h1>SIR — Ordonnance</h1>
    <p>Patient : <strong>${patientName}</strong> — Date : ${new Date().toLocaleDateString("fr-FR")}</p>
    <pre>${content.replace(/</g, "&lt;")}</pre>
    <div class="sig">Signature du médecin</div></body></html>`);
  w.document.close();
  w.print();
}
