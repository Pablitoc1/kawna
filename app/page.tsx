import Link from "next/link";
import { Header } from "@/components/Header";
import { Cover, minutes } from "@/components/visuals";
import { isNight, sources } from "@/lib/config";
import { getEdition, items } from "@/lib/edition";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { state, edition } = await getEdition();
  const night = isNight();

  if (!edition) {
    return (
      <main className="page">
        <Header state={state} />
        <div className="empty">
          <b>Pas encore d&apos;édition</b>
          Ajoute tes sources dans config/sources.json, puis ouvre l&apos;onglet Moi pour composer la première édition.
        </div>
      </main>
    );
  }

  const learn = items(state, edition.learn.map((p) => p.id));
  const fun = items(state, edition.fun.map((p) => p.id));
  const actu = items(state, edition.topics.flatMap((t) => t.itemIds));
  const total = (xs: typeof learn) => xs.reduce((a, i) => a + (i.durationMin ?? 0), 0);

  const tiles = [
    { href: "/actu", label: "Actu", count: `${edition.topics.length} sujets`, peek: actu.slice(0, 2), seed: "actu-tile", off: false },
    { href: "/divertir", label: "Divertir", count: night ? "Musique et lecture" : `${fun.length + (edition.tonight ? 1 : 0)} · ce soir`, peek: fun.slice(0, 2), seed: "divertir-tile", off: false },
    { href: "/apprendre", label: "Apprendre", count: night ? "Demain 7 h" : `${learn.length} · ${minutes(total(learn)) || "à voir"}`, peek: learn.slice(0, 2), seed: "apprendre-tile", off: night },
  ];

  return (
    <main className="page">
      <Header state={state} />
      {night ? (
        <div className="night">
          <span aria-hidden="true">☾</span>Il est tard : plus de vidéo jusqu&apos;à 7 h. Audio et lecture seulement.
        </div>
      ) : null}
      <div className="tiles">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className={t.off ? "tile off" : "tile"} aria-disabled={t.off || undefined}>
            <Cover seed={t.seed} w={560} h={150} />
            {t.peek.length ? (
              <div className="peek">{t.peek.map((p) => <span key={p.id}><Cover src={p.image} seed={p.title} w={64} h={40} /></span>)}</div>
            ) : null}
            <div className="lbl"><b>{t.label}</b><span className="count">{t.count}</span></div>
          </Link>
        ))}
      </div>
      {sources.youtube.length === 0 && !state.google ? (
        <Link href="/moi" className="empty"><b>Connecte ton compte YouTube</b>Dans l&apos;onglet Moi, pour que kawna lise tes abonnements.</Link>
      ) : null}
    </main>
  );
}
