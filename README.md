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

## L'état de la Chambre

La 44e législature siège depuis le 14 avril 2025. En 2026, elle siège du lundi au jeudi,
du 23 mars au 10 décembre, **sauf du 3 juin au 26 octobre** : le site paraît donc immobile
tout l'été, et c'est normal. Reprise le 27 octobre 2026.
