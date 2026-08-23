import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

/* GET ?patientId=xxx — visit history */
export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");

  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  else if (session.role === "DOCTOR" && session.doctorProfileId) where.doctorId = session.doctorProfileId;

  const visits = await db.visit.findMany({
    where,
    orderBy: { visitDate: "desc" },
    take: 300,
    include: { patient: true, doctor: true },
  });
  return NextResponse.json({ visits });
}

/* POST — create consultation (from booking or manual) and finalize it in one step */
export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  if (!body.patientId) return NextResponse.json({ error: "Patient requis." }, { status: 400 });
  if (!Array.isArray(body.services) || body.services.length === 0) {
    return NextResponse.json({ error: "Sélectionnez au moins un service." }, { status: 400 });
  }

  const services = body.services.map(
    (s: { id?: string; label: string; price: number; tooth?: number | null }) => ({
      ...s,
      label: s.label || "Service",
      price: Number(s.price) || 0,
    })
  );
  const total = services.reduce((sum: number, s: { price: number }) => sum + Number(s.price || 0), 0);
  const freeVisit = !!body.freeVisit;

  // link booking
  let bookingId = body.bookingId || null;
  if (!bookingId && body.linkLatestBooking !== false) {
    const latest = await db.booking.findFirst({
      where: {
        patientId: body.patientId,
        status: { in: ["IN_WAITING_ROOM", "IN_TREATMENT", "CONFIRMED", "PENDING_CONFIRMATION"] },
        date: { lte: new Date() },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    bookingId = latest?.id ?? null;
  }

  const visit = await db.visit.create({
    data: {
      patientId: body.patientId,
      doctorId: session.role === "DOCTOR" ? session.doctorProfileId : body.doctorId || null,
      bookingId,
      servicesJson: services,
      teeth: Array.isArray(body.teeth) ? body.teeth : [],
      rawNotes: body.rawNotes || null,
      aiNotes: body.aiNotes || null,
      finalNotes: body.finalNotes || null,
      totalAmount: freeVisit ? 0 : total,
      paidAmount: Number(body.paidAmount) || 0,
      freeVisit,
      status: "COMPLETED",
      visitDate: new Date(),
    },
    include: { patient: true, doctor: true },
  });

  if (bookingId) {
    await db.booking.update({
      where: { id: bookingId },
      data: { status: "COMPLETED", completedAt: new Date() },
    }).catch(() => {});
  }

  return NextResponse.json({ visit });
}
