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
  /** Le film ou la série proposé ce soir (clé de Title). Les anciennes éditions ont un imdb. */
  tonight?: { key?: string; imdb?: string; why: string };
  /** Quelques titres à découvrir sur tes abonnements. */
  decouvrir?: Pick[];
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
  /** Connexion Google en lecture seule (YouTube). */
  google?: { refreshToken: string; connectedAt: string };
  /** Ce que kawna a lu de ton compte YouTube. */
  youtube?: {
    channels: { id: string; nom: string; univers: Universe }[];
    likes: string[];
    playlists: string[];
    syncedAt: string;
  };
  /** VPN : kawna regarde aussi les catalogues de ces pays (codes ISO, ex. US, GB). */
  vpn?: { nom: string; pays: string[] };
  /** Garde iPhone : les applis s'ouvrent via le raccourci « kawna » (voir lib/garde.ts). */
  garde?: boolean;
  /** Les services vidéo auxquels tu es abonné (clés de lib/services.ts). */
  services?: string[];
  /** Connexion Trakt : ce que tu regardes, ta liste, tes notes. */
  trakt?: { accessToken: string; refreshToken: string; expiresAt: number; connectedAt: string };
  /** Films et séries : ta liste, ce que tu as vu, et le catalogue de tes abonnements. */
  cine?: Cine;
}

/** Un film ou une série. La clé est « movie:123 » ou « series:456 » (identifiants TMDB). */
export interface Title {
  key: string;
  tmdb: number;
  imdb?: string;
  type: "movie" | "series";
  titre: string;
  annee?: string;
  duree?: number;
  saisons?: number;
  poster?: string;
  fond?: string;
  resume?: string;
  /** Note moyenne TMDB sur 10. */
  note?: number;
  genres?: string[];
  /** Les services de ton choix où le titre est inclus dans l'abonnement, et la page « où regarder ». */
  dispo?: string[];
  ouRegarder?: string;
  /** Hors de ta région : pays où le titre est inclus, par service (pour un VPN). */
  ailleurs?: Record<string, string[]>;
  /** Liens directs vers la fiche du titre dans l'appli de chaque service (Wikidata). */
  liens?: Record<string, string>;
  detailsAt?: string;
}

export interface Cine {
  titles: Record<string, Title>;
  /** Ta liste « à voir » (Trakt, sinon config/sources.json). */
  watchlist: string[];
  /** Le catalogue de tes abonnements que kawna peut te proposer. */
  catalogue: string[];
  /** Ce que tu as déjà vu (clés). */
  vus: string[];
  /** Tes notes Trakt, pour les goûts : « 9/10 | Past Lives (2023) ». */
  notes: string[];
  /** Identifiants TMDB des services, et leur logo. */
  providers?: Record<string, { ids: number[]; logo?: string }>;
  syncedAt: string;
}

export interface Boussole {
  objectifs: string;
  budgets: { videoMinParJour: number; actuMinParJour: number };
  regles: { pasDeVideoApres: string; editions: string[] };
  limites: { apprendre: number; divertirVideos: number; actuSujets: number; films?: number };
}

export interface Sources {
  youtube: { nom: string; id: string; univers: Universe }[];
  actu: { nom: string; flux: string; ligne: number }[];
  podcasts: { nom: string; flux: string; univers: Universe }[];
  aVoir: { titre: string; type: "movie" | "series"; imdb: string; duree?: number; note?: string }[];
  musique: { titre: string; lien: string; type: string; note?: string }[];
}
