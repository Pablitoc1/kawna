import { NextResponse } from "next/server";
import { complete, syncCine } from "@/lib/cine";
import { boussole, localNow, sources } from "@/lib/config";
import { filmsWithRules } from "@/lib/curate";
import { SERVICES } from "@/lib/services";
import { update } from "@/lib/store";

export const maxDuration = 120;

/** Enregistre les services cochés, relit le catalogue, et met à jour tout de suite les films du jour. */
export async function POST(req: Request) {
  const form = await req.formData();
  const known = new Set(SERVICES.map((s) => s.key));
  const services = form.getAll("service").map(String).filter((k) => known.has(k));
  let q = "ok";
  await update(async (s) => {
    s.services = services;
    try {
      await syncCine(s, sources, true);
      const { date } = localNow();
      const e = s.editions[date];
      if (e && s.cine) {
        Object.assign(e, filmsWithRules(s, boussole, date));
        await complete(s.cine, [e.tonight?.key, ...(e.decouvrir ?? []).map((d) => d.id)].filter((k): k is string => Boolean(k)));
      }
    } catch (err) {
      console.error("kawna: catalogue des abonnements", err);
      q = "catalogue";
    }
  });
  return NextResponse.redirect(new URL(`/moi?services=${q}#abonnements`, req.url), 303);
}
