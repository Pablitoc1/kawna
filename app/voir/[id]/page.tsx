import { notFound } from "next/navigation";
import { Player } from "@/components/Player";
import { Badge, Ring, minutes } from "@/components/visuals";
import { boussole, isNight } from "@/lib/config";
import { today, videoLeft } from "@/lib/edition";
import { load } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Voir({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await load();
  const item = state.items[id];
  if (!item?.youtubeId) notFound();
  const back = item.universe === "apprendre" ? "/apprendre" : "/divertir";
  const left = videoLeft(state);
  const d = today(state);

  if (isNight()) {
    return (
      <main className="page">
        <div className="night"><span aria-hidden="true">☾</span>Plus de vidéo jusqu&apos;à 7 h. Cette vidéo t&apos;attendra demain.</div>
      </main>
    );
  }

  return (
    <main className="page">
      <Player id={item.id} youtubeId={item.youtubeId} duration={item.durationMin} left={left} back={back} />
      <div style={{ display: "grid", gap: 6 }}>
        <span className="src"><Badge name={item.source} />{item.source}{item.durationMin ? ` · ${minutes(item.durationMin)}` : ""}</span>
        <h1 className="u" style={{ fontSize: 22, lineHeight: 1.15 }}>{item.title}</h1>
      </div>
      <div className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Ring value={d.videoMin} max={boussole.budgets.videoMinParJour + d.extraMin} label={`${left}′`} />
        <div><b>{left} min de vidéo restantes</b><br /><span className="mute">aujourd&apos;hui</span></div>
      </div>
      <div className="empty">Pas de suggestions. Pas de commentaires.</div>
    </main>
  );
}
