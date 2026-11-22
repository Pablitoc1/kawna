import { SERVICES } from "./services";
import { details, discover, findByImdb, providers, tmdbConfigured } from "./tmdb";
import { readTrakt, traktAccess } from "./trakt";
import type { Cine, Edition, Sources, State, Title } from "./types";
import { directLinks } from "./wikidata";

const DAY = 86_400_000;

export const emptyCine = (): Cine => ({ titles: {}, watchlist: [], catalogue: [], vus: [], notes: [], syncedAt: new Date(0).toISOString() });

/** Exécute fn sur chaque élément, quelques-uns à la fois. */
async function each<T>(xs: T[], n: number, fn: (x: T) => Promise<void>) {
  for (let i = 0; i < xs.length; i += n) await Promise.allSettled(xs.slice(i, i + n).map(fn));
}

const merge = (old: Title | undefined, t: Title): Title => (old ? { ...t, ...Object.fromEntries(Object.entries(old).filter(([, v]) => v !== undefined)) } : t);

/** Complète les fiches (durée, genres, services) et cherche les liens directs vers les applis. */
export async function complete(cine: Cine, keys: string[]) {
  const byService = cine.providers ?? Object.fromEntries(SERVICES.map((s) => [s.key, { ids: s.ids }]));
  const stale = keys.filter((k) => cine.titles[k] && (!cine.titles[k].detailsAt || Date.now() - Date.parse(cine.titles[k].detailsAt!) > 3 * DAY));
  await each(stale, 8, async (k) => {
    cine.titles[k] = await details(cine.titles[k], byService);
  });
  const noLinks = keys.map((k) => cine.titles[k]).filter((t) => t?.imdb && t.dispo?.length && !t.liens);
  if (!noLinks.length) return;
  try {
    const links = await directLinks(noLinks.map((t) => t.imdb!));
    for (const t of noLinks) t.liens = links[t.imdb!] ?? {};
  } catch (err) {
    console.error("kawna: liens directs indisponibles, recherche dans l'appli à la place.", err);
  }
}

/**
 * Met à jour ta liste, ce que tu as vu et le catalogue de tes abonnements, au plus toutes les 12 h.
 * Sans Trakt, ta liste vient de config/sources.json (aVoir).
 */
export async function syncCine(s: State, src: Sources, force = false) {
  if (!tmdbConfigured()) return;
  const cine = s.cine ?? emptyCine();
  if (!force && Date.now() - Date.parse(cine.syncedAt) < DAY / 2) return;

  if (!cine.providers || force) cine.providers = await providers().catch(() => cine.providers);

  if (s.trakt) {
    const t = await readTrakt(await traktAccess(s));
    for (const r of t.watchlist) cine.titles[r.key] = merge(cine.titles[r.key], { ...r });
    cine.watchlist = t.watchlist.map((r) => r.key);
    cine.vus = t.vus;
    cine.notes = t.notes;
  } else {
    const keys: string[] = [];
    await each(src.aVoir, 6, async (a) => {
      const known = Object.values(cine.titles).find((t) => t.imdb === a.imdb);
      const t = known ?? (await findByImdb(a.imdb));
      if (!t) return;
      cine.titles[t.key] = merge(cine.titles[t.key], t);
      keys.push(t.key);
    });
    cine.watchlist = src.aVoir.flatMap((a) => keys.filter((k) => cine.titles[k].imdb === a.imdb));
  }

  const mine = s.services ?? [];
  const ids = mine.flatMap((k) => cine.providers?.[k]?.ids ?? SERVICES.find((x) => x.key === k)?.ids ?? []);
  // Ta région, plus les deux premiers pays de ton VPN.
  const regions = [undefined, ...(s.vpn?.pays ?? []).slice(0, 2)];
  const pool: Title[] = [];
  for (const r of regions) for (const type of ["movie", "series"] as const) pool.push(...(await discover(type, ids, r)));
  const uniq = new Set<string>();
  const dedup = pool.filter((t) => (uniq.has(t.key) ? false : (uniq.add(t.key), true)));
  const vus = new Set(cine.vus);
  const inList = new Set(cine.watchlist);
  for (const t of dedup) cine.titles[t.key] = merge(cine.titles[t.key], t);
  cine.catalogue = dedup.map((t) => t.key).filter((k) => !vus.has(k) && !inList.has(k));

  await complete(cine, cine.watchlist.slice(0, 40));

  // On ne garde que les fiches encore utiles.
  const keep = new Set([...cine.watchlist, ...cine.catalogue]);
  for (const k of Object.keys(cine.titles)) if (!keep.has(k) && !Object.values(s.editions).some((e) => e.tonight?.key === k || e.decouvrir?.some((d) => d.id === k))) delete cine.titles[k];

  cine.syncedAt = new Date().toISOString();
  s.cine = cine;
}

/** Les titres que kawna peut proposer aujourd'hui : ta liste d'abord, puis le catalogue, sans ceux proposés cette semaine. */
export function cineCandidates(s: State, date: string) {
  const cine = s.cine;
  if (!cine) return { liste: [] as Title[], catalogue: [] as Title[] };
  const since = Date.parse(date) - 7 * DAY;
  const recent = new Set(
    Object.values(s.editions)
      .filter((e: Edition) => e.date !== date && Date.parse(e.date) >= since)
      .flatMap((e) => (e.decouvrir ?? []).map((d) => d.id)),
  );
  const vus = new Set(cine.vus);
  const pick = (keys: string[]) => keys.flatMap((k) => (cine.titles[k] && !vus.has(k) ? [cine.titles[k]] : []));
  return {
    liste: pick(cine.watchlist).slice(0, 40),
    catalogue: pick(cine.catalogue).filter((t) => !recent.has(t.key)).slice(0, 60),
  };
}

/** Une ligne par titre pour Claude. */
export function cineLine(t: Title, mine: string[], vpn?: { pays: string[] }) {
  const dispo = (t.dispo ?? []).filter((d) => mine.includes(d));
  const viaVpn = vpn ? Object.entries(t.ailleurs ?? {}).filter(([k, p]) => mine.includes(k) && p.length).map(([k, p]) => `${k} (${p.filter((x) => vpn.pays.includes(x)).concat(p).slice(0, 3).join("/")}, VPN)`) : [];
  const parts = [
    t.key,
    `${t.titre}${t.annee ? ` (${t.annee})` : ""}`,
    t.type === "movie" ? "film" : `série${t.saisons ? `, ${t.saisons} saison${t.saisons > 1 ? "s" : ""}` : ""}`,
  ];
  if (t.duree) parts.push(`${t.duree} min`);
  if (t.note) parts.push(`note ${t.note}/10`);
  if (t.genres?.length) parts.push(t.genres.join(", "));
  if (dispo.length) parts.push(`sur ${dispo.join(", ")}`);
  else if (viaVpn.length) parts.push(`seulement via VPN : ${viaVpn.slice(0, 2).join(", ")}`);
  if (t.resume) parts.push(t.resume.slice(0, 140));
  return parts.join(" | ");
}
