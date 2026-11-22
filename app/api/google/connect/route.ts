import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authUrl, googleConfigured } from "@/lib/google";

export function GET(req: Request) {
  if (!googleConfigured()) return NextResponse.redirect(new URL("/moi?google=config", req.url));
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authUrl(req.url, state));
  res.cookies.set("kawna_oauth", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return res;
}
