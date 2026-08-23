import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM

  const where: Record<string, unknown> = {};
  if (month) {
    const start = new Date(`${month}-01T00:00:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    where.spentAt = { gte: start, lt: end };
  }

  const expenses = await db.expense.findMany({
    where,
    orderBy: { spentAt: "desc" },
    take: 300,
  });
  return NextResponse.json({ expenses });
}

export async function POST(req: Request) {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.label?.trim() || !body.amount || Number(body.amount) <= 0) {
    return NextResponse.json({ error: "Libellé et montant (>0) requis." }, { status: 400 });
  }
  const expense = await db.expense.create({
    data: {
      label: String(body.label).trim(),
      amount: Number(body.amount),
      category: body.category || "Autre",
      vendor: body.vendor || null,
      receiptNote: body.receiptNote || null,
      linkedPatientId: body.linkedPatientId || null,
      linkedDoctorId: body.linkedDoctorId || null,
      isStockPurchase: !!body.isStockPurchase,
      spentAt: body.spentAt ? new Date(body.spentAt) : new Date(),
    },
  });
  return NextResponse.json({ expense });
}
