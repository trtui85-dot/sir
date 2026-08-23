import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let settings = await db.clinicSetting.findUnique({ where: { id: "main" } });
  if (!settings) {
    settings = await db.clinicSetting.create({ data: { id: "main" } });
  }
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const session = await requireSession(["OWNER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const data: Record<string, unknown> = {};
  const strFields = ["clinicName", "headerTitle", "headerPhone", "headerAddress", "refundPolicy", "defaultLanguage", "reportLanguage", "whatsappPhone", "primaryColor"];
  for (const k of strFields) if (k in body) data[k] = body[k];
  for (const k of ["childAgeLimit", "reminder1Hours", "reminder2Hours", "cancelHours"]) {
    if (k in body) data[k] = Number(body[k]) || 0;
  }
  for (const k of ["whatsappConnected", "aiEnabled", "useLetterhead"]) if (k in body) data[k] = !!body[k];
  if ("adminPhones" in body) data.adminPhones = Array.isArray(body.adminPhones) ? body.adminPhones.filter(Boolean) : [];

  const settings = await db.clinicSetting.upsert({
    where: { id: "main" },
    create: { id: "main", ...data },
    update: data,
  });
  return NextResponse.json({ settings });
}
