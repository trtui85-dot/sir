import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const status = searchParams.get("status");
  const patientId = searchParams.get("patientId");

  const where: Record<string, unknown> = {};
  if (date) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    where.date = { gte: d, lt: next };
  }
  if (status) where.status = status;
  if (patientId) where.patientId = patientId;
  if (session.role === "DOCTOR" && session.doctorProfileId) where.doctorId = session.doctorProfileId;

  const bookings = await db.booking.findMany({
    where,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: { patient: true, doctor: true, window: true },
  });
  return NextResponse.json({ bookings });
}

export async function POST(req: Request) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.patientId || !body.date) {
    return NextResponse.json({ error: "Patient et date requis." }, { status: 400 });
  }

  // prevent duplicate active booking same day
  const dayStart = new Date(body.date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const existing = await db.booking.findFirst({
    where: {
      patientId: body.patientId,
      date: { gte: dayStart, lt: dayEnd },
      status: { in: ["PENDING_CONFIRMATION", "CONFIRMED", "IN_WAITING_ROOM", "IN_TREATMENT"] },
    },
  });

  const booking = await db.booking.create({
    data: {
      patientId: body.patientId,
      doctorId: body.doctorId || null,
      windowId: body.windowId || null,
      date: new Date(body.date),
      time: body.time || null,
      reason: body.reason || null,
      secretaryNotes: body.secretaryNotes || null,
      status: body.status || "CONFIRMED",
      source: "MANUAL",
    },
    include: { patient: true, doctor: true },
  });

  return NextResponse.json({ booking, warning: existing ? "Ce patient a déjà un rendez-vous ce jour." : null });
}
