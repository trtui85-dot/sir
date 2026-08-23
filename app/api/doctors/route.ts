import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctors = await db.doctorProfile.findMany({
    orderBy: { name: "asc" },
    include: { user: true },
  });
  return NextResponse.json({ doctors });
}

export async function POST(req: Request) {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Nom requis." }, { status: 400 });

  let user = null;
  if (body.phone && body.password) {
    const exists = await db.user.findUnique({ where: { phone: body.phone } });
    if (exists) return NextResponse.json({ error: "Ce téléphone est déjà utilisé." }, { status: 409 });
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash(body.password, 10);
    const profile = await db.doctorProfile.create({
      data: {
        name: String(body.name).trim(),
        specialty: body.specialty || null,
        compensation: body.compensation === "SALARY_PLUS_PERCENT" ? "SALARY_PLUS_PERCENT" : "FIXED_SALARY",
        salaryAmount: Number(body.salaryAmount) || 0,
        percentRate: Number(body.percentRate) || 0,
      },
    });
    user = await db.user.create({
      data: {
        phone: body.phone,
        password: hash,
        name: String(body.name).trim(),
        role: "DOCTOR",
        doctorProfileId: profile.id,
      },
    });
    return NextResponse.json({ doctor: profile, user, linked: true });
  }

  const doctor = await db.doctorProfile.create({
    data: {
      name: String(body.name).trim(),
      specialty: body.specialty || null,
      compensation: body.compensation === "SALARY_PLUS_PERCENT" ? "SALARY_PLUS_PERCENT" : "FIXED_SALARY",
      salaryAmount: Number(body.salaryAmount) || 0,
      percentRate: Number(body.percentRate) || 0,
    },
  });
  return NextResponse.json({ doctor, linked: false });
}
