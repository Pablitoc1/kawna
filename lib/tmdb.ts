/** Affiche d'un film ou d'une série à partir de son identifiant IMDb (clé TMDB optionnelle). */
export async function poster(imdb: string): Promise<string | undefined> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return undefined;
  try {
    const res = await fetch(`https://api.themoviedb.org/3/find/${imdb}?external_source=imdb_id&api_key=${key}`, {
      next: { revalidate: 7 * 86_400 },
    });
    const data = (await res.json()) as { movie_results?: { poster_path?: string }[]; tv_results?: { poster_path?: string }[] };
    const path = data.movie_results?.[0]?.poster_path ?? data.tv_results?.[0]?.poster_path;
    return path ? `https://image.tmdb.org/t/p/w342${path}` : undefined;
  } catch {
    return undefined;
  }
}

export const stremioLink = (type: "movie" | "series", imdb: string) => `stremio:///detail/${type}/${imdb}`;
