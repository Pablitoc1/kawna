import { NextResponse } from "next/server";
import { refresh } from "@/lib/edition";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function run() {
  const { edition, fetched, errors } = await refresh();
  return NextResponse.json({ date: edition.date, curatedBy: edition.curatedBy, fetched, errors });
}

/** Appelé par le cron Vercel (GET) ou depuis l'onglet Moi (POST). */
export const GET = run;
export const POST = run;
