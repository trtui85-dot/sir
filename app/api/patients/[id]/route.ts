import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

async function getPatient(id: string) {
  return db.patient.findUnique({
    where: { id },
    include: {
      visits: {
        orderBy: { visitDate: "desc" },
        include: { doctor: true },
      },
      bookings: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: { doctor: true, window: true },
      },
      treatmentPlans: { orderBy: { createdAt: "desc" }, include: { doctor: true } },
      prescriptions: { orderBy: { createdAt: "desc" } },
      medicalNotes: { orderBy: { createdAt: "desc" } },
      toothConditions: true,
      invoices: { orderBy: { createdAt: "desc" }, include: { payments: true } },
      payments: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  return NextResponse.json({ patient });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  for (const key of ["name", "phone", "gender", "address", "medicalBackground", "doctorPreference", "status", "internalNote"]) {
    if (key in body) data[key] = body[key];
  }
  if ("age" in body) data.age = body.age ? Number(body.age) : null;
  if (session.role === "DOCTOR") {
    // doctors can only edit medical background
    const allowed: Record<string, unknown> = {};
    if ("medicalBackground" in body) allowed.medicalBackground = body.medicalBackground;
    Object.keys(data).forEach((k) => delete data[k]);
    Object.assign(data, allowed);
  }

  const patient = await db.patient.update({ where: { id }, data });
  return NextResponse.json({ patient });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");

  if (mode === "deactivate" || mode === "reactivate") {
    const patient = await db.patient.update({
      where: { id },
      data: { status: mode === "deactivate" ? "INACTIVE" : "ACTIVE" },
    });
    return NextResponse.json({ patient });
  }
  if (mode === "personal-data") {
    await db.patient.update({
      where: { id },
      data: { phone: null, address: null, age: null, gender: null },
    });
    return NextResponse.json({ ok: true, mode });
  }

  try {
    await db.patient.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Impossible de supprimer le patient." }, { status: 500 });
  }
}
