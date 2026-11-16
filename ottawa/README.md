# DossierOntario — volet Ville d'Ottawa

Première ville de DossierOntario, construite le 15 novembre 2026 en suivant
`quebec/REPRODUIRE-POUR-UNE-AUTRE-VILLE.md` (dépôt DossierQuébec). Même esprit que les volets
de ville de DossierQuébec : données publiques seulement, aucune donnée inventée, aucun verdict
sur de vraies personnes. Ce n'est pas un site de la Ville d'Ottawa et ça n'a aucun caractère
officiel. Ce README est le journal du volet.

> **État au 15 novembre 2026.** Les huit onglets sont construits et vérifiés en local
> (`npm run serve`, http://localhost:4173/ottawa/). Le volet est **une démonstration figée** :
> les deux derniers mois du mandat 2022-2026 (15 sept. → 12 nov. 2026, dernière séance du
> mandat). Il sert à deux choses : montrer à la Ville une page déjà faite plutôt qu'une demande
> de permission dans le vide, et nourrir une future infolettre. **Rien n'est poussé en ligne**
> tant que Martin ne le dit pas ; les pages portent de toute façon un `noindex` (gabarit) et
> un `X-Robots-Tag` (vercel.json) tant que la Ville n'a pas répondu, sans `Disallow`.

## Les huit onglets

| Page | Vue (`commun/on.js`) | Données (`data/site/`) | Source |
|---|---|---|---|
| `/ottawa/` Aperçu | `ottawaAccueil` | `ottawa.json`, `ottawa-conseil.json` | les deux ci-dessous |
| `/ottawa/decisions` | `ottawa` | `ottawa.json` | procès-verbaux eScribe (EN + FR) |
| `/ottawa/council` | `ottawaConseil` | `ottawa-conseil.json`, `ottawa-quartiers.json` | Elected Officials, Wards, Council Attendance |
| `/ottawa/contracts` | `ottawaContrats` | `ottawa-contrats.json` | Contracts ≥ 25 000 $ 2025 (H1, H2) |
| `/ottawa/budget` | `ottawaBudget` | `ottawa-budget.json` | Taxes by Ward, 2026 Draft Budget Explorer |
| `/ottawa/near-me` | `ottawaPres` | `ottawa-conseil`, `ottawa-quartiers`, `ottawa-pres`, `ottawa-quartier/<n>.json`, `ottawa-adresses/` | Construction forecasts, Parks, Permits 2026, Municipal Address Points |
| `/ottawa/lexicon` | `ottawaLexique` | `contenu/ottawa-lexique.json` | écrit à la main |
| `/ottawa/sources` | `ottawaSources` | `ottawa.json`, `ottawa-conseil.json`, `contenu/journal.json` | — |

La sous-navigation des huit onglets est dans chaque page (`scripts/build-pages.js`, bloc
Ottawa) ; les textes EN/FR sont les clés `ottawa.*` de `commun/on.js` ; les styles, le bloc
« Volet Ottawa » à la fin de `commun/on.css`.

## Les scripts

```bash
npm run ottawa:seances     # scrapers/ottawa.js : calendrier eScribe + procès-verbaux EN/FR des 62 derniers jours → data/ottawa.json
npm run ottawa:resumes     # scrapers/ottawa-resumes.js : 1 à 3 puces par décision et par langue (Sonnet) → data/ottawa-resumes.json
npm run ottawa:en-bref     # scrapers/ottawa-en-bref.js : une phrase par séance et par langue (Haiku) → data/ottawa-en-bref.json
npm run ottawa:donnees     # scrapers/ottawa-donnees.js --sans-adresses : élus, quartiers, présences, taxes, budget, contrats, travaux, parcs, permis → data/ottawa-ville.json
npm run ottawa:adresses    # idem, PLUS les 405 000 points d'adresse (≈ 15 min, à la main seulement) → data/ottawa-adresses.json
npm run ottawa             # les quatre premiers puis npm run build
npm run ottawa:og          # l'image de partage ottawa/og-ottawa.png (emprunte le Playwright de DossierQuébec)
```

`scripts/build-site-data.js` (bloc Ottawa) découpe tout ça en un fichier par onglet, un
fichier par quartier (travaux, parcs, permis) et un fichier par lettre de rue / par RTA de
code postal, pour que « Près de chez moi » marche sans serveur : l'adresse tapée ne quitte
jamais le navigateur.

Les lectures brutes (ArcGIS, zip du budget, xlsx des permis) sont en cache dans
`data/ottawa-brut/` (ignoré par git). Supprimer un fichier du cache force sa relecture.

## Les sources, et comment on les lit

- **Procès-verbaux** : `pub-ottawa.escribemeetings.com` (conseil et comités permanents ; pas le
  Comité de dérogation ni les conseils d'administration). Le robots.txt ne bloque que PetalBot.
  On lit la page en anglais ET en français : rien n'est traduit par nous.
- **Données ouvertes** : Open Government Licence – City of Ottawa v2.0. Les jeux sont lus par
  l'API d'items d'ArcGIS (`www.arcgis.com/sharing/rest/content/items/<id>`) et par les
  services de `services.arcgis.com` et `maps.ottawa.ca`. **Jamais** par `open.ottawa.ca` ni
  `hub.arcgis.com`, dont le robots.txt demande 60 s entre deux requêtes (on l'a enfreint pendant
  les premières recherches de la session de construction ; plus depuis, et les scrapers ne les
  touchent pas).
- **ottawa.ca** est derrière Incapsula : on ne le lit pas automatiquement. Les liens vers les
  fiches des élus et les conditions d'utilisation y mènent, sans lecture.
- User-Agent : `dossierontario-scraper/0.1 (+https://dossierontario.ca; contact@dossierquebec.ca)`,
  2 s entre deux requêtes.

### Ce qui a été déduit (et marqué comme tel)

- **Budget en milliers de dollars** : les fichiers de l'« explorateur du budget » ne nomment pas
  l'unité ; la somme du fonctionnement 2026 (5 220 570) correspond à un budget d'environ 5,2 G$.
  La note est dans `budget.note` et affichée sur la page.
- **Décision vs procédure** : un point est une décision s'il a un résultat et n'est pas une
  motion de pure procédure (« motion to introduce reports », « notice of intent »…) — sauf s'il
  a un vote nominal, auquel cas c'est toujours une décision. Les points de procédure restent
  dans `data/ottawa.json`, pas sur le site.
- **Présences** : le jeu de la Ville compte les séances du conseil du 2 oct. 2024 au
  9 sept. 2026 (43 séances), une ligne par personne présente. On joint par le nom de famille.
  Osgoode a eu deux conseillers (Darouze jusqu'au 27 févr. 2025, Skalski depuis le 18 juin 2025).

## Ce qui reste

- [ ] Décision de Martin : mettre en ligne (retirer `horsPlan: true` dans `build-pages.js` et
      l'en-tête `X-Robots-Tag` dans `vercel.json` quand la Ville a répondu, ou avant, ville par
      ville comme à Montréal).
- [ ] Envoyer `ottawa/courriel-greffe.md` au greffe de la Ville d'Ottawa (adresse à trouver sur
      ottawa.ca, ne pas deviner) ; relance à 20 jours ouvrables (Suz).
- [ ] Infolettre : brancher l'abonnement comme sur DossierQuébec (« on demandera plus tard »).
- [ ] Un run du workflow `refresh-ottawa.yml` à la main (dispatch) pour vérifier qu'il tourne
      sur GitHub ; pas de cron tant que la ville est « inactive ».
- [ ] Relecture par Hugo avant la mise en ligne (lexique, textes des huit pages, courriel).
- [ ] Après les élections municipales : relire Elected Officials 2026-2030 quand la Ville le
      publiera (nouveau jeu, nouvel identifiant).

## 15 nov. 2026, soir : comme les pages de Montréal sur DQ
- **En bref** en tête de Décisions (`VUES.ottawa`) : une carte par instance, la dernière séance, la phrase IA avec mots-clés soulignés (`scrapers/ottawa-en-bref.js`, version 2 du cache), trois points marquants choisis sans IA et les votes nominaux (`scripts/build-site-data.js`). Les liens `#s-<séance>` et `#d-<séance>-<numéro>` ouvrent ce qu'ils visent.
- Plus de bande rouge (« Gratuit. Sans publicité. », mission ola.org) ni de pied à colonnes sur `/ottawa/` : pied de ville (phrase + liens, Sources au pied). L'onglet Sources quitte la barre.
- Contrats : tableau des 15 plus gros fournisseurs (clic = recherche) et tableau de tous les contrats. Budget : barres « nom, montant · %, piste » (`.barre-service`).

## 15 nov. 2026, nuit : les pages de Vancouver, copiées

Martin : « ottawa look awfull… i just finish vancouver, can you simply copy it over here ? », puis
« adjust data ». Les huit pages d'`ottawa/` sont maintenant celles du volet Vancouver de DossierBC
(`dossierBC/vancouver/`) : même HTML, même `assets/` (style.css, app.js, langue.js,
seances-en-bref.js, libelles-en.js, imprimer-seance.js). Les anciennes pages, fabriquées par
`scripts/build-pages.js` depuis `gabarit.html`, sont gardées dans `ottawa/ancien/` ; build-pages ne
réécrit plus rien sous `ottawa/`.

- Données : `node scripts/ottawa-vers-vancouver.js` lit les fichiers d'Ottawa déjà produits
  (`data/site/ottawa*.json`, `data/ottawa-resumes.json`, `contenu/ottawa-lexique.json`) et écrit
  `ottawa/data/*.json` dans les formes de Vancouver. À relancer après chaque `npm run ottawa`.
- Ce qui est en plus de Vancouver, dans des blocs de Vancouver : les résumés IA (mécanisme de
  Montréal resté dans app.js), la carte des 24 quartiers (`districts.json`), les coordonnées et la
  présence des élus, les taxes par quartier et le budget de fonctionnement.
- Près de chez moi : Ottawa donne le quartier d'une adresse, pas un point ; les blocs montrent le
  quartier entier (pas de rayon ni de carte Leaflet). Les index d'adresses restent dans
  `/data/site/ottawa-adresses/` et `/data/site/ottawa-quartier/`.
- Retirés parce que faux pour Ottawa : l'avis « En attente de la permission » (lié au registre des
  votes de Vancouver), le bandeau « En pause / Réactiver 150 $ » (`avis-pause.js`), « Your ad here »
  (mène à /represente-ta-ville, absente de DossierOntario).
