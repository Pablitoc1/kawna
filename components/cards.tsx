import Link from "next/link";
import type { Item, Pick } from "@/lib/types";
import { Badge, Cover, minutes } from "./visuals";

export function VideoCard({ item, why, full, locked }: { item: Item; why?: string; full?: boolean; locked?: boolean }) {
  const inner = (
    <>
      <div className="img">
        <Cover src={item.image} seed={item.title} />
        {item.durationMin ? <span className="dur">{minutes(item.durationMin)}</span> : null}
      </div>
      <span className="t">{item.title}</span>
      <span className="src"><Badge name={item.source} />{item.source}</span>
      {why ? <span className="why">{why}</span> : null}
    </>
  );
  const cls = full ? "thumb full" : "thumb";
  if (locked) return <div className={cls} style={{ opacity: 0.45 }}>{inner}</div>;
  if (item.youtubeId) return <Link href={`/voir/${item.id}`} className={cls}>{inner}</Link>;
  return <a href={item.url} target="_blank" rel="noreferrer" className={cls}>{inner}</a>;
}

export function Picks({ picks, items, locked }: { picks: Pick[]; items: Record<string, Item>; locked?: boolean }) {
  const list = picks.flatMap((p) => (items[p.id] ? [{ item: items[p.id], why: p.why }] : []));
  if (!list.length) return null;
  const [first, ...rest] = list;
  return (
    <div className="stack">
      <VideoCard item={first.item} why={first.why} full locked={locked} />
      {rest.length ? (
        <div className="rail">{rest.map((x) => <VideoCard key={x.item.id} item={x.item} why={x.why} locked={locked} />)}</div>
      ) : null}
    </div>
  );
}

export function Discarded({ count, reasons }: { count: number; reasons: string[] }) {
  if (!count) return null;
  return (
    <details className="discard">
      <summary style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", listStyle: "none" }}>
        <span className="x">{count}</span>écartés aujourd&apos;hui · voir pourquoi
      </summary>
      <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
        {reasons.length ? reasons.map((r) => <li key={r}>{r}</li>) : <li>Hors de tes objectifs, doublons ou déjà vus.</li>}
      </ul>
    </details>
  );
}

export function End({ children }: { children: React.ReactNode }) {
  return <div className="endmark"><i>✓</i>{children}</div>;
}
