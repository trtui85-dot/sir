import { Prisma } from "@prisma/client";
import { db } from "./db";
import { deliverMessage, getOrCreateConversation, normalizePhone, renderStoredTemplate, sendWhatsAppText } from "./whatsapp";

type BotState = { step: string; options?: string[]; date?: string } | null;

const ACTIVE_STATUSES: ("PENDING_CONFIRMATION" | "CONFIRMED" | "IN_WAITING_ROOM" | "IN_TREATMENT")[] = ["PENDING_CONFIRMATION", "CONFIRMED", "IN_WAITING_ROOM", "IN_TREATMENT"];

async function clinicName(): Promise<string> {
  const s = await db.clinicSetting.findUnique({ where: { id: "main" } });
  return s?.clinicName || "SIR";
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

/* Available slots for an ISO date across all active windows */
async function slotsForDate(ymd: string): Promise<{ time: string; windowId: string }[]> {
  const dow = new Date(ymd + "T00:00:00Z").getUTCDay();
  const windows = await db.bookingWindow.findMany({ where: { active: true } });
  const dayBookings = await db.booking.findMany({
    where: {
      date: { gte: new Date(ymd + "T00:00:00Z"), lt: new Date(ymd + "T23:59:59Z") },
      status: { in: ACTIVE_STATUSES },
    },
    select: { time: true, windowId: true },
  });

  const out: { time: string; windowId: string }[] = [];
  for (const w of windows) {
    if (!w.days.includes(dow)) continue;
    const [sh, sm] = w.start.split(":").map(Number);
    const [eh, em] = w.end.split(":").map(Number);
    for (let cur = sh * 60 + sm; cur < eh * 60 + em; cur += w.slotMinutes) {
      const time = `${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`;
      const taken = dayBookings.filter((b) => b.windowId === w.id && b.time === time).length;
      if (w.mode === "FLEXIBLE" ? taken < w.capacity : taken === 0) {
        out.push({ time, windowId: w.id });
      }
    }
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

async function daysWithSlots(): Promise<string[]> {
  const days: string[] = [];
  const now = new Date();
  for (let i = 1; i <= 14 && days.length < 7; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i));
    const ymd = d.toISOString().slice(0, 10);
    if ((await slotsForDate(ymd)).length > 0) days.push(ymd);
  }
  return days;
}

export async function notifyAdmins(text: string): Promise<void> {
  const s = await db.clinicSetting.findUnique({ where: { id: "main" } });
  const phones = s?.adminPhones ?? [];
  for (const p of phones) {
    const r = await sendWhatsAppText(p, text);
    if (!r.ok) console.warn("[whatsapp] admin notify failed:", r.error);
  }
}

/*
 * Main entry: process one incoming WhatsApp message.
 * waId = sender phone digits (e.g. 22236112233)
 */
export async function handleIncomingWhatsApp(waId: string, rawText: string, pushName?: string): Promise<void> {
  const text = rawText.trim();
  const phone = "+" + normalizePhone(waId);

  let patient = await db.patient.findFirst({ where: { phone } });
  if (!patient) {
    patient = await db.patient.create({
      data: { name: pushName?.trim() || "Patient WhatsApp", phone },
    });
  }

  const convo = await getOrCreateConversation(phone, patient.id);
  await db.message.create({
    data: { conversationId: convo.id, direction: "IN", body: text },
  });
  await db.conversation.update({
    where: { id: convo.id },
    data: { lastMessageAt: new Date(), patientId: patient.id },
  });

  const clinic = await clinicName();
  const name = patient.name.split(" ")[0];
  const state = (convo.botState as BotState) ?? null;
  const upper = text.toUpperCase();

  /* ANNULER — cancel the next upcoming booking (any step) */
  if (upper.startsWith("ANNULER")) {
    const upcoming = await db.booking.findFirst({
      where: { patientId: patient.id, status: { in: ["PENDING_CONFIRMATION", "CONFIRMED"] }, date: { gte: new Date() } },
      orderBy: { date: "asc" },
    });
    if (upcoming) {
      await db.booking.update({ where: { id: upcoming.id }, data: { status: "CANCELLED" } });
      await deliverMessage({
        conversationId: convo.id,
        phone,
        body: `Votre rendez-vous du ${fmtDay(upcoming.date)} à ${upcoming.time ?? ""} a été annulé. Envoyez MENU pour reprendre un rendez-vous.`,
      });
    } else {
      await deliverMessage({ conversationId: convo.id, phone, body: `Vous n'avez aucun rendez-vous à venir. Envoyez 1 pour en prendre un.` });
    }
    await db.conversation.update({ where: { id: convo.id }, data: { botState: Prisma.DbNull } });
    return;
  }

  if (upper === "MENU" || !state || state.step === "menu" || /^(bonjour|salut|hi|hello|salam)/i.test(text)) {
    if (upper === "1") return void (await startPickDay(convo.id, phone));
    if (upper === "2") return void (await showMyBookings(convo.id, phone, patient.id));
    if (upper === "3" || /humain|agent|personne/i.test(text)) return void (await handoffHuman(convo.id, phone, patient.name, text));

    await db.conversation.update({
      where: { id: convo.id },
      data: { botState: { step: "menu" } },
    });
    await deliverMessage({
      conversationId: convo.id,
      phone,
      body: `Bonjour ${name} 👋 Bienvenue chez ${clinic}.\n\n1️⃣ Prendre rendez-vous\n2️⃣ Mes rendez-vous\n3️⃣ Parler à un humain\n\n(ANNULER = annuler votre prochain RDV)`,
    });
    return;
  }

  if (state.step === "pick_day" && Array.isArray(state.options)) {
    const idx = parseInt(text, 10) - 1;
    const ymd = state.options[idx];
    if (!ymd) {
      await deliverMessage({ conversationId: convo.id, phone, body: "Répondez avec le numéro du jour (ex: 1)." });
      return;
    }
    const slots = await slotsForDate(ymd);
    const list = slots.slice(0, 12).map((s, i) => `${i + 1}️⃣ ${s.time}`).join("\n");
    await db.conversation.update({
      where: { id: convo.id },
      data: { botState: { step: "pick_time", date: ymd, options: slots.slice(0, 12).map((s) => JSON.stringify(s)) } },
    });
    await deliverMessage({
      conversationId: convo.id,
      phone,
      body: `Horaires disponibles le ${fmtDay(new Date(ymd + "T00:00:00Z"))} :\n\n${list}\n\n(Répondez MENU pour recommencer)`,
    });
    return;
  }

  if (state.step === "pick_time" && state.date && Array.isArray(state.options)) {
    const idx = parseInt(text, 10) - 1;
    const raw = state.options[idx];
    if (!raw) {
      await deliverMessage({ conversationId: convo.id, phone, body: "Répondez avec le numéro de l'horaire (ex: 1)." });
      return;
    }
    const slot = JSON.parse(raw) as { time: string; windowId: string };
    const dateUtc = new Date(state.date + "T" + slot.time + ":00Z");
    const booking = await db.booking.create({
      data: {
        patientId: patient.id,
        windowId: slot.windowId,
        date: dateUtc,
        time: slot.time,
        reason: "Pris via WhatsApp",
        source: "WHATSAPP",
        status: "PENDING_CONFIRMATION",
      },
    });
    await db.conversation.update({ where: { id: convo.id }, data: { botState: Prisma.DbNull } });
    const confirmation = await renderStoredTemplate("booking_confirmation", {
      name,
      clinic,
      date: fmtDay(new Date(booking.date)),
      time: booking.time ?? "",
    });
    await deliverMessage({ conversationId: convo.id, phone, body: "✅ " + confirmation });
    await notifyAdmins(`🤖 Nouveau RDV WhatsApp : ${patient.name} — ${fmtDay(new Date(booking.date))} ${slot.time}`);
    return;
  }

  /* fallback */
  await db.conversation.update({ where: { id: convo.id }, data: { botState: Prisma.DbNull } });
  await deliverMessage({ conversationId: convo.id, phone, body: `Désolé, je n'ai pas compris 🙏\nEnvoyez MENU pour voir les options.` });
}

async function startPickDay(convoId: string, phone: string): Promise<void> {
  const days = await daysWithSlots();
  if (days.length === 0) {
    await deliverMessage({ conversationId: convoId, phone, body: "Aucun créneau disponible pour le moment. Réessayez plus tard." });
    return;
  }
  const list = days.map((d, i) => `${i + 1}️⃣ ${fmtDay(new Date(d + "T00:00:00Z"))}`).join("\n");
  await db.conversation.update({
    where: { id: convoId },
    data: { botState: { step: "pick_day", options: days } },
  });
  await deliverMessage({ conversationId: convoId, phone, body: `Choisissez un jour :\n\n${list}` });
}

async function showMyBookings(convoId: string, phone: string, patientId: string): Promise<void> {
  const bookings = await db.booking.findMany({
    where: { patientId, status: { in: ["PENDING_CONFIRMATION", "CONFIRMED"] }, date: { gte: new Date() } },
    orderBy: { date: "asc" },
    take: 5,
  });
  const body =
    bookings.length === 0
      ? `Vous n'avez aucun rendez-vous à venir.\nEnvoyez 1 pour en prendre un.`
      : `Vos prochains rendez-vous :\n\n` +
        bookings.map((b) => `📅 ${fmtDay(new Date(b.date))} à ${b.time ?? ""} (${b.status === "PENDING_CONFIRMATION" ? "en attente" : "confirmé"})`).join("\n") +
        `\n\n(ANNULER pour annuler le prochain)`;
  await db.conversation.update({ where: { id: convoId }, data: { botState: Prisma.DbNull } });
  await deliverMessage({ conversationId: convoId, phone, body });
}

async function handoffHuman(convoId: string, phone: string, patientName: string, originalText: string): Promise<void> {
  await db.conversation.update({ where: { id: convoId }, data: { botState: Prisma.DbNull } });
  await deliverMessage({
    conversationId: convoId,
    phone,
    body: `Pas de souci 🙏 Un membre de notre équipe va vous répondre ici même très bientôt.`,
  });
  await db.message.updateMany({
    where: { conversationId: convoId, direction: "IN" },
    data: { pendingReview: true },
  });
  await notifyAdmins(`💬 ${patientName} demande un humain sur WhatsApp :\n"${originalText}"`);
}
