/**
 * Garde iPhone : kawna ouvre les applis de streaming en passant par un raccourci « kawna »
 * qui laisse un laissez-passer d'une minute. Une automatisation Raccourcis « Quand Netflix est ouvert »
 * renvoie à l'écran d'accueil si l'appli a été ouverte sans ce laissez-passer.
 */
export const SHORTCUT = "kawna";

export const isIOS = (ua: string) => /iPhone|iPad|iPod/i.test(ua);

/** Lien qui lance le raccourci avec l'URL à ouvrir. */
export const viaShortcut = (url: string) =>
  `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT)}&input=text&text=${encodeURIComponent(url)}`;

/** Hors iPhone, ou garde désactivée, les liens restent directs. */
export function guard(url: string, opts: { on: boolean; ua: string }) {
  if (!opts.on || !isIOS(opts.ua) || url.startsWith("shortcuts:")) return url;
  return viaShortcut(url);
}
