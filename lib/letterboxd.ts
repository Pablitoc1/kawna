import { XMLParser } from "fast-xml-parser";

/**
 * Letterboxd n'a pas d'API publique (accès sur demande). Son flux RSS public suffit en lecture :
 * les 50 derniers films de ton journal, avec ta note, la date et l'identifiant TMDB.
 */
export const letterboxdFilm = (tmdb: number) => `https://letterboxd.com/tmdb/${tmdb}/`;

export interface Journal { key: string; titre: string; annee?: string; note?: number; vuLe?: string }

export function parseLetterboxd(xml: string): Journal[] {
  const doc = new XMLParser({ ignoreAttributes: true }).parse(xml);
  const items = doc?.rss?.channel?.item;
  const list = Array.isArray(items) ? items : items ? [items] : [];
  return list.flatMap((i: Record<string, unknown>) => {
    const tmdb = Number(i["tmdb:movieId"]);
    if (!tmdb) return []; // les listes n'ont pas de film
    const note = i["letterboxd:memberRating"] !== undefined ? Number(i["letterboxd:memberRating"]) : undefined;
    return [{
      key: `movie:${tmdb}`,
      titre: String(i["letterboxd:filmTitle"] ?? i.title ?? ""),
      annee: i["letterboxd:filmYear"] ? String(i["letterboxd:filmYear"]) : undefined,
      note: note !== undefined && !Number.isNaN(note) ? note : undefined,
      vuLe: i["letterboxd:watchedDate"] ? String(i["letterboxd:watchedDate"]) : undefined,
    }];
  });
}

export async function readLetterboxd(user: string) {
  const res = await fetch(`https://letterboxd.com/${encodeURIComponent(user)}/rss/`, {
    headers: { "user-agent": "kawna/0.1 (lecteur de flux personnel)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Letterboxd ${res.status}`);
  return parseLetterboxd(await res.text());
}
