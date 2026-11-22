import { Header } from "@/components/Header";
import { Recompose } from "@/components/Recompose";
import { Badge, Ring, minutes } from "@/components/visuals";
import { boussole, sources } from "@/lib/config";
import { ServiceMark } from "@/components/cine";
import { SHORTCUT } from "@/lib/garde";
import { googleConfigured } from "@/lib/google";
import { SERVICES } from "@/lib/services";
import { tmdbConfigured } from "@/lib/tmdb";
import { traktConfigured } from "@/lib/trakt";
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

const SERVICES_MSG: Record<string, string> = {
  ok: "C'est noté. Divertir te propose maintenant ce qui est inclus dans tes abonnements.",
  catalogue: "Enregistré, mais le catalogue n'a pas pu être lu. Il le sera à la prochaine édition.",
};
const TRAKT_MSG: Record<string, string> = {
  ok: "Trakt est connecté : ta liste et ce que tu as vu sont à jour.",
  refus: "La connexion a été annulée.",
  erreur: "La connexion à Trakt a échoué. Réessaie dans un instant.",
  config: "Il manque TRAKT_CLIENT_ID et TRAKT_CLIENT_SECRET dans les réglages Vercel.",
  deconnecte: "Trakt est déconnecté.",
};

export default async function Moi({ searchParams }: { searchParams: Promise<{ google?: string; services?: string; trakt?: string }> }) {
  const { google, services: servicesMsg, trakt } = await searchParams;
  const state = await load();
  const yt = state.youtube;
  const mine = state.services ?? [];
  const byUni = (u: string) => yt?.channels.filter((c) => c.univers === u).length ?? 0;
  const w = weekStats(state);
  const weekVideoBudget = boussole.budgets.videoMinParJour * 7;
  const weekActuBudget = boussole.budgets.actuMinParJour * 7;
  const srcs = [
    { name: "YouTube", n: sources.youtube.length + (yt?.channels.length ?? 0), color: "#d63a3a" },
    { name: "Actu", n: sources.actu.length, color: "#e8862e" },
    { name: "Podcasts", n: sources.podcasts.length, color: "#8b4fd1" },
    { name: "Films", n: state.cine?.watchlist.length ?? sources.aVoir.length, color: "#7b5bd6" },
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

      <section className="card stack" id="abonnements">
        <div className="rowhead" style={{ margin: 0 }}><h2>Tes abonnements</h2><small>{mine.length}</small></div>
        {servicesMsg && SERVICES_MSG[servicesMsg] ? <span className="mute" role="status">{SERVICES_MSG[servicesMsg]}</span> : null}
        {tmdbConfigured() ? (
          <form method="post" action="/api/services" className="stack">
            <div className="svcgrid">
              {SERVICES.map((sv) => (
                <label key={sv.key}>
                  <input type="checkbox" name="service" value={sv.key} defaultChecked={mine.includes(sv.key)} />
                  <ServiceMark k={sv.key} cine={state.cine} size={44} />
                  {sv.nom}
                </label>
              ))}
            </div>
            <button className="pill solid" type="submit" style={{ width: "fit-content" }}>Enregistrer</button>
          </form>
        ) : (
          <span className="mute">Pour voir le catalogue de tes abonnements, ajoute TMDB_API_KEY (gratuite, voir le README).</span>
        )}
        <div className="rowhead" style={{ margin: "6px 0 0" }}><h2 style={{ fontSize: 14 }}>VPN</h2><small>{state.vpn ? state.vpn.pays.join(" · ") : "aucun"}</small></div>
        <span className="mute">Avec un VPN, kawna regarde aussi les catalogues de ces pays et te dit où te connecter avant d&apos;ouvrir le titre.</span>
        <form method="post" action="/api/vpn" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="field" name="nom" defaultValue={state.vpn?.nom ?? "NordVPN"} aria-label="Nom du VPN" style={{ width: 120 }} />
          <input className="field" name="pays" defaultValue={state.vpn?.pays.join(", ") ?? "US, GB"} aria-label="Pays (codes, ex. US, GB)" style={{ width: 120 }} />
          <button className="pill" type="submit">{state.vpn ? "Mettre à jour" : "Activer"}</button>
        </form>
        <div className="rowhead" style={{ margin: "6px 0 0" }}><h2 style={{ fontSize: 14 }}>Trakt</h2><Badge name="TR" color="#9f42c6" /></div>
        {trakt && TRAKT_MSG[trakt] ? <span className="mute" role="status">{TRAKT_MSG[trakt]}</span> : null}
        {state.trakt ? (
          <>
            <span>Connecté. {state.cine ? `${state.cine.watchlist.length} titres dans ta liste, ${state.cine.vus.length} déjà vus, ${state.cine.notes.length} notes.` : ""}</span>
            <form method="post" action="/api/trakt/disconnect"><button className="pill" type="submit">Déconnecter Trakt</button></form>
          </>
        ) : (
          <>
            <span className="mute">Trakt retient ta liste « à voir », ce que tu as vu (Stremio s&apos;y synchronise) et tes notes. kawna ne fait que lire.</span>
            {traktConfigured() ? (
              <a className="pill solid" href="/api/trakt/connect" style={{ width: "fit-content" }}>Se connecter à Trakt</a>
            ) : (
              <span className="mute">Pour activer la connexion, ajoute TRAKT_CLIENT_ID et TRAKT_CLIENT_SECRET (voir le README).</span>
            )}
          </>
        )}
      </section>

      <section className="card stack" id="letterboxd">
        <div className="rowhead" style={{ margin: 0 }}><h2>Letterboxd</h2><small>{state.letterboxd ?? "non relié"}</small></div>
        <span className="mute">Note tes films dans Letterboxd comme d&apos;habitude : kawna lit ton journal (vus, étoiles) pour mieux choisir. À la fin d&apos;un film, un bouton t&apos;y emmène.</span>
        <form method="post" action="/api/letterboxd" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="field" name="user" defaultValue={state.letterboxd ?? ""} placeholder="ton pseudo" aria-label="Pseudo Letterboxd" style={{ width: 160 }} />
          <button className="pill" type="submit">{state.letterboxd ? "Mettre à jour" : "Relier"}</button>
        </form>
      </section>

      <section className="card stack" id="garde">
        <div className="rowhead" style={{ margin: 0 }}><h2>Garde iPhone</h2><small>{state.garde ? "active" : "inactive"}</small></div>
        <span className="mute">
          Quand elle est active, kawna ouvre Netflix, Canal+, Stremio… via le raccourci « {SHORTCUT} », qui lance aussi une minuterie de la durée du film ou de l&apos;épisode : à la fin, la lecture s&apos;arrête. Si tu ouvres l&apos;appli sans passer par kawna, tu es renvoyé à l&apos;accueil ; quand tu la quittes, tu reviens sur kawna. Réglages : voir le README.
        </span>
        <form method="post" action="/api/garde">
          <input type="hidden" name="on" value={state.garde ? "0" : "1"} />
          <button className={state.garde ? "pill" : "pill solid"} type="submit">{state.garde ? "Désactiver la garde" : "Activer la garde"}</button>
        </form>
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
      <p className="mute" style={{ fontSize: 11 }}>Fiches et affiches : TMDB (ce produit utilise l&apos;API TMDB sans être approuvé ni certifié par TMDB). Disponibilités : JustWatch. Liens vers les applis : Wikidata.</p>
    </main>
  );
}
