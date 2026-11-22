import Link from "next/link";
import { headers } from "next/headers";
import { Discarded, End, Picks } from "@/components/cards";
import { OpenButtons, TitlePoster, meta, titleHref } from "@/components/cine";
import { Header } from "@/components/Header";
import { Badge, Cover, minutes } from "@/components/visuals";
import { isNight, sources } from "@/lib/config";
import { getEdition } from "@/lib/edition";
import { ouvrir } from "@/lib/services";
import { poster, stremioLink, tmdbConfigured } from "@/lib/tmdb";
import type { Title } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Divertir() {
  const { state, edition } = await getEdition();
  const night = isNight();
  const ua = (await headers()).get("user-agent") ?? "";
  const garde = { on: Boolean(state.garde), ua };
  const cine = state.cine;
  const mine = state.services ?? [];
  const get = (k?: string) => (k && cine?.titles[k]) || undefined;

  const tonight: Title | undefined = get(edition?.tonight?.key) ?? (edition?.tonight?.imdb ? Object.values(cine?.titles ?? {}).find((t) => t.imdb === edition.tonight!.imdb) : undefined);
  const decouvrir = (edition?.decouvrir ?? []).flatMap((d) => (get(d.id) ? [get(d.id)!] : []));
  const liste = (cine?.watchlist ?? []).flatMap((k) => (get(k) && k !== tonight?.key ? [get(k)!] : [])).slice(0, 12);
  // Sans TMDB : l'ancienne liste de config/sources.json, ouverte dans Stremio.
  const legacy = !cine ? await Promise.all(sources.aVoir.map(async (a) => ({ ...a, img: await poster(a.imdb) }))) : [];

  return (
    <main className="page">
      <Header title="Divertir" color="var(--fun)" state={state} />
      {tonight && !night ? (
        <div className="hero">
          <Cover src={tonight.fond ?? tonight.poster} seed={tonight.titre} w={560} h={300} />
          <div className="over">
            <span className="chip">Ce soir · {meta(tonight)}</span>
            <Link href={titleHref(tonight)} style={{ color: "#fff" }}><b>{tonight.titre}</b></Link>
            {edition?.tonight?.why ? <span style={{ fontSize: 13 }}>{edition.tonight.why}</span> : null}
            <OpenButtons ways={ouvrir(tonight, mine, state.vpn).slice(0, 1)} cine={cine} light garde={garde} vpnNom={state.vpn?.nom} />
          </div>
        </div>
      ) : null}
      {night ? <div className="night"><span aria-hidden="true">☾</span>Après 23 h : musique, livre audio ou lecture.</div> : null}

      {!mine.length && tmdbConfigured() ? (
        <Link className="empty" href="/moi#abonnements"><b>Coche tes abonnements</b>Netflix, Canal+, Apple TV+… kawna te proposera ce qui en vaut la peine.</Link>
      ) : null}

      {decouvrir.length && !night ? (
        <section>
          <div className="rowhead"><h2>À découvrir sur tes abonnements</h2><small>{decouvrir.length}</small></div>
          <div className="rail">{decouvrir.map((t) => <TitlePoster key={t.key} t={t} mine={mine} cine={cine} />)}</div>
        </section>
      ) : null}

      {liste.length ? (
        <section>
          <div className="rowhead"><h2>Ta liste</h2><small>{cine!.watchlist.length}</small></div>
          <div className="rail">{liste.map((t) => <TitlePoster key={t.key} t={t} mine={mine} cine={cine} />)}</div>
        </section>
      ) : null}

      {legacy.length ? (
        <section>
          <div className="rowhead"><h2>À voir</h2><small>{legacy.length}</small></div>
          <div className="rail">
            {legacy.map((a) => (
              <a key={a.imdb} className="poster" href={stremioLink(a.type, a.imdb)}>
                <div className="img"><Cover src={a.img} seed={a.titre} w={112} h={164} />{a.img ? null : <em>{a.titre}</em>}</div>
                <small>{a.type === "movie" ? "Film" : "Série"}{a.duree ? ` · ${minutes(a.duree)}` : ""}</small>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {edition && edition.fun.length ? (
        <section>
          <div className="rowhead"><h2>Vidéos</h2><small>{edition.fun.length}</small></div>
          <Picks picks={edition.fun} items={state.items} locked={night} />
        </section>
      ) : null}

      {sources.musique.length ? (
        <section>
          <div className="rowhead"><h2>Musique</h2><small>{sources.musique.length}</small></div>
          <div className="rail">
            {sources.musique.map((m) => (
              <a key={m.lien + m.titre} className="square" href={m.lien} target="_blank" rel="noreferrer">
                <div className="img"><Cover seed={m.titre} w={124} h={124} /></div>
                <b>{m.titre}</b>
                <span className="src"><Badge name="Musique" color="#e5486b" />{m.type}</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {edition ? <Discarded count={edition.discarded.divertir} reasons={edition.discarded.reasons} /> : null}
      <End>C&apos;est tout pour ce soir.</End>
    </main>
  );
}
