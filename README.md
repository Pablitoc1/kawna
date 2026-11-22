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

### Compte YouTube

Dans l'onglet **Moi**, « Se connecter avec Google » donne à kawna un accès en lecture seule à ton compte YouTube. kawna lit tes abonnements (dont il suit les nouvelles vidéos), tes vidéos aimées et tes playlists (pour connaître tes goûts). Claude range chaque chaîne dans Apprendre ou Divertir. Le compte est relu toutes les 12 h.

Réglage unique dans [Google Cloud](https://console.cloud.google.com) :

1. Créer un projet « kawna ».
2. « API et services » → Bibliothèque → activer **YouTube Data API v3**.
3. « Google Auth Platform » → Branding : nom « kawna », ton e-mail. Audience : « Externe », puis **Publier l'application** (en mode test, Google déconnecte kawna tous les 7 jours). Google affichera « application non validée » à la connexion : c'est normal pour une appli personnelle, clique sur « Paramètres avancés » puis « Accéder à kawna ».
4. Clients → Créer un client → « Application Web ». URI de redirection autorisée : `https://TON-SITE.vercel.app/api/google/callback` (et `http://localhost:3000/api/google/callback` pour le local).
5. Copier l'ID client et le secret dans `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`.

Sans compte connecté, on peut aussi lister des chaînes à la main dans `config/sources.json`, ou les importer depuis Google Takeout : `npm run import:youtube -- abonnements.csv apprendre`.

## Mettre en ligne (gratuit)

1. Importer le dépôt sur [Vercel](https://vercel.com/new).
2. Dans Vercel → Storage, ajouter **Upstash Redis** (offre gratuite) : les variables `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` sont ajoutées toutes seules.
3. Ajouter les variables `KAWNA_PASSWORD`, `ANTHROPIC_API_KEY`, `CRON_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (et si tu veux `TMDB_API_KEY`).
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
