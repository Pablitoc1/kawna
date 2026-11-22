import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cineCandidates, syncCine } from "@/lib/cine";
import { filmsWithRules } from "@/lib/curate";
import { guard, seanceMinutes, viaShortcut } from "@/lib/garde";
import { letterboxdFilm, parseLetterboxd } from "@/lib/letterboxd";
import { matchProviders, meilleurPays, ouvrir } from "@/lib/services";
import type { Boussole, Sources, State } from "@/lib/types";

const b = { objectifs: "", limites: { apprendre: 5, divertirVideos: 3, actuSujets: 3, films: 2 } } as Boussole;
const src = { aVoir: [], youtube: [], actu: [], podcasts: [], musique: [] } as unknown as Sources;
const json = (x: unknown) => new Response(JSON.stringify(x), { status: 200 });
const empty = (): State => ({ items: {}, editions: {}, days: {}, feedback: {} });

describe("services", () => {
  it("reconnaît les fournisseurs TMDB par leur nom exact", () => {
    const m = matchProviders([
      { provider_id: 8, provider_name: "Netflix", logo_path: "/n.png" },
      { provider_id: 1796, provider_name: "Netflix basic with Ads" },
      { provider_id: 381, provider_name: "Canal+" },
    ]);
    expect(m.netflix.ids).toEqual([8]);
    expect(m.canalplus.ids).toEqual([381]);
    expect(m.appletv.ids).toEqual([350]); // repli sur l'identifiant connu
  });

  it("ouvre d'abord le lien direct, puis la recherche, puis Stremio ; ignore les services non cochés", () => {
    const t = { titre: "Severance", type: "series" as const, imdb: "tt11280740", dispo: ["appletv", "netflix"], liens: { appletv: "https://tv.apple.com/show/x" } };
    const w = ouvrir(t, ["appletv"]);
    expect(w.map((x) => x.key)).toEqual(["appletv", "stremio"]);
    expect(w[0]).toMatchObject({ url: "https://tv.apple.com/show/x", direct: true });
    expect(ouvrir(t, ["netflix"])[0]).toMatchObject({ key: "netflix", direct: false, url: "https://www.netflix.com/search?q=Severance" });
  });

  it("propose le pays du VPN quand le titre n'est pas inclus ici", () => {
    const t = { titre: "X", type: "movie" as const, dispo: [], ailleurs: { netflix: ["JP", "US", "BR"] } };
    expect(ouvrir(t, ["netflix"])).toEqual([]);
    expect(ouvrir(t, ["netflix"], { pays: ["US"] })[0]).toMatchObject({ key: "netflix", pays: "US" });
    expect(meilleurPays(["BR", "GB"], [])).toBe("GB");
  });
});

describe("garde iPhone", () => {
  it("passe par le raccourci sur iPhone seulement, quand elle est active", () => {
    const url = "https://www.netflix.com/title/80057281";
    const ios = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X)";
    expect(guard(url, { on: true, ua: ios }, 111)).toBe(viaShortcut(url, 111));
    expect(viaShortcut(url, 111)).toBe(`shortcuts://run-shortcut?name=kawna&input=text&text=${encodeURIComponent(`111|${url}`)}`);
    expect(guard(url, { on: false, ua: ios })).toBe(url);
    expect(guard(url, { on: true, ua: "Mozilla/5.0 (Macintosh)" })).toBe(url);
  });
});

describe("catalogue des abonnements", () => {
  beforeEach(() => {
    process.env.TMDB_API_KEY = "k";
    process.env.TRAKT_CLIENT_ID = "c";
    process.env.TRAKT_CLIENT_SECRET = "s";
  });
  afterEach(() => vi.unstubAllGlobals());

  function mock() {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      if (url.includes("/watch/providers/")) return json({ results: [{ provider_id: 8, provider_name: "Netflix" }] });
      if (url.includes("/discover/movie") && url.includes("watch_region=FR"))
        return json({ results: [{ id: 1, title: "Vu déjà", vote_average: 8.5 }, { id: 2, title: "Aftersun", vote_average: 7.7, release_date: "2022-10-21" }] });
      if (url.includes("/discover/movie") && url.includes("watch_region=US")) return json({ results: [{ id: 5, title: "Seulement US", vote_average: 8 }] });
      if (url.includes("/discover/tv")) return json({ results: [{ id: 3, name: "Dark", vote_average: 8.4 }] });
      if (url.includes("/movie/10?")) return json({ id: 10, title: "Past Lives", imdb_id: "tt13238346", runtime: 106, genres: [{ name: "Drame" }], "watch/providers": { results: { FR: { link: "https://tmdb/w", flatrate: [{ provider_id: 8 }] }, US: { flatrate: [{ provider_id: 8 }] } } } });
      if (url.startsWith("https://query.wikidata.org")) return json({ results: { bindings: [{ imdb: { value: "tt13238346" }, fmt: { value: "https://www.netflix.com/title/$1" }, v: { value: "81675520" } }] } });
      if (url.includes("/sync/watchlist/movies")) return json([{ movie: { title: "Past Lives", year: 2023, ids: { tmdb: 10, imdb: "tt13238346" } } }]);
      if (url.includes("/sync/watched/movies")) return json([{ movie: { title: "Vu déjà", ids: { tmdb: 1 } } }]);
      if (url.includes("/sync/ratings/movies")) return json([{ rating: 9, movie: { title: "Aftersun", year: 2022, ids: { tmdb: 2 } } }]);
      if (url.includes("/sync/")) return json([]);
      if (url.startsWith("https://letterboxd.com/"))
        return new Response(`<rss><channel><item><letterboxd:filmTitle>Aftersun</letterboxd:filmTitle><letterboxd:filmYear>2022</letterboxd:filmYear><letterboxd:memberRating>4</letterboxd:memberRating><tmdb:movieId>2</tmdb:movieId></item></channel></rss>`, { status: 200 });
      return new Response("{}", { status: 404 });
    });
    return calls;
  }

  it("lit Trakt, écarte ce qui est vu, complète la liste et trouve le lien direct", async () => {
    const calls = mock();
    const s: State = { ...empty(), services: ["netflix"], vpn: { nom: "NordVPN", pays: ["US"] }, trakt: { accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3_600_000, connectedAt: "" } };
    await syncCine(s, src, true);
    const c = s.cine!;
    expect(c.watchlist).toEqual(["movie:10"]);
    expect(c.catalogue).toEqual(expect.arrayContaining(["movie:2", "series:3", "movie:5"]));
    expect(c.catalogue).not.toContain("movie:1");
    expect(c.notes[0]).toBe("9/10 | Aftersun (2022)");
    const pl = c.titles["movie:10"];
    expect(pl).toMatchObject({ imdb: "tt13238346", duree: 106, dispo: ["netflix"], liens: { netflix: "https://www.netflix.com/title/81675520" } });
    expect(calls.some((u) => u.includes("with_watch_providers=8"))).toBe(true);
    expect(calls.some((u) => u.includes("sort_by=vote_average.desc"))).toBe(true);

    const e = filmsWithRules(s, b, "2026-11-22");
    expect(e.tonight?.key).toBe("movie:10");
    expect(e.decouvrir).toHaveLength(2);
    expect(e.decouvrir!.map((d) => d.id)).not.toContain("movie:10");
  });

  it("ce que tu as vu sur Letterboxd n'est plus proposé, et tes étoiles deviennent des notes", async () => {
    mock();
    const s: State = { ...empty(), services: ["netflix"], letterboxd: "yahia" };
    await syncCine(s, src, true);
    expect(s.cine!.catalogue).not.toContain("movie:2");
    expect(s.cine!.notes[0]).toBe("8/10 | Aftersun (2022) (Letterboxd)");
  });

  it("ne repropose pas cette semaine un titre déjà proposé", async () => {
    mock();
    const s: State = { ...empty(), services: ["netflix"] };
    await syncCine(s, src, true);
    s.editions["2026-11-21"] = { date: "2026-11-21", decouvrir: [{ id: "movie:2", why: "" }] } as State["editions"][string];
    expect(cineCandidates(s, "2026-11-22").catalogue.map((t) => t.key)).not.toContain("movie:2");
  });
});

describe("séance et Letterboxd", () => {
  it("cale la minuterie sur le film ou l'épisode", () => {
    expect(seanceMinutes({ type: "movie", duree: 106 })).toBe(111);
    expect(seanceMinutes({ type: "series" })).toBe(50);
  });

  it("lit le journal Letterboxd : film, étoiles, date, identifiant TMDB ; ignore les listes", () => {
    const xml = `<rss xmlns:letterboxd="https://letterboxd.com" xmlns:tmdb="https://themoviedb.org"><channel>
      <item><title>Aftersun, 2022 - ★★★★½</title><letterboxd:watchedDate>2026-11-20</letterboxd:watchedDate><letterboxd:rewatch>No</letterboxd:rewatch>
        <letterboxd:filmTitle>Aftersun</letterboxd:filmTitle><letterboxd:filmYear>2022</letterboxd:filmYear><letterboxd:memberRating>4.5</letterboxd:memberRating><tmdb:movieId>965150</tmdb:movieId></item>
      <item><title>Une liste</title></item>
    </channel></rss>`;
    expect(parseLetterboxd(xml)).toEqual([{ key: "movie:965150", titre: "Aftersun", annee: "2022", note: 4.5, vuLe: "2026-11-20" }]);
    expect(letterboxdFilm(965150)).toBe("https://letterboxd.com/tmdb/965150/");
  });
});
