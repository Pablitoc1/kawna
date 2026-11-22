import { SERVICES } from "./services";

/**
 * Liens directs vers la fiche d'un titre dans l'appli d'un service (Netflix, Apple TV+, Disney+…).
 * Wikidata relie l'identifiant IMDb d'une œuvre à ses identifiants dans chaque service ;
 * on reconstruit l'URL à partir du format d'URL de chaque propriété. Gratuit, sans clé.
 */
export async function directLinks(imdbIds: string[]): Promise<Record<string, Record<string, string>>> {
  const ids = [...new Set(imdbIds.filter((i) => /^tt\d+$/.test(i)))].slice(0, 40);
  if (!ids.length) return {};
  const domains = SERVICES.flatMap((s) => s.domaines);
  const query = `SELECT ?imdb ?fmt ?v WHERE {
  VALUES ?imdb { ${ids.map((i) => `"${i}"`).join(" ")} }
  ?item wdt:P345 ?imdb .
  ?prop wikibase:propertyType wikibase:ExternalId ; wikibase:directClaim ?p ; wdt:P1630 ?fmt .
  FILTER(${domains.map((d) => `CONTAINS(STR(?fmt), "${d}")`).join(" || ")})
  ?item ?p ?v .
}`;
  const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, {
    headers: { accept: "application/sparql-results+json", "user-agent": "kawna/0.1 (lecteur personnel)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Wikidata ${res.status}`);
  const data = (await res.json()) as { results: { bindings: { imdb: { value: string }; fmt: { value: string }; v: { value: string } }[] } };
  const out: Record<string, Record<string, string>> = {};
  for (const b of data.results.bindings) {
    const url = b.fmt.value.replace("$1", encodeURIComponent(b.v.value));
    const host = new URL(url).hostname;
    const s = SERVICES.find((x) => x.domaines.some((d) => host === d || host.endsWith(`.${d}`)));
    if (!s) continue;
    (out[b.imdb.value] ??= {})[s.key] ??= url;
  }
  return out;
}
