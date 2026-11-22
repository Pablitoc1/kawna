import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { traktAuthUrl, traktConfigured } from "@/lib/trakt";

export function GET(req: Request) {
  if (!traktConfigured()) return NextResponse.redirect(new URL("/moi?trakt=config#abonnements", req.url));
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(traktAuthUrl(req.url, state));
  res.cookies.set("kawna_trakt", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return res;
}
