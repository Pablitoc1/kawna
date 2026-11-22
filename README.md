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
- **Ce que tu as vu, ta liste, tes notes** : [Trakt](https://trakt.tv) (Stremio s'y synchronise) et Letterboxd. Sans Trakt, ta liste vient de `aVoir` dans `config/sources.json`.
- **Le choix** : Claude propose un titre pour ce soir et quelques découvertes (limite `films` dans la boussole). Il tient compte de tes notes et ne repropose pas un titre dans la semaine.
- **L'ouverture** : un bouton ouvre la fiche du titre directement dans l'appli du service. Le lien vient de Wikidata. À défaut, kawna ouvre une recherche dans l'appli, ou Stremio.
- **VPN** : dans Moi, indique ton VPN et ses pays (ex. `US, GB`). kawna regarde aussi ces catalogues et, pour un titre absent en France, affiche « Dans NordVPN, connecte-toi : États-Unis » avant le bouton. Aucune appli VPN ne laisse un site choisir le pays : cette étape reste manuelle. Note : la plupart des services interdisent ce contournement dans leurs conditions.

Réglages (gratuits) :

1. **TMDB** : crée un compte sur themoviedb.org → Paramètres → API → demande une clé (usage personnel). Mets-la dans `TMDB_API_KEY` (la clé v3 ou le jeton de lecture v4).
2. **Trakt** : sur trakt.tv → Settings → Your API Apps → New Application. Redirect URI : `https://TON-SITE.vercel.app/api/trakt/callback`. Copie le Client ID et le Client Secret dans `TRAKT_CLIENT_ID` et `TRAKT_CLIENT_SECRET`. Dans Stremio, connecte Trakt (Réglages → Trakt) pour que ce que tu regardes y remonte.

### Garde iPhone : entrer et sortir par kawna

iOS ne laisse aucune appli bloquer ou fermer une autre appli. Ce qui s'en approche le plus, sans appli native, ce sont des automatisations Raccourcis que tu crées toi-même (iOS 26) :

- **Entrée** : kawna ouvre les applis via le raccourci « kawna », qui laisse un laissez-passer d'une minute. Ouvrir Netflix sans ce laissez-passer te renvoie à l'écran d'accueil.
- **Fin** : le même raccourci lance une minuterie de la durée du film ou de l'épisode, réglée sur « Arrêter la lecture ».
- **Sortie** : quitter l'appli rouvre kawna sur la page de fin (« Ça valait le coup ? », puis rien d'autre).

1. Une fois, dans l'appli Horloge → Minuteur → « Fin du minuteur » : choisis **Arrêter la lecture**. Les minuteries lancées par Raccourcis reprennent ce réglage (à vérifier sur ton iPhone).
2. Raccourci **« kawna »** (le nom compte). Il reçoit du texte « minutes|adresse » :
   - « Diviser » l'**Entrée du raccourci** par le séparateur personnalisé `|` ;
   - « Texte » contenant **Date actuelle** (format ISO 8601), puis « Enregistrer le fichier » dans `Raccourcis/kawna-pass.txt` (« Demander où enregistrer » désactivé, « Remplacer » activé) ;
   - « Lancer le minuteur » : **Premier élément** du texte divisé, en minutes ;
   - « Ouvrir les URL » : **Dernier élément** du texte divisé.
3. Pour chaque appli (Netflix, Canal+, Apple TV, Prime Video, Disney+, Stremio…), Raccourcis → Automatisation → **+** → **Appli** → choisis-la → coche **Est ouverte** → **Exécuter immédiatement** :
   - « Obtenir le fichier » `Raccourcis/kawna-pass.txt` (« Erreur si introuvable » désactivé), « Obtenir les dates à partir de » ce fichier, « Obtenir le temps entre » ces dates et **Date actuelle**, en secondes ;
   - « Si » le résultat est **supérieur à 60** : « Aller à l'écran d'accueil » et « Afficher une notification » « Passe par kawna ».
4. Même chose avec **Est fermée** → **Exécuter immédiatement** → « Ouvrir les URL » `https://TON-SITE.vercel.app/fin`. Connecte-toi une fois à kawna dans Safari, car c'est Safari qui ouvre ce lien.
5. Dans kawna → Moi → **Activer la garde**.

Limites, à dire franchement :
- Rien de tout ça ne **ferme** l'appli à la fin : la lecture s'arrête, mais tu peux relancer un épisode.
- Les automatisations ne sont pas protégées par le code Temps d'écran : c'est de la friction, pas un verrou.
- Sur iOS 26.6, « Est fermée » se déclenche aussi en ouvrant le Centre de contrôle (bug signalé à Apple).
- Le seul verrou réel serait une appli kawna native qui utilise l'API Temps d'écran : applis bloquées par défaut, débloquées par kawna pour la durée de la séance, puis rebloquées. Il faut un compte développeur Apple (99 € par an) et l'accord d'Apple pour l'autorisation « Family Controls ».

À ne pas faire : **masquer** les applis. iOS fait alors comme si elles n'étaient pas installées, et les liens de kawna ne les ouvrent plus. « Exiger Face ID » sans masquer ne gêne pas les liens.

### Letterboxd

Letterboxd n'a pas d'API publique (accès sur demande). kawna lit ton journal via le flux RSS public de ton profil : les 50 derniers films, tes étoiles et l'identifiant TMDB. Dans Moi → Letterboxd, indique ton pseudo. Les films vus ne sont plus proposés, et tes notes guident Claude. À la fin d'un film, « Noter sur Letterboxd » ouvre sa fiche. kawna ne peut pas écrire dans Letterboxd.

## Tester sur ton iPhone sans héberger

Le Mac sert de serveur, l'iPhone s'y connecte par le Wi-Fi. Rien n'est en ligne.

1. Sur le Mac : `git clone https://github.com/Pablitoc1/kawna && cd kawna && git checkout abonnements && npm install`.
2. `cp .env.example .env.local`, puis remplis ce que tu veux tester : `TMDB_API_KEY` (films et séries), `ANTHROPIC_API_KEY` (le choix par Claude ; sans clé, des règles simples), `GOOGLE_*`, `TRAKT_*`. Laisse `KAWNA_PASSWORD` vide en local.
3. `npm run iphone` : l'adresse à ouvrir sur l'iPhone s'affiche (ex. `http://192.168.1.23:3000`). Si le Mac demande d'autoriser les connexions entrantes pour « node », accepte.
4. Connecte YouTube et Trakt **depuis le Mac**, sur `http://localhost:3000` : Google n'accepte pas d'adresse comme 192.168… comme retour de connexion. Dans Google Cloud et Trakt, ajoute `http://localhost:3000/api/google/callback` et `http://localhost:3000/api/trakt/callback`. Ensuite l'iPhone voit tout.

Ce qui change par rapport à la version en ligne :
- Pas de cron : l'édition se compose à la première visite, puis avec « Recomposer » dans Moi.
- Le Mac doit rester allumé, sur le même Wi-Fi. Les données sont dans `.data/kawna.json`.
- La garde iPhone fonctionne. Dans l'automatisation « Est fermée », mets l'adresse du Mac : `http://192.168.1.23:3000/fin`.

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
