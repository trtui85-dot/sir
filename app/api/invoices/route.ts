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
  if (session.role === "DOCTOR") {
    // doctors see invoices of their own patients only
    where.patient = { visits: { some: { doctorId: session.doctorProfileId ?? "" } } };
  }

  const invoices = await db.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { patient: true, payments: true },
  });
  return NextResponse.json({ invoices });
}

export async function POST(req: Request) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const items: { label: string; qty: number; unitPrice: number; tooth?: number | null }[] = body.items ?? [];
  if (!body.patientId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Ajoutez au moins une ligne." }, { status: 400 });
  }

  const subtotal = items.reduce((s: number, it: { qty: number; unitPrice: number }) => s + Number(it.qty || 1) * Number(it.unitPrice || 0), 0);
  let discountValue = Number(body.discountValue) || 0;
  const discountType = body.discountType === "PERCENT" ? "PERCENT" : body.discountType === "FREE" ? "FREE" : "AMOUNT";
  if (discountType === "PERCENT") discountValue = Math.min(discountValue, 100);
  const total =
    discountType === "FREE" ? 0 : discountType === "PERCENT" ? subtotal * (1 - discountValue / 100) : Math.max(0, subtotal - discountValue);

  const count = await db.invoice.count();
  const paidNow = Number(body.paidAmount) || 0;

  const invoice = await db.invoice.create({
    data: {
      number: count + 1001,
      patientId: body.patientId,
      itemsJson: items.map((it: { label?: string }) => ({ ...it, label: it.label || "Service" })),
      subtotal,
      discountType,
      discountValue,
      total,
      paid: Math.min(paidNow, total),
      status: total === 0 ? "PAID" : paidNow >= total ? "PAID" : paidNow > 0 ? "PARTIAL" : "UNPAID",
      note: body.note || null,
    },
    include: { patient: true },
  });

  if (paidNow > 0) {
    await db.payment.create({
      data: {
        invoiceId: invoice.id,
        patientId: body.patientId,
        amount: Math.min(paidNow, total),
        method: body.method || "CASH",
        note: "Paiement initial facture",
        createdById: session.id,
      },
    });
  }

  return NextResponse.json({ invoice });
}
