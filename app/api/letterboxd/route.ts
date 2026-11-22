import { NextResponse } from "next/server";
import { update } from "@/lib/store";

export async function POST(req: Request) {
  const user = String((await req.formData()).get("user") ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/letterboxd\.com\//, "").replace(/\/.*$/, "");
  await update((s) => {
    s.letterboxd = /^[A-Za-z0-9_]{2,30}$/.test(user) ? user : undefined;
    if (s.cine) s.cine.syncedAt = new Date(0).toISOString();
  });
  return NextResponse.redirect(new URL("/moi#abonnements", req.url), 303);
}
