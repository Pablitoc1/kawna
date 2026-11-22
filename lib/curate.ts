import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { cineCandidates, cineLine } from "./cine";
import type { Boussole, Edition, Item, Sources, State, Title, Verdict } from "./types";

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

/** Films et séries sans IA : ta liste d'abord (ce qui est inclus dans tes abonnements en premier), puis les mieux notés. */
export function filmsWithRules(state: State, b: Boussole, date: string): Pick<Edition, "tonight" | "decouvrir"> {
  const { liste, catalogue } = cineCandidates(state, date);
  const mine = state.services ?? [];
  const onMine = (t: Title) => (t.dispo ?? []).some((d) => mine.includes(d));
  const first = liste.find(onMine) ?? liste[0] ?? catalogue[0];
  const n = b.limites.films ?? 3;
  const rest = [...catalogue].filter((t) => t.key !== first?.key).sort((x, y) => (y.note ?? 0) - (x.note ?? 0));
  // Alterne films et séries pour ne pas tout miser sur un format.
  const films = rest.filter((t) => t.type === "movie");
  const series = rest.filter((t) => t.type === "series");
  const mixed: Title[] = [];
  while (mixed.length < n && (films.length || series.length)) {
    const f = films.shift();
    if (f) mixed.push(f);
    const se = mixed.length < n ? series.shift() : undefined;
    if (se) mixed.push(se);
  }
  return {
    tonight: first ? { key: first.key, why: liste.includes(first) ? "Dans ta liste depuis un moment." : "Parmi les mieux notés de tes abonnements." } : undefined,
    decouvrir: mixed.map((t) => ({ id: t.key, why: t.note ? `Noté ${t.note}/10.` : "Inclus dans tes abonnements." })),
  };
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
    ...filmsWithRules(state, b, date),
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
  tonightKey: z.string(),
  tonightWhy: z.string(),
  decouvrir: z.array(z.object({ id: z.string(), why: z.string() })),
  discardReasons: z.array(z.string()),
});

const SYSTEM = `Tu composes l'édition du jour de kawna, l'agrégateur personnel de Yahia. kawna remplace les algorithmes des plateformes : il sert les objectifs de Yahia, jamais le temps passé à l'écran.

Ce que tu produis, en français, tutoiement, phrases courtes :
- essentials : 3 à 4 faits marquants du jour, une ligne chacun, factuels et sans ton alarmiste.
- topics : les sujets d'actu couverts par plusieurs sources. Pour chaque sujet, 2 ou 3 articles de sources aux lignes éditoriales différentes (le champ ligne va de -1, gauche, à 1, droite), pour que Yahia voie plusieurs angles. consensus : ce sur quoi les sources s'accordent, en une ligne. divergence : ce sur quoi elles divergent, en une ligne. Ne garde pas un sujet couvert par une seule source.
- learn : les contenus « apprendre » qui servent vraiment ses objectifs.
- fun : les vidéos « divertir » qui détendent sans vider (calmes, de qualité).
- why : une raison de 15 mots maximum, concrète (objectif servi, retour passé, moment).
- tonightKey / tonightWhy : UN film ou UNE série à proposer ce soir, choisi dans sa liste ou le catalogue de ses abonnements. Privilégie sa liste et ce qui est inclus dans ses abonnements. Tiens compte du jour (un film long le week-end, plus court en semaine). Chaînes vides si rien ne s'y prête.
- decouvrir : quelques titres du CATALOGUE à découvrir sur ses abonnements, qui collent à ses goûts (notes Trakt) et à ses objectifs. Varie films et séries. Pas de titre déjà proposé ce soir.
- discardReasons : ce que tu as écarté et pourquoi, chiffré (ex. « 6 titres racoleurs », « 4 réactions à chaud »).

Ses vidéos aimées et ses playlists montrent ses goûts : sers-t'en pour choisir parmi les nouveautés, sans jamais les laisser l'emporter sur ses objectifs.

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
  const hasFilms = Boolean(state.cine?.watchlist.length || state.cine?.catalogue.length);
  if (!process.env.ANTHROPIC_API_KEY || (candidates.length === 0 && !hasFilms)) return curateWithRules(candidates, b, state, date);

  const recentFeedback = Object.entries(state.feedback)
    .sort((x, y) => y[1].at.localeCompare(x[1].at))
    .slice(0, 40)
    .flatMap(([id, f]) => (state.items[id] ? [`${f.verdict} : ${state.items[id].source} | ${state.items[id].title}`] : []));
  const films = cineCandidates(state, date);
  const by = (u: Item["universe"]) => candidates.filter((i) => i.universe === u).map(line).join("\n") || "(rien)";

  const user = `Objectifs de Yahia : ${b.objectifs}
Limites : apprendre ${b.limites.apprendre} max, divertir ${b.limites.divertirVideos} vidéos max, actu ${b.limites.actuSujets} sujets max.

Ses derniers retours (« ça valait le coup ? ») :
${recentFeedback.join("\n") || "(aucun pour l'instant)"}

Ses goûts sur YouTube (vidéos aimées récemment, chaîne | titre) :
${state.youtube?.likes.slice(0, 50).join("\n") || "(compte YouTube non connecté)"}
Ses playlists : ${state.youtube?.playlists.join(", ") || "(aucune)"}

Ses abonnements vidéo : ${(state.services ?? []).join(", ") || "(aucun coché)"}. Il a aussi Stremio pour tout le reste.${state.vpn ? ` Il a un VPN (${state.vpn.nom}) : un titre « seulement via VPN » reste proposable, mais préfère ce qui est inclus dans sa région.` : ""}
Limite films et séries à découvrir : ${b.limites.films ?? 3} max.

Ses notes de films et séries (Trakt) :
${state.cine?.notes.slice(0, 40).join("\n") || "(aucune)"}

SA LISTE « à voir » (clé | titre | format | durée | note | genres | où | résumé) :
${films.liste.map((t) => cineLine(t, state.services ?? [], state.vpn)).join("\n") || "(vide)"}

CATALOGUE de ses abonnements (pas encore vus) :
${films.catalogue.map((t) => cineLine(t, state.services ?? [], state.vpn)).join("\n") || "(vide)"}

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
    const catKeys = new Set(films.catalogue.map((t) => t.key));
    const filmKeys = new Set([...films.liste.map((t) => t.key), ...catKeys]);
    return {
      date,
      createdAt: new Date().toISOString(),
      curatedBy: "claude",
      essentials: out.essentials.slice(0, 4),
      topics,
      learn,
      fun,
      tonight: filmKeys.has(out.tonightKey) ? { key: out.tonightKey, why: out.tonightWhy } : undefined,
      decouvrir: out.decouvrir.filter((d) => catKeys.has(d.id) && d.id !== out.tonightKey).slice(0, b.limites.films ?? 3),
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
