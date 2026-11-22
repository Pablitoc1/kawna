import { NextResponse, type NextRequest } from "next/server";
import { syncCine } from "@/lib/cine";
import { sources } from "@/lib/config";
import { update } from "@/lib/store";
import { traktExchange } from "@/lib/trakt";

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const back = (q: string) => {
    const res = NextResponse.redirect(new URL(`/moi?trakt=${q}#abonnements`, req.url));
    res.cookies.delete("kawna_trakt");
    return res;
  };
  if (!code || !state || state !== req.cookies.get("kawna_trakt")?.value) return back("refus");
  try {
    const t = await traktExchange(code, req.url);
    await update(async (s) => {
      s.trakt = t;
      await syncCine(s, sources, true).catch((err) => console.error("kawna: lecture Trakt", err));
    });
    return back("ok");
  } catch (err) {
    console.error("kawna: connexion Trakt", err);
    return back("erreur");
  }
}
