import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { patients } = await req.json();
  if (!Array.isArray(patients) || patients.length === 0) {
    return NextResponse.json({ error: "Liste vide." }, { status: 400 });
  }

  let imported = 0;
  const errors: string[] = [];
  for (const p of patients) {
    const name = String(p.name || "").trim();
    if (!name) {
      errors.push("Ligne sans nom ignorée");
      continue;
    }
    try {
      const phone = String(p.phone || "").trim() || null;
      if (phone) {
        const existing = await db.patient.findFirst({ where: { phone } });
        if (existing) continue;
      }
      await db.patient.create({
        data: {
          name,
          phone,
          age: p.age ? Number(p.age) : null,
          gender: p.gender ? String(p.gender).slice(0, 20) : null,
        },
      });
      imported++;
    } catch {
      errors.push(`Échec: ${name}`);
    }
  }
  return NextResponse.json({ imported, errors, total: patients.length });
}
