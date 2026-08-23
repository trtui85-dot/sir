import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  if (status) where.status = status;
  if (session.role === "DOCTOR" && session.doctorProfileId) where.doctorId = session.doctorProfileId;

  const plans = await db.treatmentPlan.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { patient: true, doctor: true },
  });
  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const items: { label: string; tooth?: number | null; price: number }[] = body.items ?? [];
  const total = items.reduce((s, it) => s + Number(it.price || 0), 0);
  const sessionsTotal = Math.max(1, Number(body.sessionsTotal) || 1);
  const discount = Number(body.discountValue) || 0;
  const net = Math.max(0, total - discount);

  if (!body.patientId) return NextResponse.json({ error: "Patient requis." }, { status: 400 });
  if (net <= 0 && !body.free) return NextResponse.json({ error: "Définissez un prix supérieur à zéro." }, { status: 400 });

  const plan = await db.treatmentPlan.create({
    data: {
      patientId: body.patientId,
      doctorId: session.role === "DOCTOR" ? session.doctorProfileId : body.doctorId || null,
      name: body.name?.trim() || "Plan de traitement",
      description: body.description || null,
      itemsJson: items.map((it) => ({ ...it, label: it.label || "Traitement" })),
      totalAmount: net,
      discountValue: discount,
      sessionsTotal,
      sessionAmount: sessionsTotal === 1 ? net : Math.round((net / sessionsTotal) * 100) / 100,
      status: "IN_PROGRESS",
    },
    include: { patient: true },
  });
  return NextResponse.json({ plan });
}
