"use client";

/** Lien vers un article : l'ouvre et compte un temps de lecture estimé dans le budget actu. */
export function TrackedLink({ href, minutes, className, children }: { href: string; minutes: number; className?: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={() => navigator.sendBeacon?.("/api/watch", new Blob([JSON.stringify({ actu: minutes })], { type: "application/json" }))}
    >
      {children}
    </a>
  );
}
