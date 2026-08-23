import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["name", "specialty"]) if (k in body) data[k] = body[k];
  if ("compensation" in body) {
    data.compensation = body.compensation === "SALARY_PLUS_PERCENT" ? "SALARY_PLUS_PERCENT" : "FIXED_SALARY";
  }
  if ("salaryAmount" in body) data.salaryAmount = Number(body.salaryAmount) || 0;
  if ("percentRate" in body) data.percentRate = Number(body.percentRate) || 0;

  const doctor = await db.doctorProfile.update({ where: { id }, data });

  // sync linked user name
  const linkedUser = await db.user.findFirst({ where: { doctorProfileId: id } });
  if (linkedUser && body.name) {
    await db.user.update({ where: { id: linkedUser.id }, data: { name: String(body.name).trim() } });
  }
  return NextResponse.json({ doctor });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await db.visit.updateMany({ where: { doctorId: id }, data: { doctorId: null } });
    await db.booking.updateMany({ where: { doctorId: id }, data: { doctorId: null } });
    await db.treatmentPlan.updateMany({ where: { doctorId: id }, data: { doctorId: null } });
    await db.doctorProfile.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
}
