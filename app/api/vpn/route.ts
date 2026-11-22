import { NextResponse } from "next/server";
import { update } from "@/lib/store";

/** Ton VPN et les pays dont kawna regarde aussi les catalogues. Vide = pas de VPN. */
export async function POST(req: Request) {
  const f = await req.formData();
  const nom = String(f.get("nom") ?? "").trim().slice(0, 40);
  const pays = [...new Set(String(f.get("pays") ?? "").toUpperCase().split(/[^A-Z]+/).filter((p) => p.length === 2))].slice(0, 8);
  await update((s) => {
    s.vpn = nom && pays.length ? { nom, pays } : undefined;
    if (s.cine) s.cine.syncedAt = new Date(0).toISOString();
  });
  return NextResponse.redirect(new URL("/moi#abonnements", req.url), 303);
}
