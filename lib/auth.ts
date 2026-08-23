import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

export type SessionUser = {
  id: string;
  name: string;
  phone: string;
  role: "OWNER" | "DOCTOR" | "SECRETARY";
  doctorProfileId?: string | null;
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret());
  const store = await cookies();
  store.set("sir_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete("sir_session");
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get("sir_session")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    return {
      id: payload.id as string,
      name: payload.name as string,
      phone: payload.phone as string,
      role: payload.role as SessionUser["role"],
      doctorProfileId: (payload.doctorProfileId as string) ?? null,
    };
  } catch {
    return null;
  }
}

export async function requireSession(roles?: SessionUser["role"][]) {
  const session = await getSession();
  if (!session) return null;
  if (roles && !roles.includes(session.role)) return null;
  return session;
}

export async function verifyCredentials(phone: string, password: string) {
  const user = await db.user.findUnique({
    where: { phone },
    include: { doctorProfile: true },
  });
  if (!user || !user.active) return null;
  const bcrypt = await import("bcryptjs");
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  return user;
}
