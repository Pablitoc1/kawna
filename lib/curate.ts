import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Boussole, Edition, Item, Sources, State, Verdict } from "./types";

const CLICKBAIT = /(incroyable|choquant|hallucinant|vous ne (allez|croirez)|tu ne vas pas|personne ne|la vérité sur|insane|shocking|you won'?t believe|!!|\?!|😱|🤯)/i;

export function isClickbait(title: string) {
  const letters = title.replace(/[^A-Za-zÀ-ÿ]/g, "");
  const caps = letters.replace(/[^A-ZÀ-Þ]/g, "").length;
  return CLICKBAIT.test(title) || (letters.length > 12 && caps / letters.length > 0.5);
}

const STOP = new Set(
  "après avant avoir cette comme dans depuis entre leurs notre nous pour quand selon sont tous tout toute très votre faire fait sera était ainsi alors aussi autre encore enfin moins plus sous lors vers chez contre même trois deux selon déjà mais être leur elle elles ils ont qui que quoi dont faut peut doit pourquoi comment voici voilà".split(" "),
);
const words = (t: string) =>
  new Set(
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 5 && !STOP.has(w)),
  );

/** Regroupe les articles qui parlent du même sujet et viennent de sources différentes. */
export function clusterTopics(articles: Item[], max: number) {
  const used = new Set<string>();
  const clusters: Item[][] = [];
  const sorted = [...articles].sort((a, b) => b.published.localeCompare(a.published));
  for (const a of sorted) {
    if (used.has(a.id)) continue;
    const wa = words(a.title);
    const group = [a];
    for (const b of sorted) {
      if (b.id === a.id || used.has(b.id) || group.some((g) => g.source === b.source)) continue;
      const shared = [...words(b.title)].filter((w) => wa.has(w)).length;
      if (shared >= 2) group.push(b);
    }
    if (group.length >= 2) {
      group.forEach((g) => used.add(g.id));
      clusters.push(group.slice(0, 3));
    }
  }
  return clusters.sort((x, y) => y.length - x.length).slice(0, max);
}

function sourceScore(state: State) {
  const score: Record<string, number> = {};
  const w: Record<Verdict, number> = { oui: 1, bof: -0.5, non: -1 };
  for (const [id, f] of Object.entries(state.feedback)) {
    const it = state.items[id];
    if (it) score[it.source] = (score[it.source] ?? 0) + w[f.verdict];
  }
  return score;
}

/** Sélection sans IA : récence, filtre anti-racolage, préférence pour les sources bien notées. */
export function curateWithRules(candidates: Item[], b: Boussole, state: State, date: string): Edition {
  const score = sourceScore(state);
  const clean = candidates.filter((i) => !isClickbait(i.title) && (score[i.source] ?? 0) > -2);
  const rank = (xs: Item[]) => [...xs].sort((a, c) => (score[c.source] ?? 0) - (score[a.source] ?? 0) || c.published.localeCompare(a.published));
  const oneBySource = (xs: Item[], n: number) => {
    const seen = new Set<string>();
    return xs.filter((x) => (seen.has(x.source) ? false : (seen.add(x.source), true))).slice(0, n);
  };
  const learn = oneBySource(rank(clean.filter((i) => i.universe === "apprendre")), b.limites.apprendre);
  const fun = oneBySource(rank(clean.filter((i) => i.universe === "divertir")), b.limites.divertirVideos);
  const topics = clusterTopics(clean.filter((i) => i.universe === "actu"), b.limites.actuSujets);
  const count = (u: Item["universe"]) => candidates.filter((i) => i.universe === u).length;
  const bait = candidates.length - clean.length;
  return {
    date,
    createdAt: new Date().toISOString(),
    curatedBy: "regles",
    essentials: topics.map((t) => t[0].title),
    topics: topics.map((t) => ({ title: t[0].title, consensus: "", divergence: "", itemIds: t.map((x) => x.id) })),
    learn: learn.map((i) => ({ id: i.id, why: `Nouveau chez ${i.source}, une source que tu suis pour apprendre.` })),
    fun: fun.map((i) => ({ id: i.id, why: `Nouveau chez ${i.source}.` })),
    discarded: {
      actu: Math.max(0, count("actu") - topics.flat().length),
      divertir: Math.max(0, count("divertir") - fun.length),
      apprendre: Math.max(0, count("apprendre") - learn.length),
      reasons: bait ? [`${bait} titres racoleurs`] : [],
    },
  };
}

const Schema = z.object({
  essentials: z.array(z.string()),
  topics: z.array(z.object({ title: z.string(), consensus: z.string(), divergence: z.string(), itemIds: z.array(z.string()) })),
  learn: z.array(z.object({ id: z.string(), why: z.string() })),
  fun: z.array(z.object({ id: z.string(), why: z.string() })),
  tonightImdb: z.string(),
  tonightWhy: z.string(),
  discardReasons: z.array(z.string()),
});

const SYSTEM = `Tu composes l'édition du jour de kawna, l'agrégateur personnel de Yahia. kawna remplace les algorithmes des plateformes : il sert les objectifs de Yahia, jamais le temps passé à l'écran.

Ce que tu produis, en français, tutoiement, phrases courtes :
- essentials : 3 à 4 faits marquants du jour, une ligne chacun, factuels et sans ton alarmiste.
- topics : les sujets d'actu couverts par plusieurs sources. Pour chaque sujet, 2 ou 3 articles de sources aux lignes éditoriales différentes (le champ ligne va de -1, gauche, à 1, droite), pour que Yahia voie plusieurs angles. consensus : ce sur quoi les sources s'accordent, en une ligne. divergence : ce sur quoi elles divergent, en une ligne. Ne garde pas un sujet couvert par une seule source.
- learn : les contenus « apprendre » qui servent vraiment ses objectifs.
- fun : les vidéos « divertir » qui détendent sans vider (calmes, de qualité).
- why : une raison de 15 mots maximum, concrète (objectif servi, retour passé, moment).
- tonightImdb / tonightWhy : un titre de sa liste « à voir » à proposer ce soir, ou des chaînes vides si rien ne s'y prête.
- discardReasons : ce que tu as écarté et pourquoi, chiffré (ex. « 6 titres racoleurs », « 4 réactions à chaud »).

Écarte : titres racoleurs, miniatures et titres trompeurs, réactions à chaud, doublons, contenus hors de ses objectifs, compilations interminables. Tiens compte de ses retours : une source souvent notée « non » ou « bof » descend. Respecte strictement les limites données. Utilise uniquement les identifiants fournis.`;

function line(i: Item) {
  const parts = [i.id, i.source, i.title];
  if (i.lean !== undefined) parts.push(`ligne ${i.lean}`);
  if (i.durationMin) parts.push(`${i.durationMin} min`);
  if (i.summary) parts.push(i.summary.slice(0, 160));
  return parts.join(" | ");
}

/** Sélection par Claude, avec sortie structurée. Retombe sur les règles en cas d'échec. */
export async function curate(candidates: Item[], b: Boussole, src: Sources, state: State, date: string): Promise<Edition> {
  if (!process.env.ANTHROPIC_API_KEY || candidates.length === 0) return curateWithRules(candidates, b, state, date);

  const recentFeedback = Object.entries(state.feedback)
    .sort((x, y) => y[1].at.localeCompare(x[1].at))
    .slice(0, 40)
    .flatMap(([id, f]) => (state.items[id] ? [`${f.verdict} : ${state.items[id].source} | ${state.items[id].title}`] : []));
  const by = (u: Item["universe"]) => candidates.filter((i) => i.universe === u).map(line).join("\n") || "(rien)";

  const user = `Objectifs de Yahia : ${b.objectifs}
Limites : apprendre ${b.limites.apprendre} max, divertir ${b.limites.divertirVideos} vidéos max, actu ${b.limites.actuSujets} sujets max.

Ses derniers retours (« ça valait le coup ? ») :
${recentFeedback.join("\n") || "(aucun pour l'instant)"}

Sa liste « à voir » (films et séries) :
${src.aVoir.map((a) => `${a.imdb} | ${a.titre} | ${a.type}${a.duree ? ` | ${a.duree} min` : ""}`).join("\n") || "(vide)"}

Jour : ${date}

ACTU (id | source | titre | ligne | résumé) :
${by("actu")}

APPRENDRE :
${by("apprendre")}

DIVERTIR :
${by("divertir")}`;

  try {
    const client = new Anthropic();
    const res = await client.beta.messages.parse({
      model: process.env.KAWNA_MODEL || "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "medium", format: betaZodOutputFormat(Schema) },
      messages: [{ role: "user", content: user }],
    });
    const out = res.parsed_output;
    if (res.stop_reason === "refusal" || !out) throw new Error(`pas de sortie exploitable (${res.stop_reason})`);

    const known = new Set(candidates.map((c) => c.id));
    const picks = (xs: { id: string; why: string }[], n: number) => xs.filter((x) => known.has(x.id)).slice(0, n);
    const topics = out.topics
      .map((t) => ({ ...t, itemIds: t.itemIds.filter((id) => known.has(id)).slice(0, 3) }))
      .filter((t) => t.itemIds.length >= 2)
      .slice(0, b.limites.actuSujets);
    const learn = picks(out.learn, b.limites.apprendre);
    const fun = picks(out.fun, b.limites.divertirVideos);
    const count = (u: Item["universe"]) => candidates.filter((i) => i.universe === u).length;
    return {
      date,
      createdAt: new Date().toISOString(),
      curatedBy: "claude",
      essentials: out.essentials.slice(0, 4),
      topics,
      learn,
      fun,
      tonight: src.aVoir.some((a) => a.imdb === out.tonightImdb) ? { imdb: out.tonightImdb, why: out.tonightWhy } : undefined,
      discarded: {
        actu: Math.max(0, count("actu") - topics.flatMap((t) => t.itemIds).length),
        divertir: Math.max(0, count("divertir") - fun.length),
        apprendre: Math.max(0, count("apprendre") - learn.length),
        reasons: out.discardReasons.slice(0, 4),
      },
    };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) console.error("kawna: clé Anthropic invalide");
    else if (err instanceof Anthropic.RateLimitError) console.error("kawna: limite de requêtes atteinte");
    else console.error("kawna: sélection par Claude impossible, règles simples utilisées.", err);
    return curateWithRules(candidates, b, state, date);
  }
}
