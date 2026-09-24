# DossierOntario

Site citoyen **non officiel** qui rend lisibles les travaux de l'Assemblée législative
de l'Ontario : projets de loi, étapes réelles, votes nominatifs, député·e·s, ministres.
Site frère de [DossierQuébec](https://dossierquebec.ca).

**dossierontario.ca — gratuit, sans abonnement et sans publicité.**

## Pourquoi c'est gratuit

Les conditions d'utilisation d'ola.org permettent de reproduire des **extraits** pour un
usage « raisonnable, équitable et **non commercial** », en mentionnant l'Assemblée. Ce
site s'y tient : il résume, il cite des extraits, il nomme ses sources et il renvoie
toujours à la page officielle. Rien n'y est vendu. (DossierQuébec, lui, a un abonnement ;
DossierOntario n'en a pas, et c'est voulu.)

## Les règles du projet

1. **Aucune donnée inventée.** Un champ inconnu vaut `null`. Ce qui est déduit est
   marqué comme tel (par exemple `typeProjetSource: "deduit-du-parrain"`, parce
   qu'ola.org n'écrit nulle part si un projet est « du gouvernement »).
2. **Aucune protection contournée.** User-Agent honnête qui nomme le projet et son
   adresse, jamais un navigateur usurpé. Le robots.txt fait loi : `scrapers/ola.js`
   refuse dans le code toute adresse contenant « ? », qu'ola.org interdit
   (`Disallow: /*?`). Un 403 est une réponse, pas un obstacle à franchir.
3. **Un délai entre les requêtes** : 2 s sur ola.org, 10 s sur data.ontario.ca, qui le
   demande dans son robots.txt.
4. **Tout est sourcé.** Chaque fichier de `data/` porte son adresse source et l'heure de
   lecture.

## Les sources

| Donnée | Source |
| --- | --- |
| Projets de loi, étapes, notes explicatives, textes | ola.org (pages bilingues) |
| Votes nominatifs | ola.org, une page par vote |
| Député·e·s, état des partis | ola.org + le CSV officiel des coordonnées |
| Ministres et adjoint·e·s (titres officiels FR) | data.ontario.ca, jeu « Government official names » (ONTERM), licence du gouvernement ouvert – Ontario |

Le Journal des débats (Hansard) n'est **pas** traduit par l'Assemblée : la page française
affiche le texte anglais. Les pétitions ontariennes sont **papier seulement** : il n'y a
pas de compteur de signatures à afficher.

## Faire tourner les scrapers

```bash
npm install
npm run scrape:bills            # la liste des projets (1 page, 2 requêtes)
npm run scrape:bill-details     # une fiche par projet (~11 min, 330 requêtes)
npm run scrape:votes            # les votes nominatifs, trouvés par liens (~8 min)
npm run scrape:votes-sans-noms  # les votes dont l'Assemblée ne publie que le compte
npm run scrape:members          # les 124 député·e·s + coordonnées
npm run scrape:ministers        # le Conseil des ministres, EN et FR
npm run verifier:votes          # contrôle : notre récolte contre les procès-verbaux
```

## Le contrôle des votes

Les pages de vote se trouvent par les liens des projets de loi et des motions. Rien ne
garantissait qu'aucun vote ne nous échappe — alors on vérifie. `npm run verifier:votes`
compte les votes annoncés dans les procès-verbaux officiels, jour de séance par jour de
séance, et les compare aux nôtres.

Le premier passage, le 23 septembre 2026, a trouvé un écart : **115 votes au procès-verbal,
111 chez nous**. Les quatre manquants étaient des motions d'ajournement de l'Assemblée,
que la Chambre annonce avec leur compte mais **sans la liste des noms**. D'où
`scrapers/votes-sans-noms.js` : le site les affiche avec leur compte, et dit clairement
que les noms n'ont pas été publiés. Le contrôle est maintenant vert (115 = 115) et tourne
à chaque rafraîchissement.

Options utiles : `--limite N`, `--numeros 5,12`, `--type public|prive`.
`OLA_DELAI_MS` change le délai entre deux requêtes (2000 par défaut). Ne pas le baisser
pour aller plus vite : la lenteur fait partie de la politesse.

## Les résumés en langage clair

`scrapers/resumes.js` lit le **texte officiel** de chaque projet sur ola.org — l'onglet
« Bill » de la fiche, celui que `bill-details.js` se contente de mesurer — et en tire trois à
sept puces. Une fois par langue, à partir du texte officiel **de cette langue** : l'Ontario
publie ses lois en anglais et en français, autant s'en servir plutôt que de traduire un
résumé. 191 projets, 330 résumés (52 projets n'ont pas de texte français).

La consigne interdit d'ajouter quoi que ce soit d'absent du texte, de juger, de décrire le
processus législatif (le site le montre ailleurs) et de recalculer un chiffre. Quand le texte
est procédural ou trop mince, le modèle lève `sansContenu` et **on n'affiche rien** plutôt
qu'une phrase creuse. La carte porte le résumé au-dessus de la note officielle, jamais à sa
place, avec l'avertissement qu'il vient d'une IA et le texte de l'Assemblée juste en dessous.

```bash
npm run resumes:estimation     # ce que coûterait le travail restant — ne dépense rien
npm run resumes -- --limit 10  # un petit lot, plein tarif
npm run resumes -- --batch     # tout ce qui manque, API Batches, moitié prix
```

Rien n'est jamais repayé : un résumé n'est refait que si la **dernière activité** du projet a
changé. Le premier lot complet a coûté **4,05 $ US** (4,22 $ avec les deux échantillons) —
l'estimation annonçait 2,72 $ : compter quatre signes par jeton sous-estime la prose
juridique d'environ moitié, prévoir large. Un jour ordinaire ne coûte rien du tout.
La clé (`ANTHROPIC_API_KEY`) vient de l'environnement ou de `api.env`, jamais du dépôt ;
en CI, l'étape est **sautée** si le secret n'est pas configuré et le reste tourne — le site
retombe alors sur la note officielle de l'Assemblée.

Les puces ne sont pas dans `bills.json` : elles y faisaient passer la page de 86 à 157 ko
compressés. Elles vivent dans `data/site/resumes-en.json` et `resumes-fr.json` (37 et 34 ko),
que la page ne va chercher qu'au premier pli ouvert. Les 52 projets sans texte français
affichent en français le résumé anglais, **en le disant**.

⚠️ Deux pièges déjà payés. La **langue de sortie s'écrit** : les premiers résumés anglais sont
revenus en français parce que le schéma de l'outil — le dernier mot que le modèle lit — était
rédigé en français des deux côtés. Et les textes se lisent **avant** d'appeler l'API : on ne
paie pas pour découvrir ensuite qu'une page d'ola.org n'a pas répondu.

## Fabriquer le site

```bash
npm run build          # data/site/*.json, puis les six pages et le sitemap
node scripts/serve.js  # http://localhost:4173 pour regarder le résultat
```

- `gabarit.html` est le modèle : il n'est jamais servi. `scripts/build-pages.js` en tire
  les six pages (3 à 5 ko chacune), qui chargent seulement les données dont elles ont
  besoin (`<body data-donnees="…">`).
- `commun/on.css` suit la « Charte Dossier », avec un seul changement pour l'Ontario :
  l'accent `#C8102E`. Le jaune `#FFD24D` reste commun à toute la famille.
- `commun/on.js` gère la langue (anglais par défaut, français complet), le thème choisi
  par le visiteur, la taille du texte et l'affichage des données.
- Le rafraîchissement quotidien tourne dans `.github/workflows/refresh.yml`, du lundi au
  vendredi matin, et ne produit un commit que si quelque chose a changé.

## Le déploiement (Vercel)

Le site est **fabriqué avant le commit** : les six pages et `data/site/` sont dans le
dépôt. Vercel n'a donc rien à construire, il n'a qu'à servir des fichiers. C'est ce que
disent `installCommand` et `buildCommand` dans `vercel.json` : sans eux, Vercel verrait
le script `build` du `package.json` et essaierait de refabriquer le site — alors que
`.vercelignore` retire justement `/scripts` et les données brutes de ce qui lui est
envoyé, puisqu'il n'en a pas besoin.

Deux choses apprises en chemin, un soir de septembre 2026 :

- **Vercel valide `vercel.json` contre son schéma et rejette toute clé inconnue.** Une
  clé `"//"` ajoutée en guise de commentaire fait échouer le déploiement en une seconde,
  avant même le clonage. D'où cette section : les explications vont ici, pas là-bas.
- **La branche de production se règle dans Vercel** (*Settings → Git → Production
  Branch*). Si elle ne correspond pas à la branche poussée (`master`), chaque push ne
  produit qu'un déploiement « Preview » et le domaine ne sert rien.

`ignoreCommand` évite les déploiements inutiles : un commit qui ne touche qu'un README,
les scrapers, les scripts ou les workflows ne change rien au site servi.

## L'état de la Chambre

La 44e législature siège depuis le 14 avril 2025. En 2026, elle siège du lundi au jeudi,
du 23 mars au 10 décembre, **sauf du 3 juin au 26 octobre** : le site paraît donc immobile
tout l'été, et c'est normal. Reprise le 27 octobre 2026.
