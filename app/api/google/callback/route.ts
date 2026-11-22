import { NextResponse, type NextRequest } from "next/server";
import { boussole } from "@/lib/config";
import { exchangeCode, syncYouTube } from "@/lib/google";
import { update } from "@/lib/store";

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const back = (q: string) => {
    const res = NextResponse.redirect(new URL(`/moi?google=${q}`, req.url));
    res.cookies.delete("kawna_oauth");
    return res;
  };
  if (!code || !state || state !== req.cookies.get("kawna_oauth")?.value) return back("refus");
  try {
    const t = await exchangeCode(code, req.url);
    await update(async (s) => {
      // Google ne renvoie le jeton longue durée qu'au premier accord : on garde l'ancien sinon.
      const refreshToken = t.refresh_token ?? s.google?.refreshToken;
      if (!refreshToken) throw new Error("Google n'a pas renvoyé de jeton longue durée");
      s.google = { refreshToken, connectedAt: new Date().toISOString() };
      await syncYouTube(s, boussole, true);
    });
    return back("ok");
  } catch (err) {
    console.error("kawna: connexion Google", err);
    return back("erreur");
  }
}
