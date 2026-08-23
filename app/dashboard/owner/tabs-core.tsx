"use client";

import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { PatientProfile } from "@/components/patient-profile";
import { BookingForm } from "@/components/booking-form";
import { api, Badge, Empty, Field, Modal, PageHeader, StatusBadge, useToast } from "@/components/ui";
import { formatDate, formatDateTime, formatMoney, useLanguage } from "@/lib/i18n";
import {
  Plus, Search, Wallet, Users, CalendarClock, Stethoscope, Pencil, Trash2,
} from "lucide-react";

export type Booking = {
  id: string; date: string; time: string | null; reason: string | null; status: string;
  source: string; patientId: string;
  patient: { id: string; name: string; phone: string | null };
  doctor?: { name: string } | null;
};

export function useMe() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  useEffect(() => {
    api<{ user: { name: string } }>("/api/auth/me").then((d) => setUser(d.user)).catch(() => {});
  }, []);
  return user;
}

/* ---------- Dashboard overview ---------- */

export function OverviewTab({ onGo }: { onGo: (tab: string) => void }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [stats, setStats] = useState<{
    todayBookings: unknown[]; queueCount: number; completedToday: number;
    pendingPayments: number; newPatientsMonth: number; revenueThisMonth: number;
    expensesThisMonth: number; profitThisMonth: number; patientsTotal: number;
  } | null>(null);

  useEffect(() => {
    api<typeof stats>("/api/stats?scope=dashboard").then(setStats).catch(() => toast(t("error_occurred"), "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!stats) return <p className="text-center p-8 text-sm text-[var(--muted)]">{t("loading")}</p>;

  const cards = [
    { icon: <Wallet size={20} />, label: t("revenue_this_month"), value: formatMoney(stats.revenueThisMonth), cls: "text-emerald-600", tab: "accounting" },
    { icon: <Wallet size={20} />, label: t("expenses_this_month"), value: formatMoney(stats.expensesThisMonth), cls: "text-rose-500", tab: "expenses" },
    { icon: <Wallet size={20} />, label: "Profit", value: formatMoney(stats.profitThisMonth), cls: "text-[var(--primary)]", tab: "accounting" },
    { icon: <CalendarClock size={20} />, label: t("today"), value: `${stats.completedToday}/${stats.todayBookings.length}`, cls: "", tab: "bookings" },
    { icon: <Users size={20} />, label: t("patients"), value: String(stats.patientsTotal), cls: "", tab: "patients" },
    { icon: <Users size={20} />, label: t("new_patients"), value: String(stats.newPatientsMonth), cls: "", tab: "patients" },
  ];

  return (
    <div>
      <PageHeader title={t("dashboard")} subtitle={`${t("waiting_room")}: ${stats.queueCount}${stats.pendingPayments ? ` · ${t("payments")}: ${stats.pendingPayments} ⚠` : ""}`} />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => (
          <button
            key={c.label}
            className="stat-card text-start cursor-pointer hover:-translate-y-0.5 transition-transform"
            onClick={() => c.tab && onGo(c.tab)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--muted)]">{c.label}</span>
              <span className={c.cls}>{c.icon}</span>
            </div>
            <p className={`text-lg sm:text-xl font-extrabold mt-1.5 ${c.cls}`}>{c.value}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Bookings ---------- */

export function BookingsTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [rows, setRows] = useState<Booking[]>([]);
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (status) params.set("status", status);
      const d = await api<{ bookings: Booking[] }>(`/api/bookings?${params}`);
      setRows(d.bookings);
    } catch {
      toast(t("error_occurred"), "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, status]);

  useEffect(() => {
    load();
  }, [load]);

  const q = search.trim().toLowerCase();
  const filtered = rows.filter(
    (b) => !q || b.patient.name.toLowerCase().includes(q) || (b.patient.phone ?? "").includes(q)
  );

  async function remove(id: string) {
    if (!confirm(t("confirm_delete"))) return;
    try {
      await api(`/api/bookings/${id}`, { method: "DELETE" });
      toast(t("deleted"), "success");
      load();
    } catch {
      toast(t("error_occurred"), "error");
    }
  }

  return (
    <div>
      <PageHeader
        title={t("bookings")}
        actions={
          <>
            <input type="date" className="input max-w-40" value={date} onChange={(e) => setDate(e.target.value)} />
            <select className="select max-w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t("all_statuses")}</option>
              {["PENDING_CONFIRMATION", "CONFIRMED", "IN_WAITING_ROOM", "IN_TREATMENT", "COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => (
                <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
              ))}
            </select>
            <button className="btn btn-primary btn-sm" onClick={() => setFormOpen(true)}>
              <Plus size={15} /> <span className="hidden sm:inline">{t("new_booking")}</span>
            </button>
          </>
        }
      />

      <div className="relative mb-3 max-w-sm">
        <Search size={15} className="absolute start-3 text-[var(--muted)]" style={{ top: "38%" }} />
        <input className="input ps-9" placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card-sir overflow-x-auto">
        <table className="table sir w-full text-sm">
          <thead>
            <tr>
              <th className="text-start p-3">{t("patient")}</th>
              <th className="text-start p-3">{t("date")}</th>
              <th className="text-start p-3 hidden md:table-cell">{t("reason")}</th>
              <th className="text-start p-3 hidden lg:table-cell">Médecin</th>
              <th className="text-start p-3">Statut</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-t border-[var(--border)]">
                <td className="p-3">
                  <p className="font-semibold">{b.patient.name}</p>
                  <p className="text-xs text-[var(--muted)]">{b.patient.phone ?? "—"}</p>
                </td>
                <td className="p-3 whitespace-nowrap">{formatDate(b.date)}<br /><span className="text-xs text-[var(--muted)]">{b.time ?? ""}</span></td>
                <td className="p-3 hidden md:table-cell">{b.reason ?? "—"}</td>
                <td className="p-3 hidden lg:table-cell">{b.doctor?.name ?? "—"}</td>
                <td className="p-3"><StatusBadge status={b.status} /></td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end">
                    <button className="btn btn-outline btn-sm" onClick={() => setEditBooking(b)}><Pencil size={13} /></button>
                    <button className="btn btn-outline btn-sm text-rose-500" onClick={() => remove(b.id)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <Empty text={t("no_data")} />}
      </div>

      {(formOpen || editBooking) && (
        <BookingForm
          open
          editBooking={(editBooking as unknown as Record<string, unknown>) ?? null}
          onSaved={load}
          onClose={() => {
            setFormOpen(false);
            setEditBooking(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/* ---------- Patients ---------- */

export function PatientsTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [rows, setRows] = useState<{ id: string; name: string; phone: string | null; status: string }[]>([]);
  const [search, setSearch] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ patients: typeof rows }>("/api/patients");
      setRows(d.patients);
    } catch {
      toast(t("error_occurred"), "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (profileId) return <PatientProfile patientId={profileId} role="OWNER" onBack={() => setProfileId(null)} />;

  const q = search.trim().toLowerCase();
  const filtered = rows.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.phone ?? "").includes(q));

  return (
    <div>
      <PageHeader title={t("patients")} subtitle={`${filtered.length}`} />
      <div className="relative mb-4 max-w-md">
        <Search size={15} className="absolute start-3 text-[var(--muted)]" style={{ top: "38%" }} />
        <input className="input ps-9" placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <Empty icon={<Users size={40} />} text={t("no_data")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {filtered.map((p) => (
            <button key={p.id} className="card-sir p-4 text-start hover:-translate-y-0.5 transition-transform cursor-pointer"
              onClick={() => setProfileId(p.id)}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold truncate">{p.name}</span>
                {p.status === "ARCHIVED" && <Badge tone="red">Archivé</Badge>}
              </div>
              <p className="text-xs text-[var(--muted)] mt-1">{p.phone ?? "—"}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Doctors management ---------- */

type DoctorRow = {
  id: string; name: string; specialty: string | null; phone: string | null; colorTag: string | null;
  compensation: string; salaryAmount: number; percentRate: number; userLinked: boolean;
  visitsTotal: number; visitsMonth: number; totalBilled: number; totalPaid: number; estimatedDue: number;
};

const EMPTY_DOCTOR = { name: "", specialty: "", phone: "", colorTag: "#5b5bf0", compensation: "SALARY_PLUS_PERCENT", salaryAmount: "0", percentRate: "30" };

export function DoctorsTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [form, setForm] = useState<typeof EMPTY_DOCTOR | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ doctors: DoctorRow[] }>("/api/stats?scope=doctors");
      setDoctors(d.doctors);
    } catch {
      toast(t("error_occurred"), "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!form || !form.name.trim()) return;
    try {
      const payload = {
        name: form.name,
        specialty: form.specialty || null,
        phone: form.phone || null,
        colorTag: form.colorTag,
        compensation: form.compensation,
        salaryAmount: Number(form.salaryAmount) || 0,
        percentRate: Number(form.percentRate) || 0,
      };
      if (editId) await api(`/api/doctors/${editId}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await api("/api/doctors", { method: "POST", body: JSON.stringify(payload) });
      toast(t("saved"), "success");
      setForm(null);
      setEditId(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  async function remove(id: string) {
    if (!confirm(t("confirm_delete"))) return;
    try {
      await api(`/api/doctors/${id}`, { method: "DELETE" });
      toast(t("deleted"), "success");
      load();
    } catch {
      toast(t("error_occurred"), "error");
    }
  }

  return (
    <div>
      <PageHeader
        title={t("doctors")}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => { setForm({ ...EMPTY_DOCTOR }); setEditId(null); }}>
            <Plus size={15} /> <span className="hidden sm:inline">{t("add")}</span>
          </button>
        }
      />

      {doctors.length === 0 && <Empty icon={<Stethoscope size={40} />} text={t("no_data")} />}

      <div className="grid gap-3 md:grid-cols-2">
        {doctors.map((d) => (
          <div key={d.id} className="card-sir p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-10 h-10 rounded-xl grid place-items-center text-white shrink-0" style={{ background: d.colorTag ?? "var(--primary)" }}>
                  <Stethoscope size={18} />
                </span>
                <div className="min-w-0">
                  <p className="font-bold truncate">{d.name}</p>
                  <p className="text-xs text-[var(--muted)]">{d.specialty ?? "—"}{d.userLinked ? " · ✓ compte" : ""}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="btn btn-outline btn-sm" onClick={() => {
                  setEditId(d.id);
                  setForm({
                    name: d.name, specialty: d.specialty ?? "", phone: d.phone ?? "",
                    colorTag: d.colorTag ?? "#5b5bf0", compensation: d.compensation,
                    salaryAmount: String(d.salaryAmount), percentRate: String(d.percentRate),
                  });
                }}><Pencil size={13} /></button>
                <button className="btn btn-outline btn-sm text-rose-500" onClick={() => remove(d.id)}><Trash2 size={13} /></button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3 pt-3 border-t border-[var(--border)]">
              <div><p className="font-extrabold text-sm">{d.visitsTotal}</p><p className="text-[var(--muted)]">Visites</p></div>
              <div><p className="font-extrabold text-sm">{formatMoney(d.totalPaid)}</p><p className="text-[var(--muted)]">Encaissé</p></div>
              <div><p className="font-extrabold text-sm text-[var(--primary)]">{formatMoney(d.estimatedDue)}</p><p className="text-[var(--muted)]">Dû (mois)</p></div>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <Modal open onClose={() => { setForm(null); setEditId(null); }} title={editId ? `${t("edit")} — ${form.name}` : t("add") + " médecin"}>
          <div className="space-y-3">
            <Field label={t("name")}><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Spécialité"><input className="input" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></Field>
            <Field label={t("phone")}><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Couleur agenda"><input type="color" className="input h-11" value={form.colorTag} onChange={(e) => setForm({ ...form, colorTag: e.target.value })} /></Field>
            <Field label="Rémunération">
              <select className="select" value={form.compensation} onChange={(e) => setForm({ ...form, compensation: e.target.value })}>
                <option value="SALARY_PLUS_PERCENT">Salaire + %</option>
                <option value="FIXED_SALARY">Salaire fixe</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Salaire (MRU)"><input type="number" className="input" value={form.salaryAmount} onChange={(e) => setForm({ ...form, salaryAmount: e.target.value })} /></Field>
              <Field label="% encaissement"><input type="number" className="input" value={form.percentRate} onChange={(e) => setForm({ ...form, percentRate: e.target.value })} /></Field>
            </div>
            <button className="btn btn-primary w-full" onClick={save}>{t("save")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
