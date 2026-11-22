import { NextResponse } from "next/server";
import { update } from "@/lib/store";

export async function POST(req: Request) {
  await update(async (s) => {
    if (s.google) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(s.google.refreshToken)}`, { method: "POST" }).catch(() => {});
    }
    delete s.google;
    delete s.youtube;
  });
  return NextResponse.redirect(new URL("/moi?google=deconnecte", req.url), 303);
}
