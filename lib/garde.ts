/**
 * Garde iPhone : kawna ouvre les applis de streaming en passant par un raccourci « kawna »
 * qui laisse un laissez-passer d'une minute. Une automatisation Raccourcis « Quand Netflix est ouvert »
 * renvoie à l'écran d'accueil si l'appli a été ouverte sans ce laissez-passer.
 */
export const SHORTCUT = "kawna";

export const isIOS = (ua: string) => /iPhone|iPad|iPod/i.test(ua);

/**
 * Lien qui lance le raccourci. Le texte transmis est « minutes|url » : le raccourci lance une minuterie
 * de cette durée (fin : « Arrêter la lecture ») puis ouvre l'URL.
 */
export const viaShortcut = (url: string, minutes = 0) =>
  `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT)}&input=text&text=${encodeURIComponent(`${minutes}|${url}`)}`;

/** Hors iPhone, ou garde désactivée, les liens restent directs. */
export function guard(url: string, opts: { on: boolean; ua: string }, minutes = 0) {
  if (!opts.on || !isIOS(opts.ua) || url.startsWith("shortcuts:")) return url;
  return viaShortcut(url, minutes);
}

/** Durée d'une séance : le film, ou un épisode, plus 5 minutes pour le générique. */
export const seanceMinutes = (t: { type: "movie" | "series"; duree?: number }) => (t.duree ?? (t.type === "movie" ? 110 : 45)) + 5;
