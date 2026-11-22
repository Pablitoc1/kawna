import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import type { Item, Sources, Universe } from "./types";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });

const arr = <T>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
const text = (x: unknown): string =>
  typeof x === "string" ? x : typeof x === "number" ? String(x) : x && typeof x === "object" && "#text" in x ? String((x as { "#text": unknown })["#text"]) : "";
const strip = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

export const idFor = (url: string) => createHash("sha1").update(url).digest("hex").slice(0, 12);

/** « 1:02:03 », « 42:10 » ou un nombre de secondes, en minutes arrondies. */
export function parseDuration(v: string): number | undefined {
  if (!v) return undefined;
  if (/^\d+$/.test(v)) return Math.max(1, Math.round(Number(v) / 60));
  const p = v.split(":").map(Number);
  if (p.some(Number.isNaN)) return undefined;
  const s = p.reduce((a, n) => a * 60 + n, 0);
  return Math.max(1, Math.round(s / 60));
}

interface Meta {
  source: string;
  universe: Universe;
  kind: Item["kind"];
  lean?: number;
}

/** Lit un flux RSS 2.0 ou Atom (dont les flux de chaînes YouTube). */
export function parseFeed(xml: string, meta: Meta): Item[] {
  const doc = parser.parse(xml);
  const out: Item[] = [];

  for (const e of arr(doc?.feed?.entry)) {
    const links = arr(e.link);
    const url = links.find((l: { "@_rel"?: string }) => !l["@_rel"] || l["@_rel"] === "alternate")?.["@_href"] ?? links[0]?.["@_href"];
    if (!url) continue;
    const group = e["media:group"] ?? {};
    const youtubeId = text(e["yt:videoId"]) || undefined;
    out.push({
      id: idFor(url),
      kind: youtubeId ? "video" : meta.kind,
      universe: meta.universe,
      source: meta.source,
      title: strip(text(e.title)),
      url,
      image: group["media:thumbnail"]?.["@_url"] ?? (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : undefined),
      published: new Date(text(e.published) || text(e.updated) || Date.now()).toISOString(),
      summary: strip(text(group["media:description"]) || text(e.summary)).slice(0, 400) || undefined,
      youtubeId,
      lean: meta.lean,
    });
  }

  for (const i of arr(doc?.rss?.channel?.item)) {
    const url = text(i.link) || i.enclosure?.["@_url"] || text(i.guid);
    if (!url) continue;
    const media = arr(i["media:content"])[0] ?? i["media:thumbnail"];
    const enclosure = i.enclosure?.["@_type"]?.startsWith("image") ? i.enclosure["@_url"] : undefined;
    out.push({
      id: idFor(url),
      kind: meta.kind,
      universe: meta.universe,
      source: meta.source,
      title: strip(text(i.title)),
      url: meta.kind === "podcast" ? (text(i.link) || i.enclosure?.["@_url"]) : url,
      image: media?.["@_url"] ?? enclosure ?? i["itunes:image"]?.["@_href"],
      published: new Date(text(i.pubDate) || Date.now()).toISOString(),
      summary: strip(text(i.description)).slice(0, 400) || undefined,
      durationMin: parseDuration(text(i["itunes:duration"])),
      lean: meta.lean,
    });
  }
  return out.filter((x) => x.title);
}

async function get(url: string) {
  const res = await fetch(url, { headers: { "user-agent": "kawna/0.1 (lecteur de flux personnel)" }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

/** Ajoute la durée des vidéos via l'API YouTube Data : compte Google connecté, ou clé API. */
async function addDurations(items: Item[], accessToken?: string) {
  const key = process.env.YOUTUBE_API_KEY;
  const vids = items.filter((i) => i.youtubeId && !i.durationMin);
  if ((!key && !accessToken) || !vids.length) return;
  for (let k = 0; k < vids.length; k += 50) {
    const batch = vids.slice(k, k + 50);
    const ids = batch.map((v) => v.youtubeId).join(",");
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}${accessToken ? "" : `&key=${key}`}`;
    try {
      const data = (await (await fetch(url, accessToken ? { headers: { authorization: `Bearer ${accessToken}` } } : {})).json()) as { items?: { id: string; contentDetails: { duration: string } }[] };
      for (const d of data.items ?? []) {
        const m = d.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!m) continue;
        const sec = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
        const v = batch.find((b) => b.youtubeId === d.id);
        if (v) v.durationMin = Math.max(1, Math.round(sec / 60));
      }
    } catch {
      /* sans durée, la vidéo reste proposable */
    }
  }
}

/** Récupère toutes les sources configurées. Une source en panne n'arrête pas les autres. */
export async function fetchAll(src: Sources, since = Date.now() - 4 * 86_400_000, accessToken?: string) {
  const jobs: Promise<Item[]>[] = [
    ...src.youtube.map((c) =>
      get(`https://www.youtube.com/feeds/videos.xml?channel_id=${c.id}`).then((x) => parseFeed(x, { source: c.nom, universe: c.univers, kind: "video" })),
    ),
    ...src.actu.map((f) => get(f.flux).then((x) => parseFeed(x, { source: f.nom, universe: "actu", kind: "article", lean: f.ligne }))),
    ...src.podcasts.map((p) => get(p.flux).then((x) => parseFeed(x, { source: p.nom, universe: p.univers, kind: "podcast" }))),
  ];
  const results = await Promise.allSettled(jobs);
  const errors = results.flatMap((r) => (r.status === "rejected" ? [String(r.reason)] : []));
  const items = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((i) => Date.parse(i.published) >= since);
  await addDurations(items, accessToken);
  // Les Shorts (moins de 2 min) sont écartés d'office.
  return { items: items.filter((i) => !(i.youtubeId && i.durationMin !== undefined && i.durationMin < 2)), errors };
}
