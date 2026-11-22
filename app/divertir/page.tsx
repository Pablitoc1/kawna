import { Discarded, End, Picks } from "@/components/cards";
import { Header } from "@/components/Header";
import { Badge, Cover, minutes } from "@/components/visuals";
import { isNight, sources } from "@/lib/config";
import { getEdition } from "@/lib/edition";
import { poster, stremioLink } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export default async function Divertir() {
  const { state, edition } = await getEdition();
  const night = isNight();
  const tonight = edition?.tonight ? sources.aVoir.find((a) => a.imdb === edition.tonight!.imdb) : undefined;
  const list = await Promise.all(sources.aVoir.map(async (a) => ({ ...a, img: await poster(a.imdb) })));
  const hero = tonight ? list.find((l) => l.imdb === tonight.imdb) : undefined;

  return (
    <main className="page">
      <Header title="Divertir" color="var(--fun)" state={state} />
      {hero && !night ? (
        <a className="hero" href={stremioLink(hero.type, hero.imdb)}>
          <Cover src={hero.img} seed={hero.titre} w={560} h={300} />
          <div className="over">
            <span className="chip">Ce soir{hero.duree ? ` · ${minutes(hero.duree)}` : ""}</span>
            <b>{hero.titre}</b>
            {edition?.tonight?.why ? <span style={{ fontSize: 13 }}>{edition.tonight.why}</span> : null}
            <span className="cta"><Badge name="Stremio" color="#7b5bd6" />Ouvrir dans Stremio</span>
          </div>
        </a>
      ) : null}
      {night ? <div className="night"><span aria-hidden="true">☾</span>Après 23 h : musique, livre audio ou lecture.</div> : null}

      {list.length ? (
        <section>
          <div className="rowhead"><h2>À voir</h2><small>{list.length}</small></div>
          <div className="rail">
            {list.map((a) => (
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
