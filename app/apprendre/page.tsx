import { Discarded, End, Picks } from "@/components/cards";
import { Header } from "@/components/Header";
import { isNight } from "@/lib/config";
import { getEdition } from "@/lib/edition";

export const dynamic = "force-dynamic";

export default async function Apprendre() {
  const { state, edition } = await getEdition();
  const night = isNight();
  return (
    <main className="page">
      <Header title="Apprendre" color="var(--learn)" state={state} />
      {night ? <div className="night"><span aria-hidden="true">☾</span>Reprends demain à 7 h, à tête reposée.</div> : null}
      {!edition || edition.learn.length === 0 ? (
        <div className="empty"><b>Rien pour l&apos;instant</b>Aucun nouveau contenu de tes sources « apprendre ».</div>
      ) : (
        <>
          <section>
            <div className="rowhead"><h2>Pour tes objectifs</h2><small>{edition.learn.length}</small></div>
            <Picks picks={edition.learn} items={state.items} locked={night} />
          </section>
          <Discarded count={edition.discarded.apprendre} reasons={edition.discarded.reasons} />
          <End>{edition.learn.length} contenus. C&apos;est tout.</End>
        </>
      )}
    </main>
  );
}
