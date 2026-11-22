import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authUrl, SCOPE, syncYouTube } from "@/lib/google";
import type { Boussole, State } from "@/lib/types";

const b = { objectifs: "Apprendre le design" } as Boussole;

function mockGoogle() {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    calls.push(url);
    const json = (x: unknown) => new Response(JSON.stringify(x), { status: 200 });
    if (url.startsWith("https://oauth2.googleapis.com/token")) return json({ access_token: "at", expires_in: 3600 });
    if (url.includes("/subscriptions") && !url.includes("pageToken"))
      return json({ items: [{ snippet: { title: "Atelier Forme", resourceId: { channelId: "UC1" } } }], nextPageToken: "p2" });
    if (url.includes("/subscriptions"))
      return json({ items: [{ snippet: { title: "Lentement", resourceId: { channelId: "UC2" } } }] });
    if (url.includes("myRating=like")) return json({ items: [{ snippet: { title: "Grilles", channelTitle: "Atelier Forme" } }] });
    if (url.includes("/playlists")) return json({ items: [{ snippet: { title: "Design" } }] });
    return new Response("{}", { status: 404 });
  });
  return calls;
}

describe("connexion Google", () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    delete process.env.ANTHROPIC_API_KEY;
  });
  afterEach(() => vi.unstubAllGlobals());

  it("demande un accès YouTube en lecture seule, hors ligne", () => {
    const u = new URL(authUrl("https://kawna.vercel.app/moi", "abc"));
    expect(u.searchParams.get("scope")).toBe(SCOPE);
    expect(SCOPE).toMatch(/youtube\.readonly$/);
    expect(u.searchParams.get("access_type")).toBe("offline");
    expect(u.searchParams.get("redirect_uri")).toBe("https://kawna.vercel.app/api/google/callback");
    expect(u.searchParams.get("state")).toBe("abc");
  });

  it("lit toutes les pages d'abonnements et garde les univers déjà choisis", async () => {
    const calls = mockGoogle();
    const s: State = {
      items: {}, editions: {}, days: {}, feedback: {},
      google: { refreshToken: "rt", connectedAt: "2026-11-22" },
      youtube: { channels: [{ id: "UC1", nom: "Atelier Forme", univers: "apprendre" }], likes: [], playlists: [], syncedAt: "2000-01-01T00:00:00Z" },
    };
    await syncYouTube(s, b);
    expect(s.youtube!.channels).toEqual([
      { id: "UC1", nom: "Atelier Forme", univers: "apprendre" },
      { id: "UC2", nom: "Lentement", univers: "divertir" },
    ]);
    expect(s.youtube!.likes).toEqual(["Atelier Forme | Grilles"]);
    expect(s.youtube!.playlists).toEqual(["Design"]);
    expect(calls.filter((c) => c.includes("/subscriptions"))).toHaveLength(2);
  });

  it("ne relit pas le compte avant 12 h", async () => {
    const calls = mockGoogle();
    const s: State = {
      items: {}, editions: {}, days: {}, feedback: {},
      google: { refreshToken: "rt", connectedAt: "x" },
      youtube: { channels: [], likes: [], playlists: [], syncedAt: new Date().toISOString() },
    };
    await syncYouTube(s, b);
    expect(calls).toHaveLength(0);
  });
});
