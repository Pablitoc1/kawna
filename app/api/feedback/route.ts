import { NextResponse } from "next/server";
import { update } from "@/lib/store";
import type { Verdict } from "@/lib/types";

const VERDICTS: Verdict[] = ["oui", "bof", "non"];

export async function POST(req: Request) {
  const { id, verdict } = (await req.json()) as { id?: string; verdict?: Verdict };
  if (!id || !verdict || !VERDICTS.includes(verdict)) return NextResponse.json({ error: "id et verdict requis" }, { status: 400 });
  await update((s) => {
    s.feedback[id] = { verdict, at: new Date().toISOString() };
  });
  return NextResponse.json({ ok: true });
}
