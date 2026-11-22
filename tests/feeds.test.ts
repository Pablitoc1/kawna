import { describe, expect, it } from "vitest";
import { parseDuration, parseFeed } from "@/lib/feeds";

const YT = `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
<entry><yt:videoId>abc123</yt:videoId><title>Hiérarchie typo &amp; grilles</title><link rel="alternate" href="https://www.youtube.com/watch?v=abc123"/>
<published>2026-11-20T10:00:00+00:00</published><media:group><media:thumbnail url="https://i.ytimg.com/vi/abc123/hqdefault.jpg" width="480" height="360"/><media:description>Une vidéo sur la typo.</media:description></media:group></entry></feed>`;

const RSS = `<?xml version="1.0"?><rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel><title>Journal</title>
<item><title><![CDATA[La loi est votée]]></title><link>https://exemple.fr/loi</link><pubDate>Fri, 20 Nov 2026 08:00:00 GMT</pubDate><description><![CDATA[<p>Le texte a été <b>adopté</b>.</p>]]></description><enclosure url="https://exemple.fr/img.jpg" type="image/jpeg"/></item>
<item><title>Épisode 12</title><link>https://exemple.fr/ep12</link><pubDate>Fri, 20 Nov 2026 08:00:00 GMT</pubDate><itunes:duration>42:10</itunes:duration></item>
</channel></rss>`;

describe("parseFeed", () => {
  it("lit un flux de chaîne YouTube", () => {
    const [v] = parseFeed(YT, { source: "Atelier", universe: "apprendre", kind: "video" });
    expect(v).toMatchObject({ youtubeId: "abc123", title: "Hiérarchie typo & grilles", kind: "video", universe: "apprendre" });
    expect(v.image).toContain("abc123");
    expect(v.summary).toBe("Une vidéo sur la typo.");
  });

  it("lit un flux RSS d'articles et nettoie le HTML", () => {
    const [a] = parseFeed(RSS, { source: "Journal", universe: "actu", kind: "article", lean: 0.2 });
    expect(a).toMatchObject({ title: "La loi est votée", url: "https://exemple.fr/loi", lean: 0.2, image: "https://exemple.fr/img.jpg" });
    expect(a.summary).toBe("Le texte a été adopté .");
  });

  it("lit la durée d'un épisode de podcast", () => {
    const items = parseFeed(RSS, { source: "Pod", universe: "apprendre", kind: "podcast" });
    expect(items[1].durationMin).toBe(42);
  });
});

describe("parseDuration", () => {
  it.each([["1:02:03", 62], ["42:10", 42], ["90", 2], ["", undefined]])("%s → %s", (v, m) => {
    expect(parseDuration(v)).toBe(m);
  });
});
