import { Discarded, End } from "@/components/cards";
import { Header } from "@/components/Header";
import { TrackedLink } from "@/components/TrackedLink";
import { Badge, Cover } from "@/components/visuals";
import { getEdition, items } from "@/lib/edition";

export const dynamic = "force-dynamic";

const leanColor = (l = 0) => (l < -0.25 ? "#d0566b" : l > 0.25 ? "#4f7fd6" : "#8a8fa0");

export default async function Actu() {
  const { state, edition } = await getEdition();
  return (
    <main className="page">
      <Header title="Actu" color="var(--actu)" state={state} />
      {!edition || edition.topics.length === 0 ? (
        <div className="empty"><b>Rien de nouveau</b>Aucun sujet couvert par plusieurs de tes sources aujourd&apos;hui.</div>
      ) : (
        <>
          {edition.essentials.length ? (
            <section className="brief">
              <div className="rowhead" style={{ margin: 0 }}><h2>L&apos;essentiel du jour</h2><small>{edition.essentials.length} points</small></div>
              <ul>{edition.essentials.map((e) => <li key={e}>{e}</li>)}</ul>
            </section>
          ) : null}
          <section>
            <div className="rowhead"><h2>Sujets du jour</h2><small>plusieurs angles</small></div>
            <div className="stack">
              {edition.topics.map((t) => {
                const arts = items(state, t.itemIds);
                const img = arts.find((a) => a.image)?.image;
                return (
                  <article key={t.title} className="topic">
                    <div className="img"><Cover src={img} seed={t.title} w={560} h={120} /></div>
                    <div className="body">
                      <h3>{t.title}</h3>
                      <div>
                        <div className="spec" aria-label="Ligne éditoriale des sources">
                          {arts.map((a) => <i key={a.id} style={{ left: `${((a.lean ?? 0) + 1) * 50}%`, background: leanColor(a.lean) }} />)}
                        </div>
                        <div className="spec-l"><span>Gauche</span><span>Droite</span></div>
                      </div>
                      <div className="stack" style={{ gap: 6 }}>
                        {arts.map((a) => (
                          <TrackedLink key={a.id} href={a.url} minutes={4} className="angle">
                            <span><Badge name={a.source} color={leanColor(a.lean)} /><em>{a.source} · {a.title}</em></span>
                            <small className="mute">↗</small>
                          </TrackedLink>
                        ))}
                      </div>
                      {t.consensus || t.divergence ? (
                        <div className="agree">
                          {t.consensus ? <span><b>Tous d&apos;accord :</b> {t.consensus}</span> : null}
                          {t.divergence ? <span><b>Ils divergent :</b> {t.divergence}</span> : null}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
          <Discarded count={edition.discarded.actu} reasons={edition.discarded.reasons} />
          <End>Tu es à jour.</End>
        </>
      )}
    </main>
  );
}
