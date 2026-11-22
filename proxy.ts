import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, sessionToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const password = process.env.KAWNA_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();
  // Le cron Vercel s'authentifie avec CRON_SECRET.
  const secret = process.env.CRON_SECRET;
  if (pathname === "/api/refresh" && secret && req.headers.get("authorization") === `Bearer ${secret}`) return NextResponse.next();

  if (req.cookies.get(COOKIE)?.value === (await sessionToken(password))) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon|apple-icon|manifest.webmanifest).*)"],
};
