import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const invoice = await db.invoice.findUnique({ where: { id }, include: { payments: true } });
  if (!invoice) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });

  const activePaid = invoice.payments.filter((p) => !p.voided).reduce((s, p) => s + p.amount, 0);

  if (body.action === "add-payment") {
    const amount = Number(body.amount);
    if (!amount || amount <= 0) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
    const remaining = Math.max(0, invoice.total - activePaid);
    if (amount > remaining + 0.001) {
      return NextResponse.json({ error: `Le montant dépasse le reste à payer (${remaining}).` }, { status: 400 });
    }
    await db.payment.create({
      data: {
        invoiceId: invoice.id,
        patientId: invoice.patientId,
        amount,
        method: body.method || "CASH",
        note: body.note || null,
        createdById: session.id,
      },
    });
    const newPaid = activePaid + amount;
    const updated = await db.invoice.update({
      where: { id },
      data: { paid: newPaid, status: newPaid >= invoice.total - 0.001 ? "PAID" : "PARTIAL" },
    });
    return NextResponse.json({ invoice: updated });
  }

  if (body.action === "void") {
    const updated = await db.invoice.update({
      where: { id },
      data: { status: "VOID", voidedAt: new Date() },
    });
    return NextResponse.json({ invoice: updated });
  }

  if (body.status === "UNPAID" || body.status === "PAID") {
    const updated = await db.invoice.update({ where: { id }, data: { status: body.status } });
    return NextResponse.json({ invoice: updated });
  }

  // full edit of items
  const items = body.items;
  if (Array.isArray(items)) {
    const subtotal = items.reduce((s: number, it: { qty: number; unitPrice: number }) => s + Number(it.qty || 1) * Number(it.unitPrice || 0), 0);
    let discountValue = Number(body.discountValue ?? invoice.discountValue) || 0;
    const discountType = body.discountType ?? invoice.discountType;
    const total =
      discountType === "FREE" ? 0 : discountType === "PERCENT"
        ? subtotal * (1 - Math.min(discountValue, 100) / 100)
        : Math.max(0, subtotal - discountValue);
    const updated = await db.invoice.update({
      where: { id },
      data: {
        itemsJson: items,
        subtotal,
        discountType,
        discountValue,
        total,
        status: total === 0 ? "PAID" : activePaid >= total - 0.001 ? "PAID" : activePaid > 0 ? "PARTIAL" : "UNPAID",
        note: body.note ?? invoice.note,
      },
    });
    return NextResponse.json({ invoice: updated });
  }

  return NextResponse.json({ invoice });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await db.payment.deleteMany({ where: { invoiceId: id } });
    await db.invoice.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
}
