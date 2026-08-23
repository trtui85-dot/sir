"use client";

import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { PatientProfile } from "@/components/patient-profile";
import { ConsultationModal } from "@/components/consultation-modal";
import { api, Badge, Empty, PageHeader, StatusBadge, useToast } from "@/components/ui";
import { formatDate, formatMoney, useLanguage } from "@/lib/i18n";
import { CalendarClock, FolderHeart, Stethoscope, Users, Wallet, CheckCircle2 } from "lucide-react";

type Booking = {
  id: string;
  date: string;
  time: string | null;
  reason: string | null;
  status: string;
  patientId: string;
  patient: { id: string; name: string; phone: string | null };
};

export default function DoctorPage() {
  const [tab, setTab] = useState("schedule");
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    api<{ user: { name: string } }>("/api/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, []);

  if (!user)
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="animate-pulse text-[var(--muted)]">SIR…</div>
      </div>
    );

  return (
    <Shell role="DOCTOR" user={user} tab={tab} onTab={setTab}>
      {tab === "schedule" && <ScheduleTab />}
      {tab === "patients" && <MyPatientsTab />}
      {tab === "stats" && <StatsTab />}
    </Shell>
  );
}

/* ---------- Planning ---------- */

function ScheduleTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [consultBooking, setConsultBooking] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ bookings: Booking[] }>(`/api/bookings?date=${date}`);
      setBookings(d.bookings);
    } catch {
      toast(t("error_occurred"), "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    try {
      await api(`/api/bookings/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      load();
    } catch {
      toast(t("error_occurred"), "error");
    }
  }

  return (
    <div>
      <PageHeader
        title={t("schedule")}
        subtitle={formatDate(new Date(date + "T00:00:00"))}
        actions={
          <input type="date" className="input max-w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        }
      />

      {bookings.length === 0 ? (
        <Empty icon={<CalendarClock size={40} />} text={t("no_data")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {bookings.map((b) => (
            <div key={b.id} className="card-sir p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <button
                  className="font-bold hover:text-[var(--primary)] transition-colors text-start"
                  onClick={() => setConsultBooking(b)}
                >
                  {b.patient.name}
                </button>
                <StatusBadge status={b.status} />
              </div>
              <p className="text-xs text-[var(--muted)]">
                🕐 {b.time ?? "--:--"}
                {b.reason ? ` · ${b.reason}` : ""}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                {(b.status === "CONFIRMED" || b.status === "IN_WAITING_ROOM") && (
                  <button className="btn btn-primary btn-sm" onClick={() => setConsultBooking(b)}>
                    <Stethoscope size={13} /> {t("start_treatment")}
                  </button>
                )}
                <button
                  className="btn btn-outline btn-sm"
                  disabled={b.status === "COMPLETED"}
                  onClick={() => setStatus(b.id, "COMPLETED")}
                >
                  <CheckCircle2 size={13} /> {t("mark_complete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {consultBooking && (
        <ConsultationModal
          booking={consultBooking}
          onClose={() => {
            setConsultBooking(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/* ---------- Mes dossiers patients ---------- */

type PatientRow = {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  _count?: { visits: number };
};

function MyPatientsTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    api<{ patients: PatientRow[] }>("/api/patients")
      .then((d) => setRows(d.patients))
      .catch(() => toast(t("error_occurred"), "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (profileId) return <PatientProfile patientId={profileId} role="DOCTOR" onBack={() => setProfileId(null)} />;

  const q = search.trim().toLowerCase();
  const filtered = rows.filter(
    (p) =>
      p.status !== "ARCHIVED" &&
      (!q || p.name.toLowerCase().includes(q) || (p.phone ?? "").includes(q))
  );

  return (
    <div>
      <PageHeader title={t("my_patients")} subtitle={`${filtered.length}`} />
      <input
        className="input mb-4 max-w-md"
        placeholder={t("search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <Empty icon={<FolderHeart size={40} />} text={t("no_data")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              className="card-sir p-4 text-start hover:-translate-y-0.5 transition-transform cursor-pointer"
              onClick={() => setProfileId(p.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold truncate">{p.name}</span>
                <Badge tone="blue">{p._count?.visits ?? 0}</Badge>
              </div>
              <p className="text-xs text-[var(--muted)] mt-1">{p.phone ?? "—"}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Mes statistiques ---------- */

function StatsTab() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<{
    myRevenue: number | null;
    completedToday: number;
    queueCount: number;
  } | null>(null);
  const [recent, setRecent] = useState<
    { id: string; visitDate: string; totalAmount: number; freeVisit: boolean; patient: { name: string } }[]
  >([]);

  useEffect(() => {
    api<typeof stats>("/api/stats?scope=dashboard").then(setStats).catch(() => {});
    api<{ visits: typeof recent }>("/api/visits").then((d) => setRecent(d.visits)).catch(() => {});
  }, []);

  if (!stats) return <p className="text-center p-8 text-sm text-[var(--muted)]">{t("loading")}</p>;

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthVisits = recent.filter((v) => new Date(v.visitDate) >= monthStart);

  const cards = [
    { icon: <Wallet size={18} />, label: t("revenue_this_month"), value: formatMoney(stats.myRevenue ?? 0), tone: "green" as const },
    { icon: <Users size={18} />, label: t("patients_seen"), value: String(monthVisits.length), tone: "indigo" as const },
    { icon: <CheckCircle2 size={18} />, label: t("completed_today"), value: String(stats.completedToday), tone: "gray" as const },
    { icon: <CalendarClock size={18} />, label: t("waiting_room"), value: String(stats.queueCount), tone: "amber" as const },
  ];

  return (
    <div>
      <PageHeader title={t("my_stats")} subtitle={t("quick_stats")} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.label} className={`stat-card stat-${c.tone}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted)]">{c.label}</span>
              {c.icon}
            </div>
            <p className="text-xl sm:text-2xl font-extrabold mt-1.5">{c.value}</p>
          </div>
        ))}
      </div>

      <h3 className="font-bold mb-3">{t("visits_history")}</h3>
      {recent.length === 0 ? (
        <Empty text={t("no_data")} />
      ) : (
        <div className="space-y-2">
          {recent.slice(0, 15).map((v) => (
            <div key={v.id} className="card-sir px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-sm">{v.patient.name}</p>
                <p className="text-xs text-[var(--muted)]">{formatDate(v.visitDate)}</p>
              </div>
              <span className={`font-bold text-sm ${v.freeVisit ? "text-emerald-600" : ""}`}>
                {v.freeVisit ? "🎁" : formatMoney(v.totalAmount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
