import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, getSession } from "@/lib/auth";

/* POST { type: "note" | "prescription" | "teeth" | "document", ...payload } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: patientId } = await params;
  const body = await req.json();

  try {
    if (body.type === "note") {
      if (!body.content?.trim()) return NextResponse.json({ error: "Note vide." }, { status: 400 });
      const note = await db.medicalNote.create({
        data: { patientId, content: body.content.trim(), authorId: session.id },
      });
      return NextResponse.json({ note });
    }

    if (body.type === "prescription") {
      if (!body.content?.trim()) return NextResponse.json({ error: "Ordonnance vide." }, { status: 400 });
      const prescription = await db.prescription.create({
        data: { patientId, content: body.content.trim(), createdBy: session.name },
      });
      return NextResponse.json({ prescription });
    }

    if (body.type === "teeth") {
      const conditions: { tooth: number; condition: string; note?: string }[] = body.conditions ?? [];
      for (const c of conditions) {
        if (!c.condition || c.condition === "healthy") {
          await db.toothCondition.deleteMany({ where: { patientId, tooth: c.tooth } });
        } else {
          await db.toothCondition.upsert({
            where: { patientId_tooth: { patientId, tooth: c.tooth } },
            create: { patientId, tooth: c.tooth, condition: c.condition, note: c.note || null },
            update: { condition: c.condition, note: c.note || null },
          });
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (body.type === "document") {
      if (!body.title || !body.url) return NextResponse.json({ error: "Titre et URL requis." }, { status: 400 });
      const document = await db.document.create({
        data: { patientId, title: body.title, url: body.url, mediaType: body.mediaType || "image", uploadedBy: session.name },
      });
      return NextResponse.json({ document });
    }

    return NextResponse.json({ error: "Type inconnu." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Échec de l'enregistrement." }, { status: 500 });
  }
}

/* DELETE ?resource=note|prescription|document&id=xxx */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get("resource");
  const targetId = searchParams.get("id");
  await params;
  if (!targetId) return NextResponse.json({ error: "ID requis." }, { status: 400 });

  try {
    if (resource === "note") await db.medicalNote.delete({ where: { id: targetId } });
    else if (resource === "prescription") await db.prescription.delete({ where: { id: targetId } });
    else if (resource === "document") await db.document.delete({ where: { id: targetId } });
    else return NextResponse.json({ error: "Ressource inconnue." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
}

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
