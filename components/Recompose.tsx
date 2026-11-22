"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function Recompose() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
        className="pill"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg("");
          try {
            const res = await fetch("/api/refresh", { method: "POST" });
            const data = (await res.json()) as { fetched?: number; errors?: string[]; curatedBy?: string };
            setMsg(`${data.fetched ?? 0} contenus lus${data.errors?.length ? `, ${data.errors.length} sources injoignables` : ""}. Tri : ${data.curatedBy === "claude" ? "Claude" : "règles simples"}.`);
            router.refresh();
          } catch {
            setMsg("Impossible de recomposer l'édition pour l'instant.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Composition en cours…" : "Recomposer l'édition du jour"}
      </button>
      {msg ? <span className="mute">{msg}</span> : null}
    </div>
  );
}
