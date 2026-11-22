/**
 * Les services vidéo par abonnement que kawna sait reconnaître.
 * Aucun n'a d'API publique : kawna sait ce qu'ils proposent grâce à TMDB (données « où regarder » de JustWatch),
 * et ouvre la fiche du titre directement dans l'appli du service.
 */
export interface Service {
  key: string;
  nom: string;
  couleur: string;
  /** Noms possibles du service dans la liste des fournisseurs TMDB. */
  tmdb: string[];
  /** Identifiants TMDB connus, utilisés si la liste des fournisseurs est injoignable. */
  ids: number[];
  /** Domaines des liens directs vers une fiche (formats d'URL Wikidata). */
  domaines: string[];
  /** Recherche du titre dans le service, quand aucun lien direct n'est connu. */
  recherche?: (titre: string) => string;
  /** Dernier recours : l'accueil du service. */
  accueil: string;
}

const q = encodeURIComponent;

export const SERVICES: Service[] = [
  { key: "netflix", nom: "Netflix", couleur: "#e50914", tmdb: ["netflix"], ids: [8], domaines: ["netflix.com"], recherche: (t) => `https://www.netflix.com/search?q=${q(t)}`, accueil: "https://www.netflix.com/" },
  { key: "canalplus", nom: "Canal+", couleur: "#1a1a1a", tmdb: ["canal+", "canal plus", "canalplus"], ids: [381], domaines: ["canalplus.com", "mycanal.fr"], accueil: "https://www.canalplus.com/" },
  { key: "appletv", nom: "Apple TV+", couleur: "#2b2b2b", tmdb: ["apple tv plus", "apple tv+"], ids: [350], domaines: ["tv.apple.com"], recherche: (t) => `https://tv.apple.com/fr/search?term=${q(t)}`, accueil: "https://tv.apple.com/" },
  { key: "disney", nom: "Disney+", couleur: "#113ccf", tmdb: ["disney plus", "disney+"], ids: [337], domaines: ["disneyplus.com"], accueil: "https://www.disneyplus.com/" },
  { key: "prime", nom: "Prime Video", couleur: "#1399ff", tmdb: ["amazon prime video", "prime video"], ids: [119], domaines: ["primevideo.com"], recherche: (t) => `https://www.primevideo.com/search?phrase=${q(t)}`, accueil: "https://www.primevideo.com/" },
  { key: "max", nom: "Max", couleur: "#002be7", tmdb: ["max", "hbo max"], ids: [1899], domaines: ["max.com", "hbomax.com"], accueil: "https://www.max.com/" },
  { key: "paramount", nom: "Paramount+", couleur: "#0064ff", tmdb: ["paramount plus", "paramount+"], ids: [531], domaines: ["paramountplus.com"], accueil: "https://www.paramountplus.com/" },
  { key: "arte", nom: "Arte", couleur: "#f26f21", tmdb: ["arte"], ids: [234], domaines: ["arte.tv"], recherche: (t) => `https://www.arte.tv/fr/search/?q=${q(t)}`, accueil: "https://www.arte.tv/fr/" },
  { key: "francetv", nom: "france.tv", couleur: "#1f2a6b", tmdb: ["france tv", "france.tv", "francetv"], ids: [236], domaines: ["france.tv"], accueil: "https://www.france.tv/" },
  { key: "mubi", nom: "MUBI", couleur: "#001489", tmdb: ["mubi"], ids: [11], domaines: ["mubi.com"], accueil: "https://mubi.com/" },
  { key: "crunchyroll", nom: "Crunchyroll", couleur: "#f47521", tmdb: ["crunchyroll"], ids: [283], domaines: ["crunchyroll.com"], accueil: "https://www.crunchyroll.com/" },
];

export const service = (key: string) => SERVICES.find((s) => s.key === key);

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** Associe chaque service à ses identifiants dans la liste des fournisseurs TMDB (par nom exact). */
export function matchProviders(list: { provider_id: number; provider_name: string; logo_path?: string }[]) {
  const out: Record<string, { ids: number[]; logo?: string }> = {};
  for (const s of SERVICES) {
    const hits = list.filter((p) => s.tmdb.includes(norm(p.provider_name)));
    out[s.key] = hits.length
      ? { ids: [...new Set(hits.map((h) => h.provider_id))], logo: hits.find((h) => h.logo_path)?.logo_path }
      : { ids: s.ids };
  }
  return out;
}

export interface Ouvrir {
  key: string;
  nom: string;
  couleur: string;
  url: string;
  /** true si le lien ouvre la fiche du titre, false si c'est une recherche ou la page « où regarder ». */
  direct: boolean;
  /** Pays où se connecter avec le VPN, si le titre n'est pas inclus dans ta région. */
  pays?: string;
}

const PREFERES = ["US", "GB", "CA", "BE", "CH", "DE", "NL", "ES", "IT", "JP", "AU"];

/** Le pays le plus pratique parmi ceux proposés : d'abord ta liste VPN, puis les plus courants. */
export function meilleurPays(pays: string[], vpnPays: string[] = []) {
  const order = [...vpnPays, ...PREFERES];
  return [...pays].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))[0];
}

export const nomPays = (code: string) => {
  try {
    return new Intl.DisplayNames(["fr"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

export const drapeau = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));

/** Les façons d'ouvrir un titre, dans l'ordre : tes services où il est inclus, puis Stremio. */
export function ouvrir(
  t: { titre: string; type: "movie" | "series"; imdb?: string; dispo?: string[]; ailleurs?: Record<string, string[]>; liens?: Record<string, string>; ouRegarder?: string },
  mine: string[],
  vpn?: { pays: string[] },
): Ouvrir[] {
  const out: Ouvrir[] = [];
  const add = (key: string, pays?: string) => {
    const s = service(key);
    if (!s || !mine.includes(key)) return;
    const direct = t.liens?.[key];
    const url = direct ?? s.recherche?.(t.titre) ?? t.ouRegarder ?? s.accueil;
    if (url) out.push({ key, nom: s.nom, couleur: s.couleur, url, direct: Boolean(direct), pays });
  };
  for (const key of t.dispo ?? []) add(key);
  if (vpn) for (const [key, pays] of Object.entries(t.ailleurs ?? {})) if (pays.length) add(key, meilleurPays(pays, vpn.pays));
  if (t.imdb) out.push({ key: "stremio", nom: "Stremio", couleur: "#7b5bd6", url: `stremio:///detail/${t.type}/${t.imdb}`, direct: true });
  return out;
}
