import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { deliverMessage } from "@/lib/whatsapp";

/* GET — conversations list or messages of one conversation (?conversationId=) */
export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");

  if (conversationId) {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { patient: true, messages: { orderBy: { createdAt: "asc" }, take: 200 } },
    });
    await db.message.updateMany({ where: { conversationId, direction: "IN", read: false }, data: { read: true } });
    return NextResponse.json({ conversation });
  }

  const conversations = await db.conversation.findMany({
    orderBy: { lastMessageAt: "desc" },
    include: {
      patient: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return NextResponse.json({ conversations });
}

async function upsertConversation(phone: string, patientId: string | null) {
  const existing = await db.conversation.findFirst({ where: { phone } });
  if (existing) {
    return db.conversation.update({
      where: { id: existing.id },
      data: { lastMessageAt: new Date(), ...(patientId ? { patientId } : {}) },
      include: { patient: true },
    });
  }
  return db.conversation.create({ data: { phone, ...(patientId ? { patientId } : {}) }, include: { patient: true } });
}

/* POST — send message (to one patient) or broadcast */
export async function POST(req: Request) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const content = String(body.content || "").trim();

  if (body.broadcast) {
    if (!content) return NextResponse.json({ error: "Message vide." }, { status: 400 });
    const targets =
      Array.isArray(body.patientIds) && body.patientIds.length > 0
        ? await db.patient.findMany({ where: { id: { in: body.patientIds }, status: "ACTIVE" } })
        : await db.patient.findMany({ where: { status: "ACTIVE" } });
    let sent = 0;
    let skipped = 0;
    for (const p of targets) {
      if (!p.phone) {
        skipped++;
        continue;
      }
      const conversation = await upsertConversation(p.phone, p.id);
      await deliverMessage({
        conversationId: conversation.id,
        phone: p.phone,
        body: content.replaceAll("{{name}}", p.name),
      });
      sent++;
    }
    await db.broadcast.create({ data: { content, sentCount: sent, skippedCount: skipped } });
    return NextResponse.json({ sent, skipped });
  }

  if (!body.patientId && !body.conversationId) {
    return NextResponse.json({ error: "Choisissez un patient." }, { status: 400 });
  }
  if (!content) return NextResponse.json({ error: "Message vide." }, { status: 400 });

  let conversation;
  if (body.conversationId) {
    conversation = await db.conversation.findUnique({ where: { id: body.conversationId }, include: { patient: true } });
  } else {
    const patient = await db.patient.findUnique({ where: { id: body.patientId } });
    if (!patient) return NextResponse.json({ error: "Patient introuvable." }, { status: 404 });
    if (!patient.phone) return NextResponse.json({ error: "Pas de téléphone pour ce patient." }, { status: 400 });
    conversation = await upsertConversation(patient.phone, patient.id);
  }
  if (!conversation) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  await deliverMessage({
    conversationId: conversation.id,
    phone: conversation.phone,
    body: content.replaceAll("{{name}}", conversation.patient?.name ?? ""),
  });
  return NextResponse.json({ ok: true });
}
