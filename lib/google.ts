import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Boussole, State, Universe } from "./types";

export const SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const API = "https://www.googleapis.com/youtube/v3";

export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function redirectUri(reqUrl: string) {
  return process.env.GOOGLE_REDIRECT_URI || new URL("/api/google/callback", reqUrl).toString();
}

export function authUrl(reqUrl: string, state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(reqUrl),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function token(params: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...params }),
  });
  const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) throw new Error(`Google a refusé la connexion (${data.error ?? res.status})`);
  return data;
}

export const exchangeCode = (code: string, reqUrl: string) =>
  token({ code, grant_type: "authorization_code", redirect_uri: redirectUri(reqUrl) });

let cached: { value: string; until: number; for: string } | undefined;

/** Jeton d'accès court, renouvelé à partir du jeton longue durée stocké. */
export async function accessToken(refreshToken: string) {
  if (cached && cached.for === refreshToken && cached.until > Date.now() + 60_000) return cached.value;
  const t = await token({ refresh_token: refreshToken, grant_type: "refresh_token" });
  cached = { value: t.access_token!, until: Date.now() + (t.expires_in ?? 3600) * 1000, for: refreshToken };
  return cached.value;
}

async function yt<T>(path: string, access: string): Promise<T> {
  const res = await fetch(`${API}/${path}`, { headers: { authorization: `Bearer ${access}` }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`YouTube ${res.status} sur ${path.split("?")[0]}`);
  return res.json() as Promise<T>;
}

interface Page<T> { items?: T[]; nextPageToken?: string }

async function all<T>(path: string, access: string, maxPages = 20) {
  const out: T[] = [];
  let pageToken = "";
  for (let i = 0; i < maxPages; i++) {
    const page = await yt<Page<T>>(`${path}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ""}`, access);
    out.push(...(page.items ?? []));
    if (!page.nextPageToken) break;
    pageToken = page.nextPageToken;
  }
  return out;
}

/** Lit tes abonnements, tes vidéos aimées et le nom de tes playlists. Lecture seule. */
export async function readAccount(refreshToken: string) {
  const access = await accessToken(refreshToken);
  const [subs, likes, playlists] = await Promise.all([
    all<{ snippet: { title: string; resourceId: { channelId: string } } }>("subscriptions?part=snippet&mine=true&order=alphabetical", access),
    all<{ snippet: { title: string; channelTitle: string } }>("videos?part=snippet&myRating=like", access, 2).catch(() => []),
    all<{ snippet: { title: string } }>("playlists?part=snippet&mine=true", access, 2).catch(() => []),
  ]);
  return {
    channels: subs.map((s) => ({ id: s.snippet.resourceId.channelId, nom: s.snippet.title })),
    likes: likes.map((l) => `${l.snippet.channelTitle} | ${l.snippet.title}`),
    playlists: playlists.map((p) => p.snippet.title),
  };
}

const Classes = z.object({ chaines: z.array(z.object({ id: z.string(), univers: z.enum(["apprendre", "divertir"]) })) });

/** Range chaque chaîne dans un univers. Claude s'en charge ; sans clé, tout va dans Divertir. */
export async function classify(channels: { id: string; nom: string }[], b: Boussole): Promise<Record<string, Universe>> {
  const out: Record<string, Universe> = Object.fromEntries(channels.map((c) => [c.id, "divertir" as Universe]));
  if (!channels.length || !process.env.ANTHROPIC_API_KEY) return out;
  try {
    const client = new Anthropic();
    const res = await client.beta.messages.parse({
      model: process.env.KAWNA_MODEL || "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(Classes) },
      messages: [
        {
          role: "user",
          content: `Range chacune de ces chaînes YouTube dans un univers : « apprendre » (éducatif, tutoriels, vulgarisation, savoir-faire, analyse de fond) ou « divertir » (le reste). Objectifs de la personne : ${b.objectifs}\n\n${channels.map((c) => `${c.id} | ${c.nom}`).join("\n")}`,
        },
      ],
    });
    for (const c of res.parsed_output?.chaines ?? []) if (c.id in out) out[c.id] = c.univers;
  } catch (err) {
    console.error("kawna: classement des chaînes impossible, tout va dans Divertir.", err);
  }
  return out;
}

/** Synchronise le compte YouTube au plus une fois toutes les 12 h, en gardant les univers déjà choisis. */
export async function syncYouTube(s: State, b: Boussole, force = false) {
  if (!s.google || !googleConfigured()) return;
  if (!force && s.youtube && Date.now() - Date.parse(s.youtube.syncedAt) < 12 * 3_600_000) return;
  const acc = await readAccount(s.google.refreshToken);
  const known = new Map((s.youtube?.channels ?? []).map((c) => [c.id, c.univers]));
  const fresh = acc.channels.filter((c) => !known.has(c.id));
  const classes = await classify(fresh, b);
  s.youtube = {
    channels: acc.channels.map((c) => ({ ...c, univers: known.get(c.id) ?? classes[c.id] ?? "divertir" })),
    likes: acc.likes.slice(0, 100),
    playlists: acc.playlists,
    syncedAt: new Date().toISOString(),
  };
}
