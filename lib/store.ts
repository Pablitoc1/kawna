import { promises as fs } from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import type { State } from "./types";

const KEY = "kawna:state";
const FILE = path.join(process.cwd(), ".data", "kawna.json");

const empty = (): State => ({ items: {}, editions: {}, days: {}, feedback: {} });

function redis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

/**
 * Tout l'état tient dans un seul document : un seul utilisateur, quelques centaines de contenus.
 * En ligne il vit dans Upstash Redis (partagé entre appareils), en local dans .data/kawna.json.
 */
export async function load(): Promise<State> {
  const r = redis();
  if (r) return { ...empty(), ...((await r.get<State>(KEY)) ?? {}) };
  try {
    return { ...empty(), ...JSON.parse(await fs.readFile(FILE, "utf8")) };
  } catch {
    return empty();
  }
}

export async function save(state: State) {
  prune(state);
  const r = redis();
  if (r) {
    await r.set(KEY, state);
    return;
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(state));
}

export async function update(fn: (s: State) => void | Promise<void>) {
  const s = await load();
  await fn(s);
  await save(s);
  return s;
}

/** Garde 21 jours de contenus et d'éditions, 90 jours d'historique de temps. */
export function prune(s: State, now = Date.now()) {
  const day = 86_400_000;
  const keep = new Set<string>();
  for (const [date, ed] of Object.entries(s.editions)) {
    if (now - Date.parse(date) > 21 * day) delete s.editions[date];
    else for (const id of [...ed.learn, ...ed.fun].map((p) => p.id).concat(ed.topics.flatMap((t) => t.itemIds))) keep.add(id);
  }
  for (const [id, it] of Object.entries(s.items)) {
    if (!keep.has(id) && now - Date.parse(it.published) > 21 * day) delete s.items[id];
  }
  for (const date of Object.keys(s.days)) if (now - Date.parse(date) > 90 * day) delete s.days[date];
}
