import { boussole } from "@/lib/config";
import { today, videoLeft } from "@/lib/edition";
import type { State } from "@/lib/types";
import { Ring } from "./visuals";

export function Header({ title, color, state }: { title?: string; color?: string; state: State }) {
  const d = today(state);
  const left = videoLeft(state);
  return (
    <div className="topline">
      {title ? <h1 className="u" style={{ color }}>{title}</h1> : <div className="logo"><i />kawna</div>}
      <Ring value={d.videoMin} max={boussole.budgets.videoMinParJour + d.extraMin} label={`${left}′`} />
    </div>
  );
}
