import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["name", "category", "hidden", "toothChart", "isPublic"]) {
    if (k in body) data[k] = body[k];
  }
  if ("price" in body) data.price = Number(body.price) || 0;
  if ("emoji" in body) data.emoji = body.emoji || null;
  if ("subItems" in body) data.subItems = Array.isArray(body.subItems) ? body.subItems : [];
  if ("sortOrder" in body) data.sortOrder = Number(body.sortOrder) || 0;
  const service = await db.service.update({ where: { id }, data });
  return NextResponse.json({ service });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  // soft-delete: hide but keep for accounting history
  const service = await db.service.update({ where: { id }, data: { hidden: true } });
  return NextResponse.json({ service });
}
