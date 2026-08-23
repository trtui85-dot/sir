"use client";

import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { PatientProfile } from "@/components/patient-profile";
import { BookingForm } from "@/components/booking-form";
import {
  api, Badge, Empty, Field, Modal, PageHeader, StatusBadge, useToast,
} from "@/components/ui";
import { formatDate, formatDateTime, formatMoney, useLanguage } from "@/lib/i18n";
import { printPrescription, servicesLabel } from "@/components/patient-profile";
import {
  Plus, Search, Printer, CheckCircle2, XCircle, Wallet, UserPlus,
  Upload, Send, MessageSquare, CalendarClock, Users, CreditCard, CalendarDays,
} from "lucide-react";

type Booking = {
  id: string; date: string; time: string | null; reason: string | null; status: string;
  source: string; secretaryNotes: string | null; patientId: string;
  patient: { id: string; name: string; phone: string | null };
  doctor?: { name: string } | null;
};

export default function SecretaryPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [tab, setTab] = useState("today");
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    api<{ user: { name: string } }>("/api/auth/me").then((d) => setUser(d.user)).catch(() => {});
  }, []);

  if (!user) return <p className="p-8 text-center text-sm text-[var(--muted)]">{t("loading")}</p>;

  return (
    <Shell role="SECRETARY" user={user} tab={tab} onTab={setTab}>
      {tab === "today" && <TodayTab />}
      {tab === "bookings" && <BookingsTab />}
      {tab === "patients" && <PatientsTab />}
      {tab === "payments" && <PaymentsTab />}
      {tab === "messages" && <MessagesTab />}
    </Shell>
  );
}

/* ============ TODAY / QUEUE ============ */

function TodayTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({ queueCount: 0, completedToday: 0, pendingPayments: 0 });
  const [bookingForm, setBookingForm] = useState(false);
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [b, s] = await Promise.all([
        api<{ bookings: Booking[] }>(`/api/bookings?date=${today}`),
        api<typeof stats>("/api/stats?scope=dashboard"),
      ]);
      setBookings(b.bookings);
      setStats(s);
    } catch {
      toast(t("error_occurred"), "error");
    }
  }, [toast, t]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  async function setStatus(b: Booking, status: string) {
    await api(`/api/bookings/${b.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  function printDailySheet() {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const rows = bookings
      .map(
        (b, i) =>
          `<tr><td>${i + 1}</td><td>${formatDate(b.date)} ${b.time ?? ""}</td><td>${b.patient.name}</td>
          <td>${b.doctor?.name ?? "—"}</td><td>${b.reason ?? "—"}</td><td>${b.status}</td></tr>`
      )
      .join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Feuille du jour</title>
      <style>body{font-family:sans-serif;padding:32px}table{width:100%;border-collapse:collapse}
      td,th{border:1px solid #ddd;padding:8px;font-size:13px;text-align:start}h1{color:#4a4ad8}</style></head><body>
      <h1>SIR — Feuille du jour</h1><p>${new Date().toLocaleDateString("fr-FR")}</p>
      <table><tr><th>#</th><th>Heure</th><th>Patient</th><th>Médecin</th><th>Motif</th><th>Statut</th></tr>${rows}</table>
      </body></html>`);
    w.document.close();
    w.print();
  }

  const groups = [
    { label: t("pending_confirmation"), statuses: ["PENDING_CONFIRMATION"], tone: "orange" as const },
    { label: t("waiting_room"), statuses: ["CONFIRMED", "IN_WAITING_ROOM"], tone: "blue" as const },
    { label: t("in_treatment"), statuses: ["IN_TREATMENT"], tone: "blue" as const },
    { label: t("completed_today"), statuses: ["COMPLETED"], tone: "green" as const },
  ];

  return (
    <div>
      <PageHeader
        title={t("today")}
        subtitle={`${t("active_queue")}: ${stats.queueCount} · ${t("completed_today")}: ${stats.completedToday}${stats.pendingPayments ? ` · ${t("payments")}: ${stats.pendingPayments} ⚠` : ""}`}
        actions={
          <>
            <button className="btn btn-outline btn-sm" onClick={printDailySheet}><Printer size={14} /><span className="hidden sm:inline">{t("print_daily_sheet")}</span></button>
            <button className="btn btn-outline btn-sm" onClick={() => setWalkinOpen(true)}><UserPlus size={14} /><span className="hidden sm:inline">{t("register_walkin")}</span></button>
            <button className="btn btn-primary btn-sm" onClick={() => setBookingForm(true)}><Plus size={15} />{t("new_booking")}</button>
          </>
        }
      />

      {bookings.length === 0 && <Empty icon={<CalendarDays size={40} />} text={t("no_data")} />}

      {groups.map((g) => {
        const items = bookings.filter((b) => g.statuses.includes(b.status));
        if (items.length === 0) return null;
        return (
          <div key={g.label} className="mb-5">
            <h2 className="text-sm font-bold text-[var(--muted)] uppercase tracking-wide mb-2 flex items-center gap-2">
              <Badge tone={g.tone}>{items.length}</Badge> {g.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((b) => (
                <div key={b.id} className="card-sir p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-2">
                    <button className="font-bold text-start hover:text-[var(--primary)] truncate" onClick={() => window.open(`/api/patients/${b.patientId}`, "_blank")}>
                      {b.patient.name}
                    </button>
                    <Badge tone="gray">{b.time ?? formatDateTime(b.date).split(",")[1]?.trim() ?? ""}</Badge>
                  </div>
                  <p className="text-xs text-[var(--muted)]">{b.reason || "—"}{b.doctor ? ` · ${b.doctor.name}` : ""}</p>
                  {b.secretaryNotes && <p className="text-xs bg-[var(--warning-soft)] text-[var(--warning)] rounded-lg px-2 py-1">📝 {b.secretaryNotes}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                    {["PENDING_CONFIRMATION", "CONFIRMED"].includes(b.status) && (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => setStatus(b, "IN_WAITING_ROOM")}>{t("check_in")}</button>
                        <button className="btn btn-outline btn-sm" onClick={() => setConsultOpen(b)}>🦷 {t("start_treatment")}</button>
                      </>
                    )}
                    {b.status === "IN_WAITING_ROOM" && (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => setStatus(b, "IN_TREATMENT")}>{t("start_treatment")}</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setStatus(b, "NO_SHOW")}>{t("mark_noshow")}</button>
                      </>
                    )}
                    {b.status === "IN_TREATMENT" && (
                      <>
                        <button className="btn btn-outline btn-sm" onClick={() => setConsultOpen(b)}>{t("notes")} + 🦷</button>
                        <button className="btn btn-primary btn-sm" onClick={() => setStatus(b, "COMPLETED")}>✓</button>
                      </>
                    )}
                    {!["COMPLETED", "CANCELLED"].includes(b.status) && (
                      <button className="btn btn-ghost btn-sm text-[var(--danger)]"
                        onClick={async () => {
                          const reason = prompt(t("cancellation_reason")) ?? "";
                          if (reason === null) return;
                          await api(`/api/bookings/${b.id}`, { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) });
                          load();
                        }}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <BookingForm open={bookingForm} onClose={() => setBookingForm(false)} onSaved={load} />

      {/* Walk-in modal */}
      <WalkinModal open={walkinOpen} onClose={() => setWalkinOpen(false)} onSaved={load} />

      {/* Quick consultation modal (secretary marks services/pricing later; doctor notes optional) */}
      {consultOpen && (
        <QuickConsult booking={consultOpen} onClose={() => setConsultOpen(null)} onSaved={load} />
      )}
    </div>
  );
}

function WalkinModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");

  async function submit() {
    if (!name.trim()) { toast(t("name") + " ?", "error"); return; }
    try {
      const created = await api<{ patient: { id: string } }>("/api/patients", {
        method: "POST",
        body: JSON.stringify({ name, phone: phone || undefined }),
      });
      await api("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          patientId: created.patient.id,
          date: new Date(),
          reason: reason || "Walk-in",
          status: "IN_WAITING_ROOM",
        }),
      });
      toast(t("patient_registered"), "success");
      setName(""); setPhone(""); setReason("");
      onClose(); onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("register_walkin")}>
      <div className="space-y-4">
        <Field label={t("name")}><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={t("phone")}><input className="input" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label={t("description")}><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <button className="btn btn-primary w-full py-3" onClick={submit}>{t("save")}</button>
      </div>
    </Modal>
  );
}

function QuickConsult({ booking, onClose, onSaved }: { booking: Booking; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [services, setServices] = useState<{ id: string; name: string; price: number; toothChart: boolean; emoji?: string | null }[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [customLabel, setCustomLabel] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [teeth, setTeeth] = useState<number[]>([]);

  useEffect(() => {
    api<{ services: typeof services }>("/api/services").then((d) => setServices(d.services)).catch(() => {});
  }, []);

  const total =
    Object.entries(selected).filter(([, v]) => v).reduce((sum, [id]) => sum + (services.find((s) => s.id === id)?.price ?? 0), 0) +
    (customPrice ? Number(customPrice) : 0);

  async function save() {
    const list = [
      ...services.filter((s) => selected[s.id]).map((s) => ({ label: s.name, price: s.price })),
      ...(customLabel.trim() ? [{ label: customLabel.trim(), price: Number(customPrice) || 0 }] : []),
    ];
    if (list.length === 0) { toast(t("choose_service"), "error"); return; }
    try {
      await api("/api/visits", {
        method: "POST",
        body: JSON.stringify({
          patientId: booking.patientId,
          bookingId: booking.id,
          services: list,
          teeth,
        }),
      });
      toast(t("visit_saved"), "success");
      onClose(); onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  return (
    <Modal open onClose={onClose} title={`${t("new_consultation")} — ${booking.patient.name}`} wide>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
          {services.map((s) => (
            <label key={s.id} className={`flex items-center justify-between gap-2 border rounded-xl px-3 py-2 cursor-pointer transition ${selected[s.id] ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border)]"}`}>
              <span className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={!!selected[s.id]} onChange={(e) => setSelected((m) => ({ ...m, [s.id]: e.target.checked }))} />
                {s.emoji ? `${s.emoji} ` : ""}{s.name}
              </span>
              <span className="text-xs font-bold">{formatMoney(s.price)}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_130px] gap-2">
          <input className="input" placeholder={t("custom_services")} value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
          <input className="input" type="number" placeholder="MRU" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} />
        </div>

        <div>
          <p className="label">{t("affected_teeth")} ({t("optional")}) — {teeth.length ? teeth.join(", ") : t("none")}</p>
          <MiniToothPicker teeth={teeth} onToggle={(tooth) => setTeeth((prev) => prev.includes(tooth) ? prev.filter((x) => x !== tooth) : [...prev, tooth])} />
        </div>

        <div className="flex justify-between items-center bg-[var(--bg)] rounded-xl px-4 py-3">
          <span className="font-semibold">{t("total")}</span>
          <span className="font-extrabold text-lg">{formatMoney(total)}</span>
        </div>

        <button className="btn btn-primary w-full py-3" onClick={save}>{t("save_finish_visit")}</button>
      </div>
    </Modal>
  );
}

function MiniToothPicker({ teeth, onToggle }: { teeth: number[]; onToggle: (tooth: number) => void }) {
  const upper = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
  const lower = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
  return (
    <div className="space-y-1 mt-1">
      {[upper, lower].map((row, i) => (
        <div key={i} className="flex flex-wrap justify-center gap-1">
          {row.map((tooth) => (
            <button key={tooth} type="button" className={`tooth ${teeth.includes(tooth) ? "selected" : ""}`} onClick={() => onToggle(tooth)}>
              {tooth}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ============ BOOKINGS ============ */

function BookingsTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [allMode, setAllMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (!allMode) params.set("date", date);
      if (statusFilter) params.set("status", statusFilter);
      const d = await api<{ bookings: Booking[] }>(`/api/bookings?${params}`);
      setBookings(d.bookings);
    } catch {
      toast(t("error_occurred"), "error");
    }
  }, [date, allMode, statusFilter, toast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = bookings.filter((b) => !search || b.patient.name.toLowerCase().includes(search.toLowerCase()) || (b.patient.phone ?? "").includes(search));

  if (profileId) {
    return <PatientProfile patientId={profileId} role="SECRETARY" onBack={() => setProfileId(null)} />;
  }

  return (
    <div>
      <PageHeader
        title={t("bookings")}
        actions={<button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={15} />{t("new_booking")}</button>}
      />

      <div className="card-sir p-4 mb-4 grid sm:grid-cols-4 gap-3">
        <Field label={t("date")}>
          <input type="date" className="input" value={date} disabled={allMode} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={t("status")}>
          <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{t("all")}</option>
            <option value="PENDING_CONFIRMATION">{t("pending_confirmation")}</option>
            <option value="CONFIRMED">{t("confirmed")}</option>
            <option value="COMPLETED">✓</option>
            <option value="CANCELLED">{t("cancelled")}</option>
            <option value="NO_SHOW">{t("no_show")}</option>
          </select>
        </Field>
        <Field label={t("filters")}>
          <label className="flex items-center gap-2 h-full text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={allMode} onChange={(e) => setAllMode(e.target.checked)} />
            {t("all")} ({t("history")})
          </label>
        </Field>
        <Field label={t("search")}>
          <div className="relative">
            <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input className="input ps-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </Field>
      </div>

      <div className="card-sir overflow-hidden">
        <div className="table-wrap">
          <table className="sir">
            <thead>
              <tr><th>{t("date")}</th><th>{t("patients")}</th><th>{t("doctor") || "Médecin"}</th><th>{t("description")}</th><th>{t("status")}</th><th className="w-28">{t("actions")}</th></tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td className="whitespace-nowrap">{formatDate(b.date)}<br /><span className="text-xs text-[var(--muted)]">{b.time ?? ""}</span></td>
                  <td>
                    <button className="font-semibold hover:text-[var(--primary)]" onClick={() => setProfileId(b.patientId)}>
                      {b.patient.name}
                    </button>
                    <br />
                    <span className="text-xs text-[var(--muted)]">{b.patient.phone}</span>
                  </td>
                  <td>{b.doctor?.name ?? "—"}</td>
                  <td className="max-w-40 truncate">{b.reason ?? "—"}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" title={t("edit")}
                        onClick={() => { setEditing(b); setFormOpen(true); }}>✏️</button>
                      <button className="btn btn-ghost btn-sm text-[var(--danger)]" title={t("delete")}
                        onClick={async () => {
                          if (!confirm(`${t("cancel_booking")} ?`)) return;
                          await api(`/api/bookings/${b.id}`, { method: "DELETE" });
                          toast(t("booking_deleted"), "success");
                          load();
                        }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <Empty icon={<CalendarClock size={36} />} text={t("no_data")} />}
      </div>

      <BookingForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={load}
        editBooking={editing as unknown as Record<string, unknown>}
      />
    </div>
  );
}

/* ============ PATIENTS ============ */

type PatientRow = {
  id: string; name: string; phone: string | null; age: number | null; status: string; createdAt: string;
  visits?: { visitDate: string }[];
  _count?: { visits: number; bookings: number };
};

function PatientsTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("");
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusF) params.set("status", statusF);
    try {
      const d = await api<{ patients: PatientRow[] }>(`/api/patients?${params}`);
      setRows(d.patients);
    } catch {
      toast(t("error_occurred"), "error");
    }
  }, [search, statusF, toast, t]);

  useEffect(() => {
    const delay = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(delay);
  }, [load, search]);

  if (profileId) {
    return <PatientProfile patientId={profileId} role="SECRETARY" onBack={() => setProfileId(null)} />;
  }

  async function runImport() {
    const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const patients = lines.map((line) => {
      const parts = line.split(/[;,\t]/).map((p) => p.trim());
      return { name: parts[0], phone: parts[1], age: parts[2] };
    });
    try {
      const res = await api<{ imported: number; errors: string[] }>("/api/patients/import", {
        method: "POST",
        body: JSON.stringify({ patients }),
      });
      toast(`${t("imported")}: ${res.imported}/${lines.length}`, "success");
      setImportOpen(false);
      setPasteText("");
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  return (
    <div>
      <PageHeader
        title={t("patient_directory")}
        subtitle={`${rows.length}`}
        actions={
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setImportOpen(true)}><Upload size={14} />{t("import_patients")}</button>
            <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}><Plus size={15} />{t("register_patient")}</button>
          </>
        }
      />

      <div className="card-sir p-4 mb-4 grid sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--muted)] z-10" style={{ top: "38%" }} />
          <input className="input ps-9" placeholder={`${t("search")} ${t("patients").toLowerCase()}…`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="">{t("all")}</option>
          <option value="ACTIVE">{t("active")}</option>
          <option value="INACTIVE">{t("inactive")}</option>
        </select>
      </div>

      <div className="card-sir overflow-hidden">
        <div className="table-wrap">
          <table className="sir">
            <thead>
              <tr><th>{t("name")}</th><th>{t("phone")}</th><th>{t("age")}</th><th>{t("visits_count")}</th><th>{t("last_visit")}</th><th>{t("status")}</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="cursor-pointer" onClick={() => setProfileId(p.id)}>
                  <td className="font-semibold">{p.name}</td>
                  <td dir="ltr" className="text-start">{p.phone ?? "—"}</td>
                  <td>{p.age ?? "—"}</td>
                  <td>{p._count?.visits ?? 0}</td>
                  <td>{p.visits?.[0] ? formatDate(p.visits[0].visitDate) : "—"}</td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <Empty icon={<Users size={36} />} text={t("no_data")} />}
      </div>

      {/* Add patient */}
      <AddPatientModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={load} />

      {/* Import modal */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title={t("import_patients")}>
        <p className="text-sm text-[var(--muted)] mb-3">
          Nom ; Téléphone ; Âge — un patient par ligne.
        </p>
        <textarea className="textarea" rows={10} dir="ltr"
          placeholder={"Mohamed Ahmed ; 46123456 ; 34\nFatima Mint Ali ; 22998877"}
          value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
        <button className="btn btn-primary w-full py-3 mt-4" onClick={runImport}><Upload size={15} /> {t("save")}</button>
      </Modal>
    </div>
  );
}

export function AddPatientModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const toast = useToast();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api("/api/patients", {
        method: "POST",
        body: JSON.stringify({
          name: f.get("name"),
          phone: f.get("phone"),
          age: f.get("age"),
          gender: f.get("gender"),
          address: f.get("address"),
          medicalBackground: f.get("medicalBackground"),
        }),
      });
      toast(t("patient_registered"), "success");
      onClose();
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("register_patient")}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t("name")}><input name="name" className="input" required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("phone")}><input name="phone" className="input" dir="ltr" /></Field>
          <Field label={t("age")}><input name="age" type="number" className="input" /></Field>
        </div>
        <Field label="Sexe">
          <select name="gender" className="select">
            <option value="">—</option>
            <option value="M">{t("gender_m")}</option>
            <option value="F">{t("gender_f")}</option>
          </select>
        </Field>
        <Field label="Adresse"><input name="address" className="input" /></Field>
        <Field label={t("medical_background")}>
          <textarea name="medicalBackground" rows={3} className="textarea" placeholder="Allergies, antécédents…" />
        </Field>
        <button className="btn btn-primary w-full py-3">{t("save")}</button>
      </form>
    </Modal>
  );
}

/* ============ PAYMENTS ============ */

type Payment = {
  id: string; amount: number; method: string; note: string | null; verified: boolean; voided: boolean;
  screenshotUrl: string | null; createdAt: string; invoiceId: string | null;
  patient?: { name: string } | null;
  invoice?: { number: number; total: number } | null;
};

function PaymentsTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [filter, setFilter] = useState<"pending" | "recent" | "voided">("pending");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [patients, setPatients] = useState<{ id: string; name: string; phone: string | null }[]>([]);

  const load = useCallback(async () => {
    try {
      const d = await api<{ payments: Payment[] }>(`/api/payments?filter=${filter === "recent" ? "" : filter}`);
      setPayments(d.payments.filter((p) => filter !== "recent" || !p.voided));
    } catch {
      toast(t("error_occurred"), "error");
    }
  }, [filter, toast, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (recordOpen) {
      api<{ patients: typeof patients }>("/api/patients?status=ACTIVE").then((d) => setPatients(d.patients)).catch(() => {});
    }
  }, [recordOpen]);

  async function act(p: Payment, action: "verify" | "reject" | "void") {
    let reason: string | undefined;
    if (action === "void") {
      reason = prompt(t("reason")) ?? "";
      if (!confirm(t("void_payment") + " ?")) return;
    }
    try {
      await api(`/api/payments/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, reason }),
      });
      toast(action === "verify" ? t("payment_recorded") : "✓", "success");
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  return (
    <div>
      <PageHeader
        title={t("payments")}
        actions={<button className="btn btn-primary btn-sm" onClick={() => setRecordOpen(true)}><Wallet size={14} />{t("record_payment")}</button>}
      />

      <div className="flex gap-1 mb-4">
        {(["pending", "recent", "voided"] as const).map((f) => (
          <button key={f} className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter(f)}>
            {f === "pending" ? `⏳ ${t("payment_verification")}` : f === "recent" ? t("history") : t("cancelled")}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {payments.length === 0 && <Empty icon={<CreditCard size={36} />} text={t("no_data")} />}
        {payments.map((p) => (
          <div key={p.id} className={`card-sir p-4 flex flex-wrap items-center justify-between gap-3 ${p.voided ? "opacity-60" : ""}`}>
            <div className="min-w-0">
              <div className="font-bold text-sm">{p.patient?.name ?? "—"}</div>
              <div className="text-xs text-[var(--muted)]">
                {methodLabel(p.method)} · {formatDateTime(p.createdAt)}
                {p.invoice ? ` · #${p.invoice.number}` : ""}
                {p.note ? ` · ${p.note}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tabular-nums" style={{ direction: "ltr" }}>{formatMoney(p.amount)}</span>
              {p.screenshotUrl && (
                <a href={p.screenshotUrl} target="_blank" rel="noreferrer" className="badge badge-blue">📎 Capture</a>
              )}
              {p.verified ? <Badge tone="green">✓</Badge> : <Badge tone="orange">⏳</Badge>}
              {!p.verified && !p.voided && (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => act(p, "verify")}>✓ {t("confirm")}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => act(p, "reject")}>✕ {t("reject")}</button>
                </>
              )}
              {!p.voided && p.verified && (
                <button className="btn btn-ghost btn-sm text-[var(--danger)]" onClick={() => act(p, "void")}>↩</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <RecordPaymentModal open={recordOpen} onClose={() => setRecordOpen(false)} onSaved={load} patients={patients} />
    </div>
  );
}

export function RecordPaymentModal({
  open, onClose, onSaved, patients,
}: {
  open: boolean; onClose: () => void; onSaved: () => void;
  patients: { id: string; name: string; phone: string | null }[];
}) {
  const { t } = useLanguage();
  const toast = useToast();
  const [patientId, setPatientId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");

  async function submit() {
    if (!patientId || !Number(amount)) { toast(t("amount") + " ?", "error"); return; }
    try {
      await api("/api/payments", {
        method: "POST",
        body: JSON.stringify({ patientId, amount: Number(amount), method, note }),
      });
      toast(t("payment_recorded"), "success");
      setPatientId(""); setAmount(""); setNote("");
      onClose(); onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("record_payment")}>
      <div className="space-y-4">
        <Field label={t("choose_patient")}>
          <select className="select" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">—</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("amount") + " (MRU)"}>
            <input className="input" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label={t("method")}>
            <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">{t("cash")}</option>
              <option value="BANKILY">{t("bankily")}</option>
              <option value="MASRIVI">{t("masrivi")}</option>
              <option value="BANK_TRANSFER">{t("bank_transfer")}</option>
            </select>
          </Field>
        </div>
        <Field label={t("note") + ` (${t("optional")})`}>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="versement 2 sur 3…" />
        </Field>
        <button className="btn btn-primary w-full py-3" onClick={submit}>{t("save")}</button>
      </div>
    </Modal>
  );
}

/* ============ MESSAGES ============ */

function MessagesTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [mode, setMode] = useState<"broadcast" | "single">("broadcast");
  const [content, setContent] = useState("");
  const [reach, setReach] = useState({ withPhone: 0, withoutPhone: 0 });
  const [patients, setPatients] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [patientId, setPatientId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ patients: typeof patients }>("/api/patients?status=ACTIVE").then((d) => {
      setPatients(d.patients);
      setReach({
        withPhone: d.patients.filter((p) => p.phone).length,
        withoutPhone: d.patients.filter((p) => !p.phone).length,
      });
    }).catch(() => {});
  }, []);

  async function send() {
    if (!content.trim()) return;
    setBusy(true);
    try {
      if (mode === "broadcast") {
        if (!confirm(`${t("send_to_all_patients")} (${reach.withPhone}) ?`)) { setBusy(false); return; }
        const res = await api<{ sent: number; skipped: number }>("/api/messages", {
          method: "POST",
          body: JSON.stringify({ broadcast: true, content }),
        });
        toast(`${t("broadcast_sent")} (${res.sent}, ⏭ ${res.skipped})`, "success");
      } else {
        if (!patientId) { toast(t("choose_patient"), "error"); setBusy(false); return; }
        await api("/api/messages", { method: "POST", body: JSON.stringify({ patientId, content }) });
        toast(t("sent") + " ✓", "success");
      }
      setContent("");
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title={t("messages")} subtitle="WhatsApp" />

      <div className="flex gap-1 mb-4">
        <button className={`btn btn-sm ${mode === "broadcast" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("broadcast")}>
          <Send size={14} /> {t("send_to_all_patients")}
        </button>
        <button className={`btn btn-sm ${mode === "single" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("single")}>
          <MessageSquare size={14} /> {t("send_to_one_patient")}
        </button>
      </div>

      <div className="card-sir p-5 max-w-2xl">
        {mode === "single" && (
          <div className="mb-4">
            <label className="label">{t("choose_patient")}</label>
            <select className="select" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">—</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.phone ? ` · ${p.phone}` : " · ⛔"}</option>
              ))}
            </select>
          </div>
        )}
        <Field label={t("message_content")}>
          <textarea className="textarea" rows={5} value={content} onChange={(e) => setContent(e.target.value)}
            placeholder={mode === "broadcast" ? t("send_to_all_patients") + "…" : "{{name}}"} />
        </Field>

        {mode === "broadcast" && (
          <p className="text-xs text-[var(--muted)] mt-2">
            {t("estimated_reach")}: <strong>{reach.withPhone}</strong> · {t("recipients_skipped")}: <strong>{reach.withoutPhone}</strong>
          </p>
        )}

        <button className="btn btn-primary w-full py-3 mt-4" disabled={busy} onClick={send}>
          <Send size={15} /> {busy ? "…" : t("send")}
        </button>
      </div>
    </div>
  );
}

function methodLabel(m: string): string {
  return { CASH: "Espèces", BANKILY: "Bankily", MASRIVI: "Masrivi", BANK_TRANSFER: "Virement", CREDIT: "Crédit" }[m] ?? m;
}
