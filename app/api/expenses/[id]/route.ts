import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  if (body.action === "void") {
    const expense = await db.expense.update({
      where: { id },
      data: { voided: true, voidReason: body.reason || null },
    });
    return NextResponse.json({ expense });
  }

  const data: Record<string, unknown> = {};
  for (const k of ["label", "category", "vendor", "receiptNote"]) if (k in body) data[k] = body[k];
  if ("amount" in body) data.amount = Number(body.amount);
  if ("spentAt" in body && body.spentAt) data.spentAt = new Date(body.spentAt);
  const expense = await db.expense.update({ where: { id }, data });
  return NextResponse.json({ expense });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
