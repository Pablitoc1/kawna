import Link from "next/link";
import { TZ } from "@/lib/config";
import type { State } from "@/lib/types";

/** La séance en cours, avec la sortie toujours à portée. */
export function SeanceBanner({ state }: { state: State }) {
  const se = state.seance;
  if (!se) return null;
  const fin = new Date(Date.parse(se.startedAt) + se.minutes * 60_000);
  const heure = fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return (
    <Link href="/fin" className="seance">
      <span><small>En cours</small><b>{se.titre}</b><small>fin vers {heure}</small></span>
      <span className="pill solid">J&apos;ai fini · j&apos;arrête</span>
    </Link>
  );
}
