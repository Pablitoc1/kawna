# kawna

Un seul endroit calme pour tout ce que je regarde, lis et écoute. kawna lit mes sources (YouTube, actu, podcasts, films et séries, musique), choisit ce qui sert mes objectifs, l'ouvre sans rien autour, et s'arrête.

- **Trois univers en accès direct** : Actu, Divertir, Apprendre. L'onglet Moi montre la semaine et la boussole.
- **Une édition qui se termine** : composée deux fois par jour, avec un nombre fixe de contenus et une fin.
- **Plusieurs angles par sujet d'actu** : 2 ou 3 journaux de lignes différentes, avec ce sur quoi ils s'accordent et divergent.
- **Le contenu seul** : les vidéos se lisent dans kawna (youtube-nocookie, sans lecture automatique), les films s'ouvrent directement sur leur fiche Stremio.
- **Régulation** : budget vidéo du jour, plus de vidéo après 23 h, « Ça valait le coup ? » après chaque vidéo. C'est ce retour, pas le temps passé, qui guide les choix suivants.

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # remplis au moins ANTHROPIC_API_KEY si tu veux le tri par Claude
npm run dev
```

Puis ouvre http://localhost:3000 et l'onglet **Moi** → « Recomposer l'édition du jour ».

Sans clé Anthropic, kawna trie avec des règles simples (récence, filtre anti-racolage, sources bien notées). Sans Upstash, les données sont dans `.data/kawna.json`.

## Mes sources

Tout est dans `config/` :

- `config/boussole.json` : objectifs en texte libre, budgets, heure du mode soir, limites par univers.
- `config/sources.json` : chaînes YouTube, flux d'actu (avec leur ligne éditoriale de -1 à 1), podcasts, liste « à voir » (identifiants IMDb pour Stremio), liens Apple Music.

Importer ses abonnements YouTube depuis Google Takeout (YouTube → abonnements → `abonnements.csv`) :

```bash
npm run import:youtube -- ~/Downloads/abonnements.csv apprendre
```

Les chaînes arrivent dans l'univers choisi ; range-les ensuite entre `apprendre` et `divertir`.

## Mettre en ligne (gratuit)

1. Importer le dépôt sur [Vercel](https://vercel.com/new).
2. Dans Vercel → Storage, ajouter **Upstash Redis** (offre gratuite) : les variables `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` sont ajoutées toutes seules.
3. Ajouter les variables `KAWNA_PASSWORD`, `ANTHROPIC_API_KEY`, `CRON_SECRET` (et si tu veux `YOUTUBE_API_KEY`, `TMDB_API_KEY`).
4. Le fichier `vercel.json` compose l'édition à 6 h et 17 h (heure de Paris en hiver).
5. Sur iPhone : ouvrir le site dans Safari → Partager → « Sur l'écran d'accueil ».

Coûts : 0 € en plus des abonnements, sauf l'API Claude (facturée à part, quelques euros par mois selon le volume de sources).

## Blocage

kawna doit rester la seule porte d'entrée. Avec NextDNS, bloquer `youtube.com` mais autoriser `youtube-nocookie.com`, `googlevideo.com` et `ytimg.com` pour que le lecteur de kawna fonctionne. Le plan complet par appareil est dans la proposition du projet.

## Développement

```bash
npm test          # tests (vitest)
npm run typecheck
npm run build
```
