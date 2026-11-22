import { NextResponse } from "next/server";
import { update } from "@/lib/store";

/** Début d'une séance (film ou épisode ouvert depuis kawna). */
export async function POST(req: Request) {
  const { key, titre, minutes } = (await req.json().catch(() => ({}))) as { key?: string; titre?: string; minutes?: number };
  if (!key || !titre) return NextResponse.json({ error: "key et titre requis" }, { status: 400 });
  await update((s) => {
    s.seance = { key, titre: titre.slice(0, 200), minutes: Math.min(Math.max(Number(minutes) || 60, 5), 300), startedAt: new Date().toISOString() };
  });
  return NextResponse.json({ ok: true });
}
