import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const DEFAULTS: { key: string; label: string; content: string }[] = [
  {
    key: "welcome",
    label: "Message de bienvenue",
    content: "Bonjour {{name}} 👋 Bienvenue à la clinique {{clinic}}. Votre dossier a été créé. À bientôt !",
  },
  {
    key: "booking_confirmation",
    label: "Confirmation de rendez-vous",
    content: "Bonjour {{name}}, votre rendez-vous à {{clinic}} est confirmé pour le {{date}} à {{time}}. Répondez ANNULER pour annuler.",
  },
  {
    key: "cancellation",
    label: "Notification d'annulation",
    content: "Bonjour {{name}}, votre rendez-vous du {{date}} à {{clinic}} a été annulé. Contactez-nous pour reprogrammer.",
  },
  {
    key: "reschedule",
    label: "Notification de changement",
    content: "Bonjour {{name}}, votre rendez-vous à {{clinic}} a été déplacé au {{date}} à {{time}}.",
  },
  {
    key: "payment_reminder",
    label: "Rappel de paiement",
    content: "Bonjour {{name}}, il reste un solde de {{balance}} pour vos soins à {{clinic}}. Merci de régulariser.",
  },
  {
    key: "session_reminder",
    label: "Rappel de séance de traitement",
    content: "Bonjour {{name}}, rappel : votre séance à {{clinic}} est prévue le {{date}} à {{time}}.",
  },
  {
    key: "fully_paid",
    label: "Avis de paiement intégral",
    content: "Merci {{name}} ! Vos paiements sont complets. {{clinic}} vous remercie pour votre confiance 🙏",
  },
];

async function ensureTemplates() {
  const count = await db.messageTemplate.count();
  if (count === 0) {
    await db.messageTemplate.createMany({ data: DEFAULTS });
  }
}

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTemplates();
  const templates = await db.messageTemplate.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ templates });
}

export async function PATCH(req: Request) {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  await ensureTemplates();
  const template = await db.messageTemplate.update({
    where: { key: body.key },
    data: { content: body.content, enabled: body.enabled !== false },
  });
  return NextResponse.json({ template });
}
