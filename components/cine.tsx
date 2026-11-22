import Link from "next/link";
import { guard } from "@/lib/garde";
import { drapeau, nomPays, service, type Ouvrir } from "@/lib/services";
import type { Cine, Title } from "@/lib/types";
import { Badge, Cover, minutes } from "./visuals";

export const titleHref = (t: Title) => `/titre/${t.type}/${t.tmdb}`;

/** Logo d'un service (fourni par TMDB) ou, à défaut, une pastille à ses couleurs. */
export function ServiceMark({ k, cine, size = 18 }: { k: string; cine?: Cine; size?: number }) {
  const s = service(k);
  const logo = cine?.providers?.[k]?.logo;
  // eslint-disable-next-line @next/next/no-img-element
  if (logo) return <img className="svclogo" src={logo} alt={s?.nom ?? k} width={size} height={size} />;
  return <Badge name={s?.nom ?? k} color={s?.couleur} size={size} />;
}

export function meta(t: Title) {
  return [
    t.type === "movie" ? "Film" : t.saisons ? `Série · ${t.saisons} saison${t.saisons > 1 ? "s" : ""}` : "Série",
    t.type === "movie" ? minutes(t.duree) : "",
    t.annee,
  ].filter(Boolean).join(" · ");
}

/** Affiche cliquable, avec le service où le titre est inclus. */
export function TitlePoster({ t, mine, cine }: { t: Title; mine: string[]; cine?: Cine }) {
  const on = (t.dispo ?? []).find((d) => mine.includes(d));
  return (
    <Link className="poster" href={titleHref(t)}>
      <div className="img">
        <Cover src={t.poster} seed={t.titre} w={112} h={164} />
        {t.poster ? null : <em>{t.titre}</em>}
        {on ? <span className="on"><ServiceMark k={on} cine={cine} size={22} /></span> : null}
      </div>
      <small>{meta(t)}</small>
    </Link>
  );
}

/** Le bouton principal ouvre le titre dans la première appli ; les autres restent discrets. */
/** Étape guidée : aucune appli ne laisse un site choisir le pays de ton VPN à ta place. */
function VpnStep({ pays, vpn }: { pays: string; vpn: string }) {
  return (
    <span className="vpnstep">
      <i>1</i>Dans {vpn}, connecte-toi : <strong>{drapeau(pays)} {nomPays(pays)}</strong>
    </span>
  );
}

export function OpenButtons({ ways, cine, light, garde, vpnNom = "ton VPN" }: { ways: Ouvrir[]; cine?: Cine; light?: boolean; garde?: { on: boolean; ua: string }; vpnNom?: string }) {
  if (!ways.length) return null;
  const g = garde ?? { on: false, ua: "" };
  const [main, ...rest] = ways.map((w) => ({ ...w, url: guard(w.url, g) }));
  return (
    <div className="open">
      {main.pays ? <VpnStep pays={main.pays} vpn={vpnNom} /> : null}
      <a className={light ? "cta" : "pill solid"} href={main.url} target={main.key === "stremio" ? undefined : "_blank"} rel="noreferrer">
        {main.key === "stremio" ? <Badge name="Stremio" color={main.couleur} /> : <ServiceMark k={main.key} cine={cine} />}
        Ouvrir dans {main.nom}{main.pays ? ` ${drapeau(main.pays)}` : ""}
      </a>
      {rest.map((w) => (
        <a key={w.key + (w.pays ?? "")} className="pill" href={w.url} target={w.key === "stremio" ? undefined : "_blank"} rel="noreferrer" title={w.pays ? `Avec ton VPN : ${nomPays(w.pays)}` : undefined}>
          {w.nom}{w.pays ? ` ${drapeau(w.pays)}` : ""}
        </a>
      ))}
    </div>
  );
}
