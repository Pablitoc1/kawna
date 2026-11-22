import { Header } from "@/components/Header";
import { Recompose } from "@/components/Recompose";
import { Badge, Ring, minutes } from "@/components/visuals";
import { boussole, sources } from "@/lib/config";
import { googleConfigured } from "@/lib/google";
import { load } from "@/lib/store";
import { weekStats } from "@/lib/edition";

export const dynamic = "force-dynamic";

const GOOGLE_MSG: Record<string, string> = {
  ok: "YouTube est connecté. Tes abonnements seront dans la prochaine édition.",
  refus: "La connexion a été annulée.",
  erreur: "La connexion à Google a échoué. Réessaie dans un instant.",
  config: "Il manque GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans les réglages Vercel.",
  deconnecte: "YouTube est déconnecté.",
};

export default async function Moi({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const { google } = await searchParams;
  const state = await load();
  const yt = state.youtube;
  const byUni = (u: string) => yt?.channels.filter((c) => c.univers === u).length ?? 0;
  const w = weekStats(state);
  const weekVideoBudget = boussole.budgets.videoMinParJour * 7;
  const weekActuBudget = boussole.budgets.actuMinParJour * 7;
  const srcs = [
    { name: "YouTube", n: sources.youtube.length + (yt?.channels.length ?? 0), color: "#d63a3a" },
    { name: "Actu", n: sources.actu.length, color: "#e8862e" },
    { name: "Podcasts", n: sources.podcasts.length, color: "#8b4fd1" },
    { name: "Stremio", n: sources.aVoir.length, color: "#7b5bd6" },
    { name: "Musique", n: sources.musique.length, color: "#e5486b" },
  ];

  return (
    <main className="page">
      <Header title="Ta semaine" state={state} />
      <div className="week">
        <div><Ring big value={w.actuMin} max={weekActuBudget} color="var(--actu)" label={minutes(w.actuMin) || "0"} />Actu</div>
        <div><Ring big value={w.videoMin} max={weekVideoBudget} color="var(--fun)" label={minutes(w.videoMin) || "0"} />Vidéo</div>
        <div><Ring big value={w.rated} max={Math.max(w.rated, 10)} color="var(--learn)" label={String(w.rated)} />Notés</div>
      </div>
      <div className="card verdict">
        <div className="big">{w.worth === null ? "–" : `${w.worth} %`}</div>
        <span className="mute">valait le coup<br />{w.overruns} dépassement{w.overruns > 1 ? "s" : ""} de budget</span>
      </div>

      <section className="card stack">
        <div className="rowhead" style={{ margin: 0 }}><h2>Ton compte YouTube</h2><Badge name="YT" color="#d63a3a" /></div>
        {google && GOOGLE_MSG[google] ? <span className="mute" role="status">{GOOGLE_MSG[google]}</span> : null}
        {state.google ? (
          <>
            <span>
              Connecté en lecture seule. {yt ? `${yt.channels.length} abonnements (${byUni("apprendre")} pour apprendre, ${byUni("divertir")} pour te divertir), ${yt.likes.length} vidéos aimées, ${yt.playlists.length} playlists.` : "Lecture en cours…"}
            </span>
            <form method="post" action="/api/google/disconnect"><button className="pill" type="submit">Déconnecter YouTube</button></form>
          </>
        ) : (
          <>
            <span className="mute">kawna lit tes abonnements, tes vidéos aimées et tes playlists pour savoir quoi te proposer. Il ne peut rien publier ni modifier.</span>
            {googleConfigured() ? (
              <a className="pill solid" href="/api/google/connect" style={{ width: "fit-content" }}>Se connecter avec Google</a>
            ) : (
              <span className="mute">Pour activer la connexion, ajoute GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET (voir le README).</span>
            )}
          </>
        )}
      </section>

      <section className="card stack">
        <div className="rowhead" style={{ margin: 0 }}><h2>Ta boussole</h2></div>
        <p className="compass" style={{ margin: 0 }}>« {boussole.objectifs} »</p>
        <ul className="rules">
          <li><span>Vidéo</span><small>{boussole.budgets.videoMinParJour} min / jour</small></li>
          <li><span>Actu</span><small>{boussole.budgets.actuMinParJour} min / jour</small></li>
          <li><span>Pas de vidéo après</span><small>{boussole.regles.pasDeVideoApres}</small></li>
          <li><span>Éditions</span><small>{boussole.regles.editions.join(" et ")}</small></li>
        </ul>
        <span className="mute">Pour la modifier : config/boussole.json.</span>
      </section>

      <section>
        <div className="rowhead"><h2>Tes sources</h2></div>
        <div className="srcgrid">
          {srcs.map((s) => <div key={s.name}><Badge name={s.name} color={s.color} />{s.name} · {s.n}</div>)}
          <div style={{ textDecoration: "line-through" }}><Badge name="IG" color="#555" />Instagram</div>
          <div style={{ textDecoration: "line-through" }}><Badge name="TT" color="#333" />TikTok</div>
        </div>
      </section>

      <Recompose />
    </main>
  );
}
