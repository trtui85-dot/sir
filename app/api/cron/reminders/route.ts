import { db } from "@/lib/db";
import { deliverMessage, renderStoredTemplate } from "@/lib/whatsapp";

/*
 * Cron Vercel — envoie les rappels de rendez-vous.
 * Protégé par CRON_SECRET (Vercel envoie Authorization: Bearer <CRON_SECRET>).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const key = new URL(req.url).searchParams.get("key");
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const settings = await db.clinicSetting.findUnique({ where: { id: "main" } });
  const r1h = Math.max(0, settings?.reminder1Hours ?? 1);
  const r2h = Math.max(0, settings?.reminder2Hours ?? 48);
  if (!settings || (r1h === 0 && r2h === 0)) {
    return Response.json({ skipped: "reminders disabled" });
  }

  const now = Date.now();
  const horizon = now + Math.max(r1h, r2h) * 3600_000;
  const bookings = await db.booking.findMany({
    where: {
      status: { in: ["PENDING_CONFIRMATION", "CONFIRMED"] },
      date: { gte: new Date(now), lte: new Date(horizon) },
    },
    include: { patient: true, doctor: true },
  });

  let sent1 = 0;
  let sent2 = 0;

  for (const b of bookings) {
    if (!b.patient?.phone) continue;
    const hoursUntil = (new Date(b.date).getTime() - now) / 3600_000;

    /* Rappel principal (ex. 1h avant) */
    if (r1h > 0 && !b.reminded1At && hoursUntil <= r1h) {
      const body = await renderStoredTemplate("session_reminder", {
        name: b.patient.name.split(" ")[0],
        clinic: settings.clinicName,
        date: b.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
        time: b.time ?? "",
      });
      const convo = await db.conversation.findFirst({ where: { phone: b.patient.phone } });
      await deliverMessage({ conversationId: convo?.id ?? "__none__", phone: b.patient.phone, body });
      await db.booking.update({ where: { id: b.id }, data: { reminded1At: new Date() } });
      sent1++;
      continue;
    }

    /* Rappel anticipé (ex. 48h avant) */
    if (r2h > 0 && !b.reminded2At && hoursUntil <= r2h && hoursUntil > r1h) {
      const body = await renderStoredTemplate("session_reminder", {
        name: b.patient.name.split(" ")[0],
        clinic: settings.clinicName,
        date: b.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
        time: b.time ?? "",
      });
      const convo = await db.conversation.findFirst({ where: { phone: b.patient.phone } });
      await deliverMessage({ conversationId: convo?.id ?? "__none__", phone: b.patient.phone, body });
      await db.booking.update({ where: { id: b.id }, data: { reminded2At: new Date() } });
      sent2++;
    }
  }

  return Response.json({ ok: true, reminderShort: sent1, reminderLong: sent2 });
}
