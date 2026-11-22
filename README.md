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

### Films et séries : tes abonnements

Netflix, Canal+, Apple TV+, Disney+, Prime Video… n'ont pas d'API publique. kawna s'en passe :

- **Ce que propose chaque service** : TMDB, avec ses données « où regarder » fournies par JustWatch. Dans **Moi**, coche tes abonnements : kawna lit le catalogue des mieux notés et des sorties récentes bien notées, sans jamais trier par popularité.
- **Ce que tu as vu, ta liste, tes notes** : [Trakt](https://trakt.tv) (Stremio s'y synchronise). Sans Trakt, ta liste vient de `aVoir` dans `config/sources.json`.
- **Le choix** : Claude propose un titre pour ce soir et quelques découvertes (limite `films` dans la boussole). Il tient compte de tes notes et ne repropose pas un titre dans la semaine.
- **L'ouverture** : un bouton ouvre la fiche du titre directement dans l'appli du service. Le lien vient de Wikidata. À défaut, kawna ouvre une recherche dans l'appli, ou Stremio.
- **VPN** : dans Moi, indique ton VPN et ses pays (ex. `US, GB`). kawna regarde aussi ces catalogues et, pour un titre absent en France, affiche « Dans NordVPN, connecte-toi : États-Unis » avant le bouton. Aucune appli VPN ne laisse un site choisir le pays : cette étape reste manuelle. Note : la plupart des services interdisent ce contournement dans leurs conditions.

Réglages (gratuits) :

1. **TMDB** : crée un compte sur themoviedb.org → Paramètres → API → demande une clé (usage personnel). Mets-la dans `TMDB_API_KEY` (la clé v3 ou le jeton de lecture v4).
2. **Trakt** : sur trakt.tv → Settings → Your API Apps → New Application. Redirect URI : `https://TON-SITE.vercel.app/api/trakt/callback`. Copie le Client ID et le Client Secret dans `TRAKT_CLIENT_ID` et `TRAKT_CLIENT_SECRET`. Dans Stremio, connecte Trakt (Réglages → Trakt) pour que ce que tu regardes y remonte.

### Garde iPhone : n'ouvrir les applis qu'en passant par kawna

iOS ne laisse aucune appli bloquer une autre appli à l'ouverture. La seule voie est une automatisation Raccourcis que tu crées toi-même (iOS 26). Le principe : kawna ouvre les applis via un raccourci qui laisse un laissez-passer d'une minute ; si tu ouvres Netflix sans ce laissez-passer, l'automatisation te renvoie à l'écran d'accueil.

1. Raccourci **« kawna »** (le nom compte) :
   - « Texte » contenant **Date actuelle** (format ISO 8601) ;
   - « Enregistrer le fichier » : enregistre ce texte dans `Raccourcis/kawna-pass.txt`, « Demander où enregistrer » désactivé, « Remplacer si le fichier existe » activé ;
   - « Ouvrir les URL » : **Entrée du raccourci**.
2. Pour chaque appli (Netflix, Canal+, Apple TV, Prime Video, Disney+, Stremio…) : Raccourcis → Automatisation → **+** → **Appli** → choisis l'appli → « Est ouverte » → **Exécuter immédiatement** → nouveau raccourci :
   - « Obtenir le fichier » `Raccourcis/kawna-pass.txt` (« Erreur si introuvable » désactivé) ;
   - « Obtenir les dates à partir de » ce fichier ;
   - « Obtenir le temps entre » ces **Dates** et **Date actuelle**, en secondes ;
   - « Si » le résultat est **supérieur à 60** : « Aller à l'écran d'accueil » puis « Afficher une notification » « Passe par kawna ». Fin.
3. Dans kawna → Moi → **Activer la garde**. Sur iPhone, tous les boutons « Ouvrir dans… » passent alors par le raccourci.

À ne pas faire : **masquer** les applis. iOS fait alors comme si elles n'étaient pas installées, et les liens de kawna ne les ouvrent plus. « Exiger Face ID » sans masquer ne gêne pas les liens. Une limite de temps d'écran sur une appli s'applique aussi quand kawna l'ouvre : réserve-la à la nuit.

## Mettre en ligne (gratuit)

1. Importer le dépôt sur [Vercel](https://vercel.com/new).
2. Dans Vercel → Storage, ajouter **Upstash Redis** (offre gratuite) : les variables `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` sont ajoutées toutes seules.
3. Ajouter les variables `KAWNA_PASSWORD`, `ANTHROPIC_API_KEY`, `CRON_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (et si tu veux `TMDB_API_KEY`).
4. Le fichier `vercel.json` compose l'édition à 6 h et 17 h (heure de Paris en hiver).
5. Sur iPhone : ouvrir le site dans Safari → Partager → « Sur l'écran d'accueil ».

Coûts : 0 € en plus des abonnements, sauf l'API Claude (facturée à part, quelques euros par mois selon le volume de sources).

## Blocage

kawna doit rester la seule porte d'entrée. Les règles qui comptent :

- **Ne bloque pas les domaines des services que tu regardes** (netflix.com, canalplus.com…) au niveau DNS : leurs applis utilisent ces mêmes domaines et cesseraient de fonctionner. Bloque plutôt leurs **sites** dans Temps d'écran (Contenu web → Ne jamais autoriser), qui ne touche qu'au navigateur, et garde les applis derrière la garde iPhone.
- **Ne masque pas les applis** : les liens de kawna ne les ouvriraient plus.
- **VPN** : quand NordVPN est actif, il remplace ton DNS, donc NextDNS ne filtre plus rien. Temps d'écran, lui, fonctionne sur l'appareil et reste actif. Sur iPhone et Mac, appuie-toi sur Temps d'écran ; NextDNS sert au routeur (Apple TV) et au PC.
- Pour le lecteur YouTube de kawna, `youtube-nocookie.com`, `googlevideo.com` et `ytimg.com` doivent rester autorisés.

Le plan complet par appareil est dans le document du projet.

## Développement

```bash
npm test          # tests (vitest)
npm run typecheck
npm run build
```
