import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const lowOnly = searchParams.get("low") === "1";

  const items = await db.stockItem.findMany({
    where: {
      archived: false,
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ items: lowOnly ? items.filter((i) => i.quantity <= i.lowStockThreshold) : items });
}

export async function POST(req: Request) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Nom de l'article requis." }, { status: 400 });

  const quantity = Number(body.quantity) || 0;
  const unitPrice = Number(body.unitPrice) || 0;

  const item = await db.stockItem.create({
    data: {
      name: String(body.name).trim(),
      category: body.category || "Consumables",
      unitType: body.unitType || "piece",
      quantity,
      lowStockThreshold: Number(body.lowStockThreshold) || 5,
      supplier: body.supplier || null,
      brandNote: body.brandNote || null,
      batchNote: body.batchNote || null,
      unitPrice,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
    },
  });

  // stock purchase auto-expense
  if (unitPrice > 0 && quantity > 0) {
    await db.expense.create({
      data: {
        label: `Achat de stock — ${item.name}`,
        amount: quantity * unitPrice,
        category: "Fournitures médicales",
        vendor: body.supplier || null,
        isStockPurchase: true,
      },
    });
  }
  return NextResponse.json({ item });
}
