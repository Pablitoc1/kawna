import { matchProviders } from "./services";
import type { Title } from "./types";

/**
 * TMDB : affiches, fiches, catalogue par service et données « où regarder » (fournies par JustWatch).
 * TMDB_API_KEY accepte la clé API (v3) ou le jeton de lecture (v4, commence par « eyJ »).
 */
const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
export const REGION = () => process.env.KAWNA_REGION || "FR";
export const tmdbConfigured = () => Boolean(process.env.TMDB_API_KEY);

async function tmdb<T>(path: string, params: Record<string, string | number> = {}, cache = 86_400): Promise<T> {
  const key = process.env.TMDB_API_KEY!;
  const bearer = key.startsWith("eyJ");
  const p = new URLSearchParams({ language: "fr-FR", ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  if (!bearer) p.set("api_key", key);
  const res = await fetch(`${API}${path}?${p}`, {
    headers: bearer ? { authorization: `Bearer ${key}` } : {},
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: cache },
  } as RequestInit);
  if (!res.ok) throw new Error(`TMDB ${res.status} sur ${path}`);
  return res.json() as Promise<T>;
}

const img = (path: string | null | undefined, size: string) => (path ? `${IMG}/${size}${path}` : undefined);

/** Affiche d'un film ou d'une série à partir de son identifiant IMDb. */
export async function poster(imdb: string): Promise<string | undefined> {
  if (!tmdbConfigured()) return undefined;
  return (await findByImdb(imdb).catch(() => undefined))?.poster;
}

export const stremioLink = (type: "movie" | "series", imdb: string) => `stremio:///detail/${type}/${imdb}`;

interface Raw {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  vote_average?: number;
}

function fromRaw(r: Raw, type: Title["type"]): Title {
  return {
    key: `${type}:${r.id}`,
    tmdb: r.id,
    type,
    titre: (r.title ?? r.name ?? "").trim(),
    annee: (r.release_date ?? r.first_air_date ?? "").slice(0, 4) || undefined,
    poster: img(r.poster_path, "w342"),
    fond: img(r.backdrop_path, "w780"),
    resume: r.overview?.slice(0, 400) || undefined,
    note: r.vote_average ? Math.round(r.vote_average * 10) / 10 : undefined,
  };
}

export async function findByImdb(imdb: string): Promise<Title | undefined> {
  const d = await tmdb<{ movie_results?: Raw[]; tv_results?: Raw[] }>(`/find/${imdb}`, { external_source: "imdb_id" }, 7 * 86_400);
  const m = d.movie_results?.[0];
  const t = d.tv_results?.[0];
  const found = m ? fromRaw(m, "movie") : t ? fromRaw(t, "series") : undefined;
  return found && { ...found, imdb };
}

/** Les fournisseurs de la région, associés aux services connus de kawna. */
export async function providers() {
  const lists = await Promise.all(
    ["movie", "tv"].map((t) =>
      tmdb<{ results: { provider_id: number; provider_name: string; logo_path?: string }[] }>(`/watch/providers/${t}`, { watch_region: REGION() }, 7 * 86_400),
    ),
  );
  const out = matchProviders(lists.flatMap((l) => l.results));
  for (const v of Object.values(out)) v.logo = img(v.logo, "w92");
  return out;
}

/**
 * Le catalogue de tes abonnements : les mieux notés, et les sorties récentes bien notées.
 * Tri par note et nombre de votes, jamais par « popularité » : kawna ne suit pas la tendance.
 */
export async function discover(type: Title["type"], providerIds: number[], region = REGION()): Promise<Title[]> {
  if (!providerIds.length) return [];
  const path = type === "movie" ? "/discover/movie" : "/discover/tv";
  const dateField = type === "movie" ? "primary_release_date.gte" : "first_air_date.gte";
  const base = {
    watch_region: region,
    with_watch_providers: providerIds.join("|"),
    with_watch_monetization_types: "flatrate",
    sort_by: "vote_average.desc",
    include_adult: "false",
  };
  const year = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const runs = [
    { ...base, "vote_count.gte": type === "movie" ? 1500 : 500, page: 1 },
    { ...base, "vote_count.gte": type === "movie" ? 1500 : 500, page: 2 },
    { ...base, "vote_count.gte": type === "movie" ? 150 : 80, [dateField]: year, page: 1 },
  ];
  const pages = await Promise.all(runs.map((r) => tmdb<{ results: Raw[] }>(path, r).catch(() => ({ results: [] as Raw[] }))));
  const seen = new Set<number>();
  return pages
    .flatMap((p) => p.results)
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .map((r) => fromRaw(r, type))
    .filter((t) => t.titre);
}

interface Details extends Raw {
  imdb_id?: string;
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  genres?: { name: string }[];
  external_ids?: { imdb_id?: string };
  "watch/providers"?: { results?: Record<string, { link?: string; flatrate?: { provider_id: number }[] }> };
}

/** Complète une fiche : identifiant IMDb, durée, genres, et sur lesquels de tes services le titre est inclus. */
export async function details(t: Title, byService: Record<string, { ids: number[] }>): Promise<Title> {
  const d = await tmdb<Details>(`/${t.type === "movie" ? "movie" : "tv"}/${t.tmdb}`, { append_to_response: "watch/providers,external_ids" }, 3 * 86_400);
  const all = d["watch/providers"]?.results ?? {};
  const fr = all[REGION()];
  const included = new Set((fr?.flatrate ?? []).map((p) => p.provider_id));
  const dispo = Object.entries(byService).filter(([, v]) => v.ids.some((id) => included.has(id))).map(([k]) => k);
  // Ailleurs dans le monde, pour les services absents ici.
  const ailleurs: Record<string, string[]> = {};
  for (const [pays, r] of Object.entries(all)) {
    if (pays === REGION()) continue;
    const ids = new Set((r.flatrate ?? []).map((p) => p.provider_id));
    for (const [k, v] of Object.entries(byService)) if (!dispo.includes(k) && v.ids.some((id) => ids.has(id))) (ailleurs[k] ??= []).push(pays);
  }
  return {
    ...t,
    ...fromRaw(d, t.type),
    imdb: d.imdb_id || d.external_ids?.imdb_id || t.imdb,
    duree: d.runtime || d.episode_run_time?.[0] || undefined,
    saisons: d.number_of_seasons,
    genres: d.genres?.map((g) => g.name).slice(0, 3),
    dispo,
    ailleurs,
    ouRegarder: fr?.link,
    liens: t.liens,
    detailsAt: new Date().toISOString(),
  };
}
