import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  for (const k of ["status", "time", "reason", "secretaryNotes"]) {
    if (k in body) data[k] = body[k];
  }
  if ("date" in body && body.date) data.date = new Date(body.date);
  if ("doctorId" in body) data.doctorId = body.doctorId || null;
  if ("windowId" in body) data.windowId = body.windowId || null;
  if (body.status === "COMPLETED") data.completedAt = new Date();

  const booking = await db.booking.update({
    where: { id },
    data,
    include: { patient: true, doctor: true },
  });
  return NextResponse.json({ booking });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    // keep visit links consistent
    await db.visit.updateMany({ where: { bookingId: id }, data: { bookingId: null } });
    await db.booking.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
}
