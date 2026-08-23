import { NextResponse } from "next/server";
import { createSession, verifyCredentials } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { phone, password } = await req.json();
    if (!phone || !password) {
      return NextResponse.json({ error: "Phone and password required" }, { status: 400 });
    }
    const user = await verifyCredentials(phone.trim(), password);
    if (!user) {
      return NextResponse.json({ error: "Téléphone ou mot de passe incorrect." }, { status: 401 });
    }
    await createSession({
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      doctorProfileId: user.doctorProfileId,
    });
    return NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
