import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter");

  const where: Record<string, unknown> = {};
  if (filter === "pending") {
    where.verified = false;
    where.voided = false;
  } else if (filter === "voided") {
    where.voided = true;
  } else {
    where.voided = false;
  }

  const payments = await db.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { patient: true, invoice: true },
  });
  return NextResponse.json({ payments });
}

export async function POST(req: Request) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const amount = Number(body.amount);
  if (!amount || amount <= 0) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });

  // allocate to oldest unpaid invoice of the patient first
  let invoiceId: string | null = null;
  if (body.patientId) {
    const invoices = await db.invoice.findMany({
      where: { patientId: body.patientId, status: { in: ["UNPAID", "PARTIAL"] } },
      orderBy: { createdAt: "asc" },
      include: { payments: true },
    });
    for (const inv of invoices) {
      const activePaid = inv.payments.filter((p) => !p.voided).reduce((s, p) => s + p.amount, 0);
      if (activePaid < inv.total - 0.001) {
        invoiceId = inv.id;
        break;
      }
    }
  }

  const payment = await db.payment.create({
    data: {
      patientId: body.patientId || null,
      invoiceId,
      amount,
      method: body.method || "CASH",
      note: body.note || null,
      screenshotUrl: body.screenshotUrl || null,
      verified: body.verified !== false,
      createdById: session.id,
    },
    include: { invoice: true },
  });

  if (invoiceId && body.applyToInvoice !== false) {
    const invoice = payment.invoice;
    if (invoice) {
      const activePaid = (await db.payment.aggregate({
        _sum: { amount: true },
        where: { invoiceId, voided: false },
      }))._sum.amount ?? 0;
      await db.invoice.update({
        where: { id: invoiceId },
        data: {
          paid: activePaid,
          status: activePaid >= invoice.total - 0.001 ? "PAID" : "PARTIAL",
        },
      });
    }
  }

  return NextResponse.json({ payment });
}
