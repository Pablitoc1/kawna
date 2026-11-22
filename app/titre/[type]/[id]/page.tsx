import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { OpenButtons, ServiceMark, meta } from "@/components/cine";
import { Cover } from "@/components/visuals";
import { isNight, localNow } from "@/lib/config";
import { meilleurPays, ouvrir, service } from "@/lib/services";
import { load } from "@/lib/store";

export const dynamic = "force-dynamic";

/** La fiche d'un film ou d'une série : de quoi décider, puis un bouton pour l'ouvrir dans l'appli. Rien d'autre. */
export default async function TitrePage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  const state = await load();
  const t = state.cine?.titles[`${type}:${id}`];
  if (!t) notFound();
  const mine = state.services ?? [];
  const ua = (await headers()).get("user-agent") ?? "";
  const e = state.editions[localNow().date];
  const why = e?.tonight?.key === t.key ? e.tonight.why : e?.decouvrir?.find((d) => d.id === t.key)?.why;
  const ways = ouvrir(t, mine, state.vpn);
  const ailleurs = state.vpn ? Object.entries(t.ailleurs ?? {}).filter(([k, p]) => mine.includes(k) && p.length) : [];
  const dispo = (t.dispo ?? []).filter((d) => mine.includes(d));

  return (
    <main className="page">
      <Link href="/divertir" className="mute">← Divertir</Link>
      <div className="fiche">
        <div className="img"><Cover src={t.poster} seed={t.titre} w={132} h={194} /></div>
        <div style={{ display: "grid", gap: 8 }}>
          <h1 className="u">{t.titre}</h1>
          <span className="mute">{meta(t)}{t.note ? ` · ${t.note}/10` : ""}</span>
          {t.genres?.length ? <span className="mute">{t.genres.join(" · ")}</span> : null}
          {dispo.length ? (
            <span className="src">{dispo.map((d) => <ServiceMark key={d} k={d} cine={state.cine} />)}Inclus dans {dispo.map((d) => service(d)?.nom).join(", ")}</span>
          ) : ailleurs.length ? (
            <span className="src">{ailleurs.slice(0, 2).map(([k]) => <ServiceMark key={k} k={k} cine={state.cine} />)}Avec ton VPN : {ailleurs.slice(0, 2).map(([k, p]) => `${service(k)?.nom} ${meilleurPays(p, state.vpn?.pays)}`).join(", ")}</span>
          ) : <span className="mute">Pas dans tes abonnements : Stremio.</span>}
        </div>
      </div>
      {why ? <span className="why">{why}</span> : null}
      {t.resume ? <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55 }}>{t.resume}</p> : null}
      {isNight() ? (
        <div className="night"><span aria-hidden="true">☾</span>Il est tard. Garde-le pour demain soir.</div>
      ) : (
        <OpenButtons t={t} ways={ways} cine={state.cine} garde={{ on: Boolean(state.garde), ua }} vpnNom={state.vpn?.nom} />
      )}
      <div className="empty">Pas de bande-annonce automatique. Pas de « tu aimeras aussi ».</div>
    </main>
  );
}
