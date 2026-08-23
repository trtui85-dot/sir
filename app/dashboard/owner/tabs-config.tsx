"use client";

import { useCallback, useEffect, useState } from "react";
import { api, Badge, Empty, Field, Modal, PageHeader, useToast } from "@/components/ui";
import { formatDateTime, formatMoney, useLanguage } from "@/lib/i18n";
import { Plus, Pencil, Trash2, UserCog, Stethoscope, Send, Megaphone, Bot, Save } from "lucide-react";

/* ---------- Staff (users & permissions) ---------- */

type UserRow = {
  id: string; phone: string; name: string; role: string; active: boolean; doctorProfileId: string | null;
  permissions: Record<string, boolean> | null; doctorProfile?: { name: string } | null;
};

export function StaffTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [catalog, setCatalog] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<{
    id?: string; name: string; phone: string; password: string; role: string;
    linkDoctorProfileId: string; permissions: Record<string, boolean>;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ users: UserRow[]; permissionsCatalog: string[]; doctors: { id: string; name: string }[] }>("/api/staff");
      setUsers(d.users);
      setCatalog(d.permissionsCatalog);
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
    if (!form) return;
    try {
      if (form.id) {
        const payload: Record<string, unknown> = { name: form.name, role: form.role };
        if (form.password) payload.newPassword = form.password;
        if (form.role === "DOCTOR") payload.linkDoctorProfileId = form.linkDoctorProfileId || null;
        if (form.role === "SECRETARY") payload.permissions = form.permissions;
        await api(`/api/staff/${form.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/api/staff", { method: "POST", body: JSON.stringify(form) });
      }
      toast(t("saved"), "success");
      setForm(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  async function toggleActive(u: UserRow) {
    try {
      await api(`/api/staff/${u.id}`, { method: "PATCH", body: JSON.stringify({ action: u.active ? "deactivate" : "activate" }) });
      load();
    } catch {
      toast(t("error_occurred"), "error");
    }
  }

  return (
    <div>
      <PageHeader
        title={t("staff")}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() =>
            setForm({ name: "", phone: "", password: "", role: "SECRETARY", linkDoctorProfileId: "", permissions: {} })
          }>
            <Plus size={15} /> <span className="hidden sm:inline">{t("add")}</span>
          </button>
        }
      />

      {users.length === 0 ? <Empty icon={<UserCog size={40} />} text={t("no_data")} /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {users.map((u) => (
            <div key={u.id} className={`card-sir p-4 ${u.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-bold truncate">{u.name}</p>
                  <p className="text-xs text-[var(--muted)]">{u.phone}</p>
                </div>
                <Badge tone={u.role === "OWNER" ? "blue" : u.role === "DOCTOR" ? "green" : "orange"}>
                  {u.role}
                </Badge>
              </div>
              {u.role === "DOCTOR" && u.doctorProfile && (
                <p className="text-xs text-[var(--muted)] mb-2 flex items-center gap-1"><Stethoscope size={12} /> {u.doctorProfile.name}</p>
              )}
              {u.role === "SECRETARY" && u.permissions && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {Object.entries(u.permissions).filter(([, v]) => v).map(([k]) => (
                    <span key={k} className="badge badge-blue" style={{ fontSize: "10px" }}>{k}</span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--border)]">
                <button className="btn btn-outline btn-sm" onClick={() =>
                  setForm({
                    id: u.id, name: u.name, phone: u.phone, password: "", role: u.role,
                    linkDoctorProfileId: u.doctorProfileId ?? "",
                    permissions: u.permissions ?? {},
                  })
                }><Pencil size={13} /></button>
                <button className="btn btn-outline btn-sm" onClick={() => toggleActive(u)}>
                  {u.active ? "Désactiver" : "Activer"}
                </button>
                {!u.active && (
                  <button className="btn btn-outline btn-sm text-rose-500" onClick={async () => {
                    if (!confirm(t("confirm_delete"))) return;
                    await api(`/api/staff/${u.id}`, { method: "DELETE" });
                    load();
                  }}><Trash2 size={13} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? `${t("edit")} — ${form.name}` : `${t("add")} — équipe`}>
          <div className="space-y-3">
            <Field label={t("name")}><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label={t("phone")}><input className="input" value={form.phone} disabled={!!form.id} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label={form.id ? "Nouveau mot de passe (vide = inchangé)" : "Mot de passe (min. 8)"}>
              <input type="password" className="input" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Rôle">
              <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="SECRETARY">Secrétaire</option>
                <option value="DOCTOR">Médecin</option>
                <option value="OWNER">Propriétaire</option>
              </select>
            </Field>
            {form.role === "DOCTOR" && (
              <Field label="Profil médecin lié">
                <select className="select" value={form.linkDoctorProfileId} onChange={(e) => setForm({ ...form, linkDoctorProfileId: e.target.value })}>
                  <option value="">—</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
            )}
            {form.role === "SECRETARY" && catalog.length > 0 && (
              <Field label={t("permissions")}>
                <div className="space-y-2 border border-[var(--border)] rounded-xl p-3">
                  {catalog.map((p) => (
                    <label key={p} className="flex items-center justify-between text-sm cursor-pointer">
                      {p.replaceAll("_", " ")}
                      <input type="checkbox"
                        checked={form.permissions[p] ?? p === "edit_patients"}
                        onChange={(e) => setForm({ ...form, permissions: { ...form.permissions, [p]: e.target.checked } })}
                      />
                    </label>
                  ))}
                </div>
              </Field>
            )}
            <button className="btn btn-primary w-full" onClick={save}>{t("save")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Services & pricing ---------- */

type ServiceRow = {
  id: string; name: string; category: string; price: number; emoji: string | null;
  toothChart: boolean; isPublic: boolean; hidden: boolean;
  subItems: { name: string; price: number }[];
};

const EMPTY_SERVICE = { name: "", category: "General", price: "", emoji: "", toothChart: false, isPublic: true, subItemsText: "" };

export function ServicesTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [form, setForm] = useState<typeof EMPTY_SERVICE & { id?: string } | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ services: ServiceRow[] }>(`/api/services?includeHidden=${showHidden ? 1 : 0}`);
      setRows(d.services);
    } catch {
      toast(t("error_occurred"), "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHidden]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!form || !form.name.trim()) return;
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        category: form.category,
        price: Number(form.price) || 0,
        emoji: form.emoji || null,
        toothChart: form.toothChart,
        isPublic: form.isPublic,
        subItems: form.subItemsText
          .split("\n").map((l) => l.trim()).filter(Boolean)
          .map((line) => {
            const [name, price] = line.split(";").map((x) => x.trim());
            return { name, price: Number(price) || 0 };
          }),
      };
      if (form.id) await api(`/api/services/${form.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await api("/api/services", { method: "POST", body: JSON.stringify(payload) });
      toast(t("saved"), "success");
      setForm(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  async function remove(id: string) {
    if (!confirm(t("confirm_delete"))) return;
    await api(`/api/services/${id}`, { method: "DELETE" });
    load();
  }

  async function toggleHidden(s: ServiceRow) {
    await api(`/api/services/${s.id}`, { method: "PATCH", body: JSON.stringify({ hidden: !s.hidden }) });
    load();
  }

  return (
    <div>
      <PageHeader
        title={t("services")}
        actions={
          <>
            <button className={`btn btn-outline btn-sm ${showHidden ? "!border-[var(--primary)] !text-[var(--primary)]" : ""}`} onClick={() => setShowHidden(!showHidden)}>Masqués</button>
            <button className="btn btn-primary btn-sm" onClick={() => setForm({ ...EMPTY_SERVICE })}>
              <Plus size={15} /> <span className="hidden sm:inline">{t("add")}</span>
            </button>
          </>
        }
      />

      {rows.length === 0 ? <Empty text={t("no_data")} /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((s) => (
            <div key={s.id} className={`card-sir p-4 ${s.hidden ? "opacity-55" : ""}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-bold truncate">{s.emoji} {s.name}</p>
                <span className="font-extrabold whitespace-nowrap">{formatMoney(s.price)}</span>
              </div>
              <p className="text-xs text-[var(--muted)] mb-3">
                {s.category}{s.toothChart ? " · 🦷 schéma dentaire" : ""}{!s.isPublic ? " · privé" : ""}
                {s.subItems?.length ? ` · ${s.subItems.length} sous-items` : ""}
              </p>
              <div className="flex gap-1.5 pt-2 border-t border-[var(--border)]">
                <button className="btn btn-outline btn-sm" onClick={() => setForm({
                  id: s.id, name: s.name, category: s.category, price: String(s.price),
                  emoji: s.emoji ?? "", toothChart: s.toothChart, isPublic: s.isPublic,
                  subItemsText: (s.subItems ?? []).map((i) => `${i.name}; ${i.price}`).join("\n"),
                })}><Pencil size={13} /></button>
                <button className="btn btn-outline btn-sm" onClick={() => toggleHidden(s)}>{s.hidden ? "Afficher" : "Masquer"}</button>
                <button className="btn btn-outline btn-sm text-rose-500 ms-auto" onClick={() => remove(s.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal open onClose={() => setForm(null)} title={`${t("add")} service`} wide>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Field label={t("name")}><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <div className="grid grid-cols-[80px_1fr] gap-3">
                <Field label="Emoji"><input className="input text-center" placeholder="🦷" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} /></Field>
                <Field label="Prix (MRU)"><input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
              </div>
              <Field label="Catégorie"><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
                <input type="checkbox" checked={form.toothChart} onChange={(e) => setForm({ ...form, toothChart: e.target.checked })} />
                🦷 Ouvre le schéma dentaire
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
                <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
                Visible sur la page publique
              </label>
            </div>
            <div className="space-y-3">
              <Field label="Sous-items (nom ; prix par ligne)">
                <textarea className="textarea font-mono text-xs" rows={7} placeholder={"Composite ; 1500\nExtraction simple ; 800"} value={form.subItemsText} onChange={(e) => setForm({ ...form, subItemsText: e.target.value })} />
              </Field>
              <button className="btn btn-primary w-full" onClick={save}><Save size={15} /> {t("save")}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Booking windows ---------- */

type WindowRow = { id: string; name: string; mode: string; days: number[]; start: string; end: string; capacity: number; slotMinutes: number; active: boolean };

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const EMPTY_WINDOW = { name: "", mode: "FLEXIBLE", days: [1, 2, 3, 4, 5] as number[], start: "09:00", end: "17:00", capacity: "4", slotMinutes: "30" };

export function WindowsTab() {
  const { t } = useLanguage();
  const toast = useToast();
  const [rows, setRows] = useState<WindowRow[]>([]);
  const [form, setForm] = useState<typeof EMPTY_WINDOW | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ windows: WindowRow[] }>("/api/windows");
      setRows(d.windows);
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
      await api("/api/windows", {
        method: "POST",
        body: JSON.stringify({ ...form, capacity: Number(form.capacity), slotMinutes: Number(form.slotMinutes) }),
      });
      toast(t("saved"), "success");
      setForm(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    }
  }

  async function toggle(w: WindowRow) {
    await api(`/api/windows/${w.id}`, { method: "PATCH", body: JSON.stringify({ active: !w.active }) });
    load();
  }

  async function remove(id: string) {
    if (!confirm(t("confirm_delete"))) return;
    await api(`/api/windows/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <PageHeader
        title={t("windows")}
        subtitle="Créneaux de prise de rendez-vous"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setForm({ ...EMPTY_WINDOW })}>
            <Plus size={15} /> <span className="hidden sm:inline">{t("add")}</span>
          </button>
        }
      />

      {rows.length === 0 ? <Empty text={t("no_data")} /> : (
        <div className="space-y-3">
          {rows.map((w) => (
            <div key={w.id} className={`card-sir px-4 py-3 flex items-center justify-between gap-3 flex-wrap ${w.active ? "" : "opacity-55"}`}>
              <div>
                <p className="font-bold text-sm">{w.name}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {w.days.map((d) => DAY_NAMES[d]).join(" · ")} · {w.start}–{w.end} ·{" "}
                  {w.mode === "FLEXIBLE" ? `Flexible (${w.capacity}/créneau)` : `Exact (${w.slotMinutes} min)`}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Badge tone={w.active ? "green" : "gray"}>{w.active ? "Actif" : "Inactif"}</Badge>
                <button className="btn btn-outline btn-sm" onClick={() => toggle(w)}>{w.active ? "Off" : "On"}</button>
                <button className="btn btn-outline btn-sm text-rose-500" onClick={() => remove(w.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal open onClose={() => setForm(null)} title="Créneau">
          <div className="space-y-3">
            <Field label="Nom"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Jours">
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <button key={d}
                    className={`btn btn-sm ${form.days.includes(d) ? "btn-primary" : "btn-outline"}`}
                    onClick={() => setForm({
                      ...form,
                      days: form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d],
                    })}
                  >{DAY_NAMES[d]}</button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Début"><input type="time" className="input" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
              <Field label="Fin"><input type="time" className="input" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
            </div>
            <Field label="Mode">
              <select className="select" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                <option value="FLEXIBLE">Flexible — N patients par créneau</option>
                <option value="EXACT_TIME">Heure exacte</option>
              </select>
            </Field>
            {form.mode === "FLEXIBLE" ? (
              <Field label="Capacité par créneau"><input type="number" className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Field>
            ) : (
              <Field label="Minutes par rendez-vous"><input type="number" className="input" value={form.slotMinutes} onChange={(e) => setForm({ ...form, slotMinutes: e.target.value })} /></Field>
            )}
            <button className="btn btn-primary w-full" onClick={save}>{t("save")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
