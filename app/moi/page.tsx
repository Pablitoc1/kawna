import { Header } from "@/components/Header";
import { Recompose } from "@/components/Recompose";
import { Badge, Ring, minutes } from "@/components/visuals";
import { boussole, sources } from "@/lib/config";
import { load } from "@/lib/store";
import { weekStats } from "@/lib/edition";

export const dynamic = "force-dynamic";

export default async function Moi() {
  const state = await load();
  const w = weekStats(state);
  const weekVideoBudget = boussole.budgets.videoMinParJour * 7;
  const weekActuBudget = boussole.budgets.actuMinParJour * 7;
  const srcs = [
    { name: "YouTube", n: sources.youtube.length, color: "#d63a3a" },
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
