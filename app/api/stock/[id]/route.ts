import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  if (body.action === "usage") {
    const qty = Number(body.quantity);
    if (!qty || qty <= 0) return NextResponse.json({ error: "Quantité invalide." }, { status: 400 });
    const item = await db.stockItem.update({
      where: { id },
      data: { quantity: { decrement: Math.min(qty, 999999) } },
    });
    return NextResponse.json({ item });
  }

  if (body.action === "restock") {
    const qty = Number(body.quantity);
    if (!qty || qty <= 0) return NextResponse.json({ error: "Quantité invalide." }, { status: 400 });
    const item = await db.stockItem.update({
      where: { id },
      data: {
        quantity: { increment: qty },
        purchaseDate: new Date(),
        ...(Number(body.unitPrice) > 0 ? { unitPrice: Number(body.unitPrice) } : {}),
        ...(body.supplier ? { supplier: body.supplier } : {}),
      },
    });
    if (Number(body.unitPrice) > 0) {
      await db.expense.create({
        data: {
          label: `Achat de stock — ${item.name}`,
          amount: qty * Number(body.unitPrice),
          category: "Fournitures médicales",
          vendor: body.supplier || null,
          isStockPurchase: true,
        },
      });
    }
    return NextResponse.json({ item });
  }

  const data: Record<string, unknown> = {};
  for (const k of ["name", "category", "unitType", "supplier", "brandNote", "batchNote"]) {
    if (k in body) data[k] = body[k];
  }
  for (const k of ["quantity", "lowStockThreshold", "unitPrice"]) {
    if (k in body) data[k] = Number(body[k]) || 0;
  }
  const item = await db.stockItem.update({ where: { id }, data });
  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  // soft delete keeps history
  const item = await db.stockItem.update({ where: { id }, data: { archived: true } });
  return NextResponse.json({ ok: true, item });
}
