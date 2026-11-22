"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const Face = ({ mood }: { mood: "oui" | "bof" | "non" }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d={mood === "oui" ? "M8 14c1 1.5 2.4 2.2 4 2.2s3-.7 4-2.2M9 10h.01M15 10h.01" : mood === "bof" ? "M8 15h8M9 10h.01M15 10h.01" : "M8 16c1-1.5 2.4-2.2 4-2.2s3 .7 4 2.2M9 10h.01M15 10h.01"} />
  </svg>
);

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true });

/**
 * Lecteur sans rien autour : la vidéo seule, via youtube-nocookie, sans lecture automatique.
 * Le temps passé sur la page (onglet visible) est compté dans le budget vidéo.
 */
export function Player({ id, youtubeId, duration, left, back }: { id: string; youtubeId: string; duration?: number; left: number; back: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"watch" | "feedback" | "stop">("watch");
  const seconds = useRef(0);
  const sent = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") seconds.current += 1;
    }, 1000);
    const flush = () => {
      if (sent.current || seconds.current < 30) return;
      sent.current = true;
      const mins = Math.round(seconds.current / 60);
      navigator.sendBeacon?.("/api/watch", new Blob([JSON.stringify({ video: duration ? Math.min(mins, duration) : mins })], { type: "application/json" }));
    };
    window.addEventListener("pagehide", flush);
    return () => {
      clearInterval(t);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [duration]);

  const finish = async () => {
    if (!sent.current) {
      sent.current = true;
      const mins = Math.max(1, Math.round(seconds.current / 60));
      await post("/api/watch", { video: duration ? Math.min(mins, duration) : mins });
    }
    setStep("feedback");
  };

  const rate = async (verdict: "oui" | "bof" | "non") => {
    await post("/api/feedback", { id, verdict });
    const used = Math.round(seconds.current / 60);
    if (used >= left) setStep("stop");
    else router.push(back);
  };

  return (
    <>
      <div className="player">
        <div className="frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`}
            title="Lecteur vidéo"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
      <div className="btnrow" style={{ justifyContent: "flex-start" }}>
        <button className="pill solid" onClick={finish}>J&apos;ai fini</button>
        <button className="pill" onClick={() => router.push(back)}>Retour</button>
      </div>

      {step !== "watch" ? (
        <div className="sheet-bg" role="dialog" aria-modal="true">
          {step === "feedback" ? (
            <div className="sheet">
              <h3>Ça valait le coup ?</h3>
              <div className="faces">
                <button onClick={() => rate("oui")} aria-label="Oui"><Face mood="oui" />Oui</button>
                <button onClick={() => rate("bof")} aria-label="Bof"><Face mood="bof" />Bof</button>
                <button onClick={() => rate("non")} aria-label="Non"><Face mood="non" />Non</button>
              </div>
            </div>
          ) : (
            <div className="sheet">
              <h3>Budget vidéo atteint</h3>
              <p className="mute" style={{ margin: 0 }}>Tu as vu ce que tu avais prévu aujourd&apos;hui.</p>
              <div className="btnrow">
                <button className="pill solid" onClick={() => router.push("/")}>M&apos;arrêter là</button>
                <button className="pill" onClick={async () => { await post("/api/watch", { extra: 10 }); router.push(back); }}>+10 min</button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
