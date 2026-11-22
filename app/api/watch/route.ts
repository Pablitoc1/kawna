import { NextResponse } from "next/server";
import { localNow } from "@/lib/config";
import { update } from "@/lib/store";

/** Ajoute du temps passé (vidéo ou actu) ou des minutes accordées en plus du budget. */
export async function POST(req: Request) {
  const body = (await req.json()) as { video?: number; actu?: number; extra?: number };
  const clamp = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 0), 600) : 0);
  const { date } = localNow();
  const s = await update((st) => {
    const d = st.days[date] ?? { videoMin: 0, actuMin: 0, extraMin: 0 };
    d.videoMin += clamp(body.video);
    d.actuMin += clamp(body.actu);
    d.extraMin += clamp(body.extra);
    st.days[date] = d;
  });
  return NextResponse.json(s.days[date]);
}
