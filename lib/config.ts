import boussoleJson from "@/config/boussole.json";
import sourcesJson from "@/config/sources.json";
import type { Boussole, Sources } from "./types";

export const boussole = boussoleJson as Boussole;
export const sources = sourcesJson as unknown as Sources;

export const TZ = process.env.KAWNA_TZ || "Europe/Paris";

/** Date du jour (AAAA-MM-JJ) et heure locale dans le fuseau de l'utilisateur. */
export function localNow(d = new Date()) {
  const parts = new Intl.DateTimeFormat("fr-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = Number(get("hour")) % 24;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour, minute: Number(get("minute")) };
}

/** Vrai quand la règle « pas de vidéo après HH:MM » s'applique (jusqu'à 7 h). */
export function isNight(d = new Date()) {
  const { hour, minute } = localNow(d);
  const [h, m] = boussole.regles.pasDeVideoApres.split(":").map(Number);
  const now = hour * 60 + minute;
  return now >= h * 60 + m || now < 7 * 60;
}
