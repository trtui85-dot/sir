import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payments = await db.staffPayment.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true },
  });
  const users = await db.user.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ payments, users });
}

export async function POST(req: Request) {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.userId || !body.amount || Number(body.amount) <= 0 || !body.month) {
    return NextResponse.json({ error: "Personne, mois et montant requis." }, { status: 400 });
  }
  const payment = await db.staffPayment.create({
    data: {
      userId: body.userId,
      amount: Number(body.amount),
      month: String(body.month),
      note: body.note || null,
    },
    include: { user: true },
  });

  // auto-expense
  await db.expense.create({
    data: {
      label: `Paiement du personnel — ${payment.user.name} (${payment.month})`,
      amount: Number(body.amount),
      category: "Salaires",
      receiptNote: body.note || null,
    },
  });

  return NextResponse.json({ payment });
}
