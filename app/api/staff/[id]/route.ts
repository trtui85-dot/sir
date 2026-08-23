import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  for (const k of ["name", "phone", "active"]) if (k in body) data[k] = body[k];
  if ("permissions" in body && body.permissions !== undefined) data.permissions = body.permissions;
  if (body.password) {
    if (String(body.password).length < 8) {
      return NextResponse.json({ error: "Mot de passe : min. 8 caractères." }, { status: 400 });
    }
    const bcrypt = await import("bcryptjs");
    data.password = await bcrypt.hash(String(body.password), 10);
  }
  if ("linkDoctorProfileId" in body) data.doctorProfileId = body.linkDoctorProfileId || null;

  try {
    const user = await db.user.update({ where: { id }, data, include: { doctorProfile: true } });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Mise à jour impossible (téléphone déjà pris ?)." }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (session.id === id) return NextResponse.json({ error: "Impossible de supprimer votre propre compte." }, { status: 400 });
  try {
    await db.staffPayment.deleteMany({ where: { userId: id } });
    await db.medicalNote.updateMany({ where: { authorId: id }, data: { authorId: null } });
    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
}
