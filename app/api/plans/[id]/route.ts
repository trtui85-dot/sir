import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const plan = await db.treatmentPlan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: "Plan introuvable." }, { status: 404 });

  if (body.action === "complete-session") {
    const done = Math.min(plan.sessionsDone + 1, plan.sessionsTotal);
    const updated = await db.treatmentPlan.update({
      where: { id },
      data: {
        sessionsDone: done,
        status: done >= plan.sessionsTotal ? "COMPLETED" : plan.status,
      },
    });
    return NextResponse.json({ plan: updated });
  }

  if (body.action === "cancel") {
    const updated = await db.treatmentPlan.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ plan: updated });
  }

  const data: Record<string, unknown> = {};
  for (const k of ["name", "description", "status"]) if (k in body) data[k] = body[k];
  if ("sessionsDone" in body) data.sessionsDone = Number(body.sessionsDone);
  if ("sessionAmount" in body) data.sessionAmount = Number(body.sessionAmount);
  const updated = await db.treatmentPlan.update({ where: { id }, data });
  return NextResponse.json({ plan: updated });
}
