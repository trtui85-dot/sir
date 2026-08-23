import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  if (body.action === "void") {
    const payment = await db.payment.update({
      where: { id },
      data: { voided: true, voidReason: body.reason || null },
    });
    // recompute invoice
    if (payment.invoiceId) {
      const invoice = await db.invoice.findUnique({ where: { id: payment.invoiceId }, include: { payments: true } });
      if (invoice) {
        const activePaid = invoice.payments.filter((p) => !p.voided).reduce((s, p) => s + p.amount, 0);
        await db.invoice.update({
          where: { id: invoice.id },
          data: {
            paid: activePaid,
            status: invoice.status === "VOID" ? "VOID" : activePaid >= invoice.total - 0.001 ? "PAID" : activePaid > 0 ? "PARTIAL" : "UNPAID",
          },
        });
      }
    }
    return NextResponse.json({ payment });
  }

  if (body.action === "verify") {
    const payment = await db.payment.update({
      where: { id },
      data: { verified: true },
      include: { patient: true, invoice: true },
    });
    return NextResponse.json({ payment });
  }

  if (body.action === "reject") {
    const payment = await db.payment.delete({ where: { id } });
    return NextResponse.json({ ok: true, payment });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
