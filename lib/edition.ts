import { boussole, localNow, sources } from "./config";
import { curate } from "./curate";
import { fetchAll } from "./feeds";
import { load, update } from "./store";
import type { DayLog, Edition, Item, State } from "./types";

/** Récupère les sources, garde ce qui n'a jamais été proposé, et compose l'édition du jour. */
export async function refresh() {
  const { date } = localNow();
  const { items, errors } = await fetchAll(sources);
  let edition: Edition | undefined;
  await update(async (s) => {
    for (const it of items) s.items[it.id] = { ...s.items[it.id], ...it };
    const shown = new Set(
      Object.values(s.editions)
        .filter((e) => e.date !== date)
        .flatMap((e) => [...e.learn, ...e.fun].map((p) => p.id).concat(e.topics.flatMap((t) => t.itemIds))),
    );
    const now = Date.now();
    const fresh = (i: Item) => now - Date.parse(i.published) < (i.universe === "actu" ? 1.5 : 4) * 86_400_000;
    const candidates = Object.values(s.items).filter((i) => fresh(i) && !shown.has(i.id) && !s.feedback[i.id]);
    edition = await curate(candidates, boussole, sources, s, date);
    s.editions[date] = edition;
  });
  return { edition: edition!, fetched: items.length, errors };
}

/** L'édition du jour. Si elle n'existe pas encore, la plus récente, sinon on la compose. */
export async function getEdition(): Promise<{ state: State; edition: Edition | null }> {
  const state = await load();
  const { date } = localNow();
  const latest = state.editions[date] ?? Object.values(state.editions).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (latest) return { state, edition: latest };
  try {
    const { edition } = await refresh();
    return { state: await load(), edition };
  } catch (err) {
    console.error("kawna: première édition impossible", err);
    return { state, edition: null };
  }
}

export function today(state: State): DayLog {
  return state.days[localNow().date] ?? { videoMin: 0, actuMin: 0, extraMin: 0 };
}

export function videoLeft(state: State) {
  const d = today(state);
  return Math.max(0, boussole.budgets.videoMinParJour + d.extraMin - d.videoMin);
}

export function items(state: State, ids: string[]) {
  return ids.flatMap((id) => (state.items[id] ? [state.items[id]] : []));
}

/** Les 7 derniers jours : temps par univers et part des contenus qui valaient le coup. */
export function weekStats(state: State) {
  const since = Date.now() - 7 * 86_400_000;
  const days = Object.entries(state.days).filter(([d]) => Date.parse(d) >= since).map(([, v]) => v);
  const fb = Object.entries(state.feedback).filter(([, f]) => Date.parse(f.at) >= since);
  const mins = { actu: 0, divertir: 0, apprendre: 0 };
  for (const [id] of fb) {
    const it = state.items[id];
    if (it?.durationMin) mins[it.universe] += it.durationMin;
  }
  const over = days.filter((d) => d.videoMin > boussole.budgets.videoMinParJour + d.extraMin || d.extraMin > 0).length;
  return {
    videoMin: days.reduce((a, d) => a + d.videoMin, 0),
    actuMin: days.reduce((a, d) => a + d.actuMin, 0),
    byUniverse: mins,
    worth: fb.length ? Math.round((fb.filter(([, f]) => f.verdict === "oui").length / fb.length) * 100) : null,
    rated: fb.length,
    overruns: over,
  };
}
