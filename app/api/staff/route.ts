import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const SECRETARY_PERMISSIONS = [
  "edit_patients",
  "view_notes",
  "view_accounting",
  "upload_docs",
];

export async function GET() {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { doctorProfile: true },
  });
  const doctors = await db.doctorProfile.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ users, permissionsCatalog: SECRETARY_PERMISSIONS, doctors });
}

export async function POST(req: Request) {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  if (!body.name?.trim() || !body.phone?.trim() || !body.password || body.password.length < 8) {
    return NextResponse.json({ error: "Nom, téléphone et mot de passe (min. 8 caractères) requis." }, { status: 400 });
  }
  const exists = await db.user.findUnique({ where: { phone: body.phone.trim() } });
  if (exists) return NextResponse.json({ error: "Ce téléphone est déjà utilisé." }, { status: 409 });

  const role = body.role === "DOCTOR" ? "DOCTOR" : body.role === "SECRETARY" ? "SECRETARY" : "OWNER";
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash(body.password, 10);

  let doctorProfileId: string | null = null;
  if (role === "DOCTOR" && body.linkDoctorProfileId) {
    doctorProfileId = body.linkDoctorProfileId;
  }

  const user = await db.user.create({
    data: {
      phone: body.phone.trim(),
      password: hash,
      name: String(body.name).trim(),
      role,
      doctorProfileId,
      permissions:
        role === "SECRETARY"
          ? {
              edit_patients: body.permissions?.edit_patients ?? true,
              view_notes: body.permissions?.view_notes ?? false,
              view_accounting: body.permissions?.view_accounting ?? false,
              upload_docs: body.permissions?.upload_docs ?? false,
            }
          : undefined,
    },
    include: { doctorProfile: true },
  });
  return NextResponse.json({ user });
}
