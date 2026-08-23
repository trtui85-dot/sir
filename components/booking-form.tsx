"use client";

import { useEffect, useState } from "react";
import { api, Field, Modal, useToast } from "@/components/ui";
import { useLanguage, formatMoney } from "@/lib/i18n";

export function BookingForm({
  open,
  onClose,
  onSaved,
  editBooking,
  presetPatientId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editBooking?: Record<string, unknown> | null;
  presetPatientId?: string;
}) {
  const { t } = useLanguage();
  const toast = useToast();
  const [patients, setPatients] = useState<{ id: string; name: string; phone: string | null; status: string }[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [windows, setWindows] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);

  const [mode, setMode] = useState<"existing" | "new">(presetPatientId ? "existing" : "existing");
  const [patientId, setPatientId] = useState(presetPatientId ?? "");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [doctorId, setDoctorId] = useState(editBooking?.doctorId as string ?? "");
  const [windowId, setWindowId] = useState(editBooking?.windowId as string ?? "");
  const [date, setDate] = useState(
    typeof editBooking?.date === "string"
      ? new Date(editBooking.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [time, setTime] = useState((editBooking?.time as string) ?? "");
  const [reason, setReason] = useState((editBooking?.reason as string) ?? "");
  const [secretaryNotes, setSecretaryNotes] = useState((editBooking?.secretaryNotes as string) ?? "");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    api<{ patients: { id: string; name: string; phone: string | null; status: string }[] }>("/api/patients?status=ACTIVE")
      .then((d) => setPatients(d.patients))
      .catch(() => {});
    api<{ doctors: { id: string; name: string }[] }>("/api/doctors").then((d) => setDoctors(d.doctors)).catch(() => {});
    api<{ windows: { id: string; name: string }[] }>("/api/windows").then((d) => setWindows(d.windows)).catch(() => {});
    api<{ services: { id: string; name: string }[] }>("/api/services").then((d) => setServices(d.services)).catch(() => {});
  }, [open]);

  const filtered = patients.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone ?? "").includes(search)
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let finalPatientId = patientId;

      if (editBooking) {
        await api(`/api/bookings/${editBooking.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            date,
            time: time || null,
            doctorId: doctorId || null,
            windowId: windowId || null,
            reason,
            secretaryNotes,
          }),
        });
        toast(t("booking_updated"), "success");
        onSaved();
        onClose();
        return;
      }

      if (mode === "new") {
        if (!newName.trim()) {
          toast(t("patient_directory") + " : nom requis", "error");
          setBusy(false);
          return;
        }
        const created = await api<{ patient: { id: string } }>("/api/patients", {
          method: "POST",
          body: JSON.stringify({ name: newName, phone: newPhone || undefined }),
        });
        finalPatientId = created.patient.id;
      }

      if (!finalPatientId) {
        toast(t("choose_patient"), "error");
        setBusy(false);
        return;
      }

      await api("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          patientId: finalPatientId,
          doctorId: doctorId || null,
          windowId: windowId || null,
          date,
          time: time || null,
          reason,
          secretaryNotes,
        }),
      });
      toast(t("booking_created"), "success");
      onSaved();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error_occurred"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editBooking ? t("edit_booking") : t("new_booking")}
    >
      <form onSubmit={submit} className="space-y-4">
        {!editBooking && (
          <>
            {!presetPatientId && (
              <div className="flex gap-2 p-1 rounded-xl bg-[var(--bg)] w-fit">
                <button type="button" className={`btn btn-sm ${mode === "existing" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("existing")}>
                  {t("choose_existing_patient")}
                </button>
                <button type="button" className={`btn btn-sm ${mode === "new" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("new")}>
                  {t("create_new_patient")}
                </button>
              </div>
            )}

            {(mode === "existing" || presetPatientId) && !presetPatientId && (
              <Field label={t("choose_patient")}>
                <input className="input mb-2" placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="select" value={patientId} onChange={(e) => setPatientId(e.target.value)} required={!presetPatientId}>
                  <option value="">—</option>
                  {filtered.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.phone ? `· ${p.phone}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {presetPatientId && (
              <p className="text-sm bg-[var(--primary-soft)] text-[var(--primary)] rounded-xl px-3 py-2 font-medium">
                {patients.find((p) => p.id === presetPatientId)?.name ?? "…"}
              </p>
            )}

            {mode === "new" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("name")}>
                  <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                </Field>
                <Field label={`${t("phone")} (${t("optional")})`}>
                  <input className="input" dir="ltr" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                </Field>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("date")}>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label={`${t("time")} (${t("optional")})`}>
            <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t("choose_doctor")}>
            <select className="select" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">—</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label={t("choose_window")}>
            <select className="select" value={windowId} onChange={(e) => setWindowId(e.target.value)}>
              <option value="">—</option>
              {windows.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={`${t("description")} (${t("optional")})`}>
          <select className="select mb-2" value="" onChange={(e) => e.target.value && setReason(e.target.value)}>
            <option value="">—</option>
            {services.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
          <input className="input" placeholder={t("description")} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>

        <Field label={t("secretary_notes")}>
          <textarea className="textarea" rows={2} value={secretaryNotes} onChange={(e) => setSecretaryNotes(e.target.value)} />
        </Field>

        <button className="btn btn-primary w-full py-3" disabled={busy}>
          {busy ? "…" : t("save")}
        </button>
      </form>
    </Modal>
  );
}

export function PriceBadge({ amount }: { amount: number }) {
  return <span className="font-bold tabular-nums">{formatMoney(amount)}</span>;
}
