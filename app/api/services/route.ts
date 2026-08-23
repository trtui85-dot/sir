import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const includeHidden = searchParams.get("includeHidden") === "1";

  const services = await db.service.findMany({
    where: includeHidden ? {} : { hidden: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ services });
}

export async function POST(req: Request) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Nom du service requis." }, { status: 400 });

  const last = await db.service.findFirst({ orderBy: { sortOrder: "desc" } });
  const service = await db.service.create({
    data: {
      name: String(body.name).trim(),
      category: body.category || "General",
      price: Number(body.price) || 0,
      emoji: body.emoji || null,
      toothChart: !!body.toothChart,
      isPublic: body.isPublic !== false,
      subItems: Array.isArray(body.subItems) ? body.subItems : [],
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  return NextResponse.json({ service });
}
