import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const windows = await db.bookingWindow.findMany({ orderBy: [{ active: "desc" }, { start: "asc" }] });
  return NextResponse.json({ windows });
}

export async function POST(req: Request) {
  const session = await requireSession(["OWNER", "SECRETARY"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name || !body.start || !body.end) {
    return NextResponse.json({ error: "Nom, début et fin requis." }, { status: 400 });
  }
  const window = await db.bookingWindow.create({
    data: {
      name: body.name,
      mode: body.mode === "EXACT_TIME" ? "EXACT_TIME" : "FLEXIBLE",
      days: Array.isArray(body.days) ? body.days : [1, 2, 3, 4, 5],
      start: body.start,
      end: body.end,
      capacity: Number(body.capacity) || 1,
      slotMinutes: Number(body.slotMinutes) || 30,
      active: true,
    },
  });
  return NextResponse.json({ window });
}
