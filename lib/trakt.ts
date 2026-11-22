import type { State } from "./types";

/**
 * Trakt garde la trace de ce que tu regardes (Stremio s'y synchronise), ta liste « à voir » et tes notes.
 * kawna ne fait que lire.
 */
const API = "https://api.trakt.tv";

export const traktConfigured = () => Boolean(process.env.TRAKT_CLIENT_ID && process.env.TRAKT_CLIENT_SECRET);

export function traktRedirectUri(reqUrl: string) {
  return process.env.TRAKT_REDIRECT_URI || new URL("/api/trakt/callback", reqUrl).toString();
}

export function traktAuthUrl(reqUrl: string, state: string) {
  const p = new URLSearchParams({ response_type: "code", client_id: process.env.TRAKT_CLIENT_ID!, redirect_uri: traktRedirectUri(reqUrl), state });
  return `https://trakt.tv/oauth/authorize?${p}`;
}

const headers = (access?: string): Record<string, string> => ({
  "content-type": "application/json",
  "trakt-api-version": "2",
  "trakt-api-key": process.env.TRAKT_CLIENT_ID!,
  "user-agent": "kawna/0.1",
  ...(access ? { authorization: `Bearer ${access}` } : {}),
});

async function token(body: Record<string, string>, reqUrl: string) {
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      client_id: process.env.TRAKT_CLIENT_ID,
      client_secret: process.env.TRAKT_CLIENT_SECRET,
      redirect_uri: traktRedirectUri(reqUrl),
      ...body,
    }),
  });
  const d = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !d.access_token || !d.refresh_token) throw new Error(`Trakt a refusé la connexion (${d.error ?? res.status})`);
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiresAt: Date.now() + (d.expires_in ?? 86_400) * 1000,
    connectedAt: new Date().toISOString(),
  };
}

export const traktExchange = (code: string, reqUrl: string) => token({ code, grant_type: "authorization_code" }, reqUrl);

/** Jeton valide ; renouvelé (et enregistré dans l'état) s'il expire bientôt. */
export async function traktAccess(s: State, reqUrl = "http://localhost/") {
  if (!s.trakt) throw new Error("Trakt non connecté");
  if (s.trakt.expiresAt > Date.now() + 5 * 60_000) return s.trakt.accessToken;
  const t = await token({ refresh_token: s.trakt.refreshToken, grant_type: "refresh_token" }, reqUrl);
  s.trakt = { ...t, connectedAt: s.trakt.connectedAt };
  return t.accessToken;
}

async function get<T>(path: string, access: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers(access), signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Trakt ${res.status} sur ${path}`);
  return res.json() as Promise<T>;
}

interface Ids { tmdb?: number; imdb?: string }
interface Media { title: string; year?: number; ids: Ids }
type Entry = { movie?: Media; show?: Media; rating?: number };

export interface TraktRef { key: string; tmdb: number; imdb?: string; type: "movie" | "series"; titre: string; annee?: string }

const ref = (e: Entry): TraktRef | undefined => {
  const m = e.movie ?? e.show;
  if (!m?.ids.tmdb) return undefined;
  const type = e.movie ? "movie" : "series";
  return { key: `${type}:${m.ids.tmdb}`, tmdb: m.ids.tmdb, imdb: m.ids.imdb, type, titre: m.title, annee: m.year ? String(m.year) : undefined };
};

/** Ta liste, ce que tu as vu et tes notes. */
export async function readTrakt(access: string) {
  const [wm, ws, vm, vs, rm, rs] = await Promise.all([
    get<Entry[]>("/sync/watchlist/movies", access),
    get<Entry[]>("/sync/watchlist/shows", access),
    get<Entry[]>("/sync/watched/movies", access).catch(() => []),
    get<Entry[]>("/sync/watched/shows?extended=noseasons", access).catch(() => []),
    get<Entry[]>("/sync/ratings/movies", access).catch(() => []),
    get<Entry[]>("/sync/ratings/shows", access).catch(() => []),
  ]);
  const refs = (xs: Entry[]) => xs.flatMap((x) => (ref(x) ? [ref(x)!] : []));
  return {
    watchlist: refs([...wm, ...ws]),
    vus: refs([...vm, ...vs]).map((r) => r.key),
    notes: [...rm, ...rs]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .flatMap((x) => (ref(x) ? [`${x.rating}/10 | ${ref(x)!.titre}${ref(x)!.annee ? ` (${ref(x)!.annee})` : ""}`] : []))
      .slice(0, 60),
  };
}
