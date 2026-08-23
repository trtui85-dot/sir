import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["name", "start", "end", "active"]) if (k in body) data[k] = body[k];
  if ("mode" in body) data.mode = body.mode === "EXACT_TIME" ? "EXACT_TIME" : "FLEXIBLE";
  if ("days" in body) data.days = Array.isArray(body.days) ? body.days : [1, 2, 3, 4, 5];
  if ("capacity" in body) data.capacity = Number(body.capacity) || 1;
  if ("slotMinutes" in body) data.slotMinutes = Number(body.slotMinutes) || 30;
  const window = await db.bookingWindow.update({ where: { id }, data });
  return NextResponse.json({ window });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await db.booking.updateMany({ where: { windowId: id }, data: { windowId: null } });
    await db.bookingWindow.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
}
