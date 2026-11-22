import { NextResponse } from "next/server";
import { localNow } from "@/lib/config";
import { update } from "@/lib/store";
import type { Verdict } from "@/lib/types";

const VERDICTS: Verdict[] = ["oui", "bof", "non"];

/** Fin de séance : le temps passé est compté, ton avis est gardé, la séance est close. */
export async function POST(req: Request) {
  const f = await req.formData();
  const verdict = String(f.get("verdict") ?? "") as Verdict;
  await update((s) => {
    const se = s.seance;
    if (!se) return;
    const mins = Math.min(Math.round((Date.now() - Date.parse(se.startedAt)) / 60_000), se.minutes + 30);
    const { date } = localNow();
    const d = (s.days[date] ??= { videoMin: 0, actuMin: 0, extraMin: 0 });
    d.filmMin = (d.filmMin ?? 0) + Math.max(0, mins);
    if (VERDICTS.includes(verdict)) s.feedback[se.key] = { verdict, at: new Date().toISOString() };
    // Vu : il ne sera plus proposé.
    if (s.cine && !s.cine.vus.includes(se.key) && se.key.startsWith("movie:")) s.cine.vus.push(se.key);
    delete s.seance;
  });
  return NextResponse.redirect(new URL("/fin?ok=1", req.url), 303);
}
