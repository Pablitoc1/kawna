"use client";

/** Ouvre un titre dans son appli et note le début de la séance, pour te ramener à kawna à la fin. */
export function OpenLink({ href, seance, className, children, title }: { href: string; seance: { key: string; titre: string; minutes: number }; className?: string; children: React.ReactNode; title?: string }) {
  const external = !href.startsWith("stremio:") && !href.startsWith("shortcuts:");
  return (
    <a
      href={href}
      className={className}
      title={title}
      target={external ? "_blank" : undefined}
      rel="noreferrer"
      onClick={() => navigator.sendBeacon?.("/api/seance", new Blob([JSON.stringify(seance)], { type: "application/json" }))}
    >
      {children}
    </a>
  );
}
