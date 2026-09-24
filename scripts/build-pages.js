// Fabrique les pages du site à partir d'un seul modèle, gabarit.html.
//
// Même principe que DossierQuébec depuis le 21 septembre 2026 : une page par sujet,
// quelques kilooctets de HTML, et les données en JSON à côté (data/site/). Une page ne
// télécharge que ce qu'elle affiche, grâce à <body data-donnees="…">.
//
// gabarit.html n'est jamais servi : c'est le modèle.
//
// Usage : node scripts/build-pages.js

import { readFileSync, writeFileSync } from 'node:fs';

const MODELE = 'gabarit.html';

const PAGES = [
  {
    fichier: 'index.html',
    vue: 'accueil',
    donnees: 'apercu',
    titre: 'What the Ontario Legislature is doing',
    description:
      "Bills, recorded votes, MPPs and cabinet of the Legislative Assembly of Ontario, in plain language. Unofficial, free, bilingual.",
    bandes: `<div class="bande bande-alerte" data-role="relache" hidden>
  <div class="colonne">
    <span class="marqueur" aria-hidden="true">⚠️</span>
    <div>
      <p class="titre-bande" data-role="relache-titre"></p>
      <p data-role="relache-texte"></p>
    </div>
  </div>
</div>
<div class="bande bande-mission">
  <div class="colonne">
    <div>
      <p class="titre-bande" data-i18n="mission.titre">Read the record, not the press release</p>
      <p data-i18n="mission.texte">Every bill, every recorded vote and every member, taken from the
        Assembly's own record and linked back to it. Free, bilingual, and not official.</p>
    </div>
  </div>
</div>`,
    contenu: `  <h1 class="titre-une">
    <span data-i18n="accueil.titre1">WHAT THE</span>
    <span class="titre-contour" data-i18n="accueil.titre2">LEGISLATURE</span>
    <span class="titre-accent" data-i18n="accueil.titre3">IS DOING</span>
  </h1>
  <p class="chapo" data-i18n="accueil.chapo">Ontario's 124 MPPs pass the laws that shape schools, housing,
    health care and mining. DossierOntario follows every bill, every recorded vote and every member —
    from the official record, with a link back to it on each item.</p>
  <section data-vue="accueil"></section>`,
  },
  {
    fichier: 'bills.html',
    vue: 'projets',
    donnees: 'bills',
    titre: 'Bills',
    description:
      '139 public bills and 52 private bills of the 44th Parliament: stage reached, sponsor, official explanatory note.',
    contenu: `  <h1 class="titre-vue" data-i18n="projets.titre">Bills</h1>
  <div class="encadre" data-i18n-html="intro.projets">
    <b>44th Parliament, 1st session.</b> A bill goes through first reading, second reading, committee,
    third reading and royal assent. Most bills introduced by members never leave first reading —
    that is not a failure of this site, it is what the record shows.
  </div>
  <div class="encadre"><span data-i18n="projet.avertissement">The explanatory note is written by the Assembly
    as a reader’s aid and is not part of the law.</span></div>
  <div class="encadre"><span data-i18n="intro.deduction">ola.org does not say whether a bill comes from the
    government: we work it out from the sponsor — a minister, with a portfolio in brackets.</span></div>
  <section data-vue="projets"></section>`,
  },
  {
    fichier: 'votes.html',
    vue: 'votes',
    donnees: 'votes members',
    titre: 'Recorded votes',
    description: 'Every recorded division of the 44th Parliament, with how each MPP voted.',
    contenu: `  <h1 class="titre-vue" data-i18n="votes.titre">Recorded votes</h1>
  <div class="encadre" data-i18n="intro.votes">
    A recorded division happens when five or more MPPs stand to ask for one. Only then are individual
    names recorded. MPPs who were absent are not listed — the Assembly does not publish absences,
    so neither do we.
  </div>
  <section data-vue="votes"></section>`,
  },
  {
    fichier: 'mpps.html',
    vue: 'deputes',
    donnees: 'members',
    titre: 'MPPs',
    description: 'The 124 members of provincial parliament, their party, riding and contact details.',
    contenu: `  <h1 class="titre-vue" data-i18n="deputes.titre">Members of Provincial Parliament</h1>
  <section data-vue="deputes"></section>`,
  },
  {
    fichier: 'cabinet.html',
    vue: 'cabinet',
    donnees: 'cabinet',
    titre: 'Cabinet',
    description: 'Ontario ministers and parliamentary assistants, with their official titles in English and French.',
    contenu: `  <h1 class="titre-vue" data-i18n="cabinet.titre">Cabinet</h1>
  <div class="encadre" data-i18n="intro.cabinet">
    Official titles come from the Ontario government's own bilingual reference list (ONTERM),
    published in the Ontario Data Catalogue. We do not translate a title ourselves.
  </div>
  <section data-vue="cabinet"></section>`,
  },
  {
    fichier: 'glossary.html',
    vue: 'lexique',
    donnees: 'contenu:lexique',
    titre: 'Lexicon',
    description:
      'Bills, readings, closure, prorogation: the words of the Ontario Legislature explained in plain language.',
    contenu: `  <h1 class="titre-vue" data-i18n="lexique.titre">Plain-language lexicon</h1>
  <div class="encadre" data-i18n="lexique.intro">
    Parliamentary words, explained in ordinary ones. These explanations are ours, not the
    Assembly's: we write them to be understood, not to be precise in the legal sense.
    For the formal definitions, the Assembly publishes its own glossary.
  </div>
  <section data-vue="lexique"></section>`,
  },
  {
    fichier: 'sources.html',
    vue: 'sources',
    donnees: '',
    titre: 'Sources',
    description: 'Where every number on this site comes from, and what this site does not do.',
    contenu: `  <h1 class="titre-vue" data-i18n="nav.sources">Sources</h1>
  <div class="encadre" data-i18n-html="sources.intro">
    <b>This site is not official.</b> It has no link with the Legislative Assembly of Ontario or the
    Government of Ontario. It is free: no subscription, no advertising. It reproduces short extracts
    and links back to the source, as the Assembly's terms of use allow for reasonable, fair and
    non-commercial use.
  </div>
  <h2 class="titre-vue" data-i18n="sources.doù">Where the data comes from</h2>
  <table class="tableau">
    <tr><th data-i18n="sources.quoi">Data</th><th data-i18n="sources.source">Source</th></tr>
    <tr><td data-i18n="sources.l1">Bills, stages, explanatory notes</td>
        <td><a class="lien-source" href="https://www.ola.org/en/legislative-business/bills/parliament-44/session-1">ola.org — Bills</a></td></tr>
    <tr><td data-i18n="sources.l2">Recorded votes</td>
        <td><a class="lien-source" href="https://www.ola.org/en/legislative-business/votes-search">ola.org — one page per division</a></td></tr>
    <tr><td data-i18n="sources.l3">MPPs, party standings, contact details</td>
        <td><a class="lien-source" href="https://www.ola.org/en/members/current">ola.org — Current MPPs</a></td></tr>
    <tr><td data-i18n="sources.l4">Ministers, official French titles</td>
        <td><a class="lien-source" href="https://data.ontario.ca/dataset/government-official-names">Ontario Data Catalogue — Government official names (ONTERM)</a></td></tr>
  </table>
  <h2 class="titre-vue" data-i18n="sources.pasTitre">What this site does not do</h2>
  <div class="encadre" data-i18n="sources.pas">
    It never invents a missing value: an unknown field is shown as unknown. It never gets around a
    site's protections — our reader identifies itself honestly and follows ola.org's robots.txt,
    which is why we follow links instead of using the Assembly's own search engine.
    Ontario has no electronic petitions, and Hansard is not translated, so neither appears here.
  </div>`,
  },
];

// Vercel sert le site en « cleanUrls » : /bills, et non /bills.html. Les adresses que le
// site publie lui-même (canonical, og:url, plan du site) doivent dire la même chose, sinon
// Google voit deux adresses pour une seule page.
const adressePropre = (fichier) => (fichier === 'index.html' ? '' : fichier.replace(/\.html$/, ''));

const modele = readFileSync(MODELE, 'utf8').replace(/\r\n/g, '\n');

for (const page of PAGES) {
  let html = modele
    .replace(/\{\{TITRE\}\}/g, page.titre)
    .replace(/\{\{DESCRIPTION\}\}/g, page.description)
    .replace(/\{\{FICHIER\}\}/g, adressePropre(page.fichier))
    .replace(/\{\{VUE\}\}/g, page.vue)
    .replace(/\{\{DONNEES\}\}/g, page.donnees)
    // Les bandes pleine largeur vivent hors de la colonne : seule l'accueil en a.
    .replace(/\{\{BANDES\}\}/g, () => page.bandes ?? '')
    .replace(/\{\{CONTENU\}\}/g, () => page.contenu);

  for (const autre of PAGES) {
    html = html.replace(`{{ACTIF_${autre.vue}}}`, autre.fichier === page.fichier ? 'actif' : '');
  }
  html = html.replace(/\{\{ACTIF_[a-z]+\}\}/g, '');

  writeFileSync(page.fichier, html);
  console.log(`${page.fichier} (${(html.length / 1024).toFixed(1)} ko)`);
}

// Le plan du site, pour que Google trouve les six pages (leçon de DossierQuébec).
const plan = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(
  (p) => `  <url><loc>https://dossierontario.ca/${adressePropre(p.fichier)}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`
).join('\n')}
</urlset>
`;
writeFileSync('sitemap.xml', plan);
console.log('sitemap.xml');
