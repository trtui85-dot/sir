import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status") || "";
  const doctorProfileId = searchParams.get("doctorId");

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }];
  }
  if (status === "ACTIVE" || status === "INACTIVE") where.status = status;
  if (session.role === "DOCTOR" && session.doctorProfileId) {
    where.visits = { some: { doctorId: session.doctorProfileId } };
  }

  const patients = await db.patient.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      visits: { orderBy: { visitDate: "desc" }, take: 1 },
      _count: { select: { visits: true, bookings: true } },
    },
  });

  // Doctor filter for read-only scoping
  if (doctorProfileId) {
    const scoped = await db.patient.findMany({
      where: { ...where, visits: { some: { doctorId: doctorProfileId } } },
      orderBy: { createdAt: "desc" },
      include: {
        visits: { orderBy: { visitDate: "desc" }, take: 1 },
        _count: { select: { visits: true, bookings: true } },
      },
    });
    return NextResponse.json({ patients: scoped });
  }

  return NextResponse.json({ patients });
}

export async function POST(req: Request) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name || !String(body.name).trim()) {
    return NextResponse.json({ error: "Le nom du patient est obligatoire." }, { status: 400 });
  }
  if (body.phone) {
    const existing = await db.patient.findFirst({ where: { phone: body.phone } });
    if (existing) {
      return NextResponse.json({ error: "Le patient existe déjà.", existingId: existing.id }, { status: 409 });
    }
  }

  const patient = await db.patient.create({
    data: {
      name: String(body.name).trim(),
      phone: body.phone || null,
      age: body.age ? Number(body.age) : null,
      gender: body.gender || null,
      address: body.address || null,
      medicalBackground: body.medicalBackground || null,
      doctorPreference: body.doctorPreference || null,
    },
  });
  return NextResponse.json({ patient });
}
