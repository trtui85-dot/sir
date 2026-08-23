import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL || "";
  let dbHost = null;
  try {
    dbHost = new URL(url).host || null;
  } catch {
    dbHost = "invalid-url";
  }
  return NextResponse.json({
    hasDatabaseUrl: url.length > 0,
    dbHost,
    hasJwtSecret: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    time: new Date().toISOString(),
  });
}
