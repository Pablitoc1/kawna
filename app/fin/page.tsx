import Link from "next/link";
import { Cover } from "@/components/visuals";
import { isNight } from "@/lib/config";
import { letterboxdFilm } from "@/lib/letterboxd";
import { load } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * La porte de sortie. Les applis de streaming te renvoient ici (automatisation « Appli fermée »),
 * et le bouton « J'arrête » de kawna aussi. Une question, puis rien d'autre.
 */
export default async function Fin({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const state = await load();
  const se = state.seance;
  const t = se ? state.cine?.titles[se.key] : undefined;
  const night = isNight();

  if (ok || !se) {
    return (
      <main className="page fin">
        <div className="endmark"><i>✓</i>{night ? "C'est fini pour aujourd'hui. Bonne nuit." : "C'est noté. Rien d'autre à voir ici."}</div>
        {!night ? <Link className="pill" href="/" style={{ width: "fit-content", justifySelf: "center" }}>Revenir à kawna</Link> : null}
      </main>
    );
  }

  return (
    <main className="page fin">
      <div className="fiche">
        <div className="img"><Cover src={t?.poster} seed={se.titre} w={132} h={194} /></div>
        <div style={{ display: "grid", gap: 8, alignContent: "center" }}>
          <span className="mute">Fin de séance</span>
          <h1 className="u">{se.titre}</h1>
        </div>
      </div>
      <form method="post" action="/api/seance/fin" className="stack">
        <h2 style={{ margin: 0, fontSize: 18 }}>Ça valait le coup ?</h2>
        <div className="open">
          <button className="pill solid" name="verdict" value="oui">Oui</button>
          <button className="pill" name="verdict" value="bof">Bof</button>
          <button className="pill" name="verdict" value="non">Non</button>
        </div>
        <button className="pill" name="verdict" value="" style={{ width: "fit-content" }}>J&apos;arrête là, sans noter</button>
      </form>
      {t?.type === "movie" ? (
        <a className="pill" href={letterboxdFilm(t.tmdb)} target="_blank" rel="noreferrer" style={{ width: "fit-content" }}>
          Noter sur Letterboxd
        </a>
      ) : null}
      {night ? <div className="night"><span aria-hidden="true">☾</span>Il est tard : la suite attendra demain.</div> : null}
    </main>
  );
}
