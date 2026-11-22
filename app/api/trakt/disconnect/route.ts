import { NextResponse } from "next/server";
import { update } from "@/lib/store";

export async function POST(req: Request) {
  await update(async (s) => {
    if (s.trakt && process.env.TRAKT_CLIENT_ID) {
      await fetch("https://api.trakt.tv/oauth/revoke", {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "kawna/0.1" },
        body: JSON.stringify({ token: s.trakt.accessToken, client_id: process.env.TRAKT_CLIENT_ID, client_secret: process.env.TRAKT_CLIENT_SECRET }),
      }).catch(() => {});
    }
    delete s.trakt;
    if (s.cine) {
      s.cine.watchlist = [];
      s.cine.vus = [];
      s.cine.notes = [];
      s.cine.syncedAt = new Date(0).toISOString();
    }
  });
  return NextResponse.redirect(new URL("/moi?trakt=deconnecte#abonnements", req.url), 303);
}
