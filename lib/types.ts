export type Universe = "actu" | "divertir" | "apprendre";
export type Kind = "video" | "article" | "podcast";
export type Verdict = "oui" | "bof" | "non";

/** Un contenu récupéré depuis une source (vidéo, article, épisode). */
export interface Item {
  id: string;
  kind: Kind;
  universe: Universe;
  source: string;
  title: string;
  url: string;
  image?: string;
  published: string;
  summary?: string;
  durationMin?: number;
  /** Ligne éditoriale de la source, de -1 (gauche) à 1 (droite). Actu seulement. */
  lean?: number;
  /** Identifiant de la vidéo YouTube, pour le lecteur intégré. */
  youtubeId?: string;
}

export interface Pick {
  id: string;
  why: string;
}

export interface Topic {
  title: string;
  consensus: string;
  divergence: string;
  itemIds: string[];
}

export interface Edition {
  date: string;
  createdAt: string;
  curatedBy: "claude" | "regles";
  essentials: string[];
  topics: Topic[];
  learn: Pick[];
  fun: Pick[];
  tonight?: { imdb: string; why: string };
  discarded: { actu: number; divertir: number; apprendre: number; reasons: string[] };
}

export interface DayLog {
  videoMin: number;
  actuMin: number;
  extraMin: number;
}

export interface State {
  items: Record<string, Item>;
  editions: Record<string, Edition>;
  days: Record<string, DayLog>;
  feedback: Record<string, { verdict: Verdict; at: string }>;
  ruleProposal?: { text: string; status: "proposee" | "acceptee" | "refusee" };
}

export interface Boussole {
  objectifs: string;
  budgets: { videoMinParJour: number; actuMinParJour: number };
  regles: { pasDeVideoApres: string; editions: string[] };
  limites: { apprendre: number; divertirVideos: number; actuSujets: number };
}

export interface Sources {
  youtube: { nom: string; id: string; univers: Universe }[];
  actu: { nom: string; flux: string; ligne: number }[];
  podcasts: { nom: string; flux: string; univers: Universe }[];
  aVoir: { titre: string; type: "movie" | "series"; imdb: string; duree?: number; note?: string }[];
  musique: { titre: string; lien: string; type: string; note?: string }[];
}
