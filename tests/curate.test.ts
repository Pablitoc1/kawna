import { describe, expect, it } from "vitest";
import { clusterTopics, curateWithRules, isClickbait } from "@/lib/curate";
import type { Boussole, Item, State } from "@/lib/types";

const b: Boussole = {
  objectifs: "Apprendre le design",
  budgets: { videoMinParJour: 45, actuMinParJour: 15 },
  regles: { pasDeVideoApres: "23:00", editions: ["07:00"] },
  limites: { apprendre: 2, divertirVideos: 1, actuSujets: 2 },
};
const empty: State = { items: {}, editions: {}, days: {}, feedback: {} };
let n = 0;
const item = (p: Partial<Item>): Item => ({
  id: `i${++n}`, kind: "video", universe: "apprendre", source: "S", title: "Titre", url: `https://x/${n}`, published: new Date(Date.now() - n * 60_000).toISOString(), ...p,
});

describe("isClickbait", () => {
  it("repère les titres racoleurs", () => {
    expect(isClickbait("Vous ne croirez JAMAIS ce qui s'est passé")).toBe(true);
    expect(isClickbait("TOUT LE MONDE SE TROMPE SUR CE SUJET")).toBe(true);
    expect(isClickbait("Concevoir une grille typographique")).toBe(false);
  });
});

describe("clusterTopics", () => {
  it("regroupe un même sujet vu par des sources différentes", () => {
    const arts = [
      item({ universe: "actu", source: "A", title: "Réforme des retraites : le Sénat adopte le texte" }),
      item({ universe: "actu", source: "B", title: "Le Sénat adopte la réforme des retraites" }),
      item({ universe: "actu", source: "C", title: "Record de chaleur en novembre" }),
    ];
    const topics = clusterTopics(arts, 3);
    expect(topics).toHaveLength(1);
    expect(topics[0].map((a) => a.source).sort()).toEqual(["A", "B"]);
  });
});

describe("curateWithRules", () => {
  it("respecte les limites, écarte le racolage et ne garde qu'un contenu par source", () => {
    const cands = [
      item({ source: "Atelier", title: "Grilles et marges" }),
      item({ source: "Atelier", title: "Couleurs et contraste" }),
      item({ source: "Code Clair", title: "Les agents expliqués" }),
      item({ source: "Buzz", title: "INCROYABLE !! tu ne vas pas y croire" }),
      item({ source: "Fun", universe: "divertir", title: "Vélo en Islande" }),
      item({ source: "Fun2", universe: "divertir", title: "Cuisine à Tokyo" }),
    ];
    const ed = curateWithRules(cands, b, empty, "2026-11-22");
    expect(ed.learn.map((p) => cands.find((c) => c.id === p.id)!.source)).toEqual(["Atelier", "Code Clair"]);
    expect(ed.fun).toHaveLength(1);
    expect(ed.discarded.reasons[0]).toMatch(/racoleurs/);
  });

  it("fait descendre une source souvent notée « non »", () => {
    const bad = item({ source: "Mauvaise", title: "Vidéo A" });
    const state: State = {
      ...empty,
      items: { x1: { ...bad, id: "x1" }, x2: { ...bad, id: "x2" }, x3: { ...bad, id: "x3" } },
      feedback: { x1: { verdict: "non", at: "2026-11-20" }, x2: { verdict: "non", at: "2026-11-20" }, x3: { verdict: "bof", at: "2026-11-20" } },
    };
    const ed = curateWithRules([bad, item({ source: "Bonne", title: "Vidéo B" })], b, state, "2026-11-22");
    expect(ed.learn.map((p) => p.id)).not.toContain(bad.id);
  });
});
