import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("sir_session")?.value;
  let valid = false;
  let role = "";
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      valid = true;
      role = payload.role as string;
    } catch {
      valid = false;
    }
  }

  if (pathname.startsWith("/dashboard")) {
    if (!valid) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    const segment = pathname.split("/")[2];
    const rolePath: Record<string, string> = {
      secretary: "SECRETARY",
      doctor: "DOCTOR",
      owner: "OWNER",
    };
    if (segment && rolePath[segment] && role !== rolePath[segment] && role !== "OWNER") {
      const url = req.nextUrl.clone();
      url.pathname = `/dashboard/${role.toLowerCase()}`;
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/login" && valid) {
    const url = req.nextUrl.clone();
    url.pathname = `/dashboard/${role.toLowerCase()}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
