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
import { createHash } from 'node:crypto';

const MODELE = 'gabarit.html';

// La feuille de style et le script sont mis en cache une heure (vercel.json), CHACUN DE SON
// CÔTÉ. Le 24 septembre 2026, la mise en ligne des résumés l'a montré : le nouveau script est
// arrivé avec l'ancienne feuille de style, et les cartes se sont affichées sans leur mise en
// forme. Chaque page appelle donc ses deux fichiers avec l'empreinte de leur contenu
// (?v=…) : une page neuve demande la paire neuve, une page en cache garde sa paire à elle —
// jamais un mélange des deux.
const empreinte = (chemin) => createHash('sha1').update(readFileSync(chemin)).digest('hex').slice(0, 10);
const VERSIONS = { 'commun/on.css': empreinte('commun/on.css'), 'commun/on.js': empreinte('commun/on.js') };

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
</div>`,
    // La bande jaune des projets challengés, comme sur DossierQuébec. Cachée jusqu'à ce que
    // commun/on.js ait lu les totaux : si la table n'existe pas, elle ne s'affiche jamais.
    bandesBas: `<div class="bande bande-defis" data-role="defis" hidden>
  <div class="colonne">
    <h2 class="defis-titre" data-i18n="defis.titre">Bills challenged by citizens</h2>
    <p class="defis-sous" data-i18n="defis.sous">The moment one person asks for an explanation, the bill appears here.</p>
    <div data-role="defis-liste"></div>
  </div>
</div>
<div class="colonne recents-accueil" data-role="recents" hidden>
  <h2 class="titre-groupe" data-i18n="recents.titre">Recently active bills</h2>
  <p class="legende recents-indice" data-i18n="recents.indice">↓ Click anywhere in a card to read what the bill does ↓</p>
  <div class="liste-projets" data-role="recents-liste"></div>
  <a class="lien-source" href="/bills" data-i18n="recents.tous">All bills →</a>
</div>
<div class="colonne accueil-deux" data-role="nouvelles" hidden>
  <section class="nouvelles">
    <h2 class="grand-titre" data-i18n="neuf.titre">What's new</h2>
    <p class="legende sous-grand-titre" data-i18n="neuf.sous">The latest real activity at the Legislature</p>
    <div data-role="neuf"></div>
  </section>
  <section class="petitions">
    <h2 class="grand-titre" data-i18n="petitions.titre">Petitions to the Legislature</h2>
    <p class="legende sous-grand-titre" data-i18n="petitions.sous">On paper only in Ontario</p>
    <div data-role="petitions"></div>
  </section>
</div>
<div class="bande bande-mission">
  <div class="colonne">
    <p class="sur-titre" data-i18n="mission.surTitre">Our mission</p>
    <p class="enonce" data-i18n-html="mission.enonce">The Assembly's own site is the most reliable source
      there is. This one just makes it <span class="surlignage">easier to follow.</span></p>
    <div class="comparaison">
      <div class="encadre-mission">
        <h3 data-i18n="mission.euxTitre">What ola.org does</h3>
        <ul data-i18n-html="mission.eux"><li>Organises everything by official document</li></ul>
      </div>
      <div class="encadre-mission nous">
        <h3 data-i18n="mission.nousTitre">What this site tries to do</h3>
        <ul data-i18n-html="mission.nous"><li>Groups everything by bill</li></ul>
      </div>
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
      '139 public bills and 52 private bills of the 44th Parliament: stage reached, sponsor and a plain-language summary, with a link to the official text.',
    contenu: `  <h1 class="titre-vue" data-i18n="projets.titre">Bills</h1>
  <div class="encadre" data-i18n-html="intro.projets">
    <b>44th Parliament, 1st session.</b> A bill goes through first reading, second reading, committee,
    third reading and royal assent. Most bills introduced by members never leave first reading —
    that is not a failure of this site, it is what the record shows.
  </div>
  <div class="encadre"><span data-i18n="projet.avertissement">Open a bill to read a plain-language summary,
    written by AI from the official text and marked as such. The official text itself is on ola.org, one click away.</span></div>
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
    fichier: 'committees.html',
    vue: 'comites',
    donnees: 'comites',
    titre: 'Committees',
    description:
      'The eight standing committees of the Ontario Legislature: which bills they studied, when they sat, and their transcripts.',
    contenu: `  <h1 class="titre-vue" data-i18n="comites.titre">Standing committees</h1>
  <div class="encadre" data-i18n="comites.intro">
    A bill sent to committee is gone over line by line, witnesses are heard, and it can be amended.
    Committees also sit while the House is adjourned.
  </div>
  <div class="encadre"><span data-i18n="comites.votes">Committees hold recorded votes too, but the
    Assembly publishes them only inside the transcripts. They are not listed on this site yet.</span></div>
  <section data-vue="comites"></section>`,
  },
  {
    fichier: 'mpps.html',
    vue: 'deputes',
    donnees: 'members',
    titre: 'MPPs and cabinet',
    // Une seule page depuis le 24 sept. 2026 : l'ancienne /cabinet redirige ici (vercel.json).
    description: 'The 124 members of provincial parliament and the Ontario cabinet: ministers and parliamentary assistants, with their official titles, party, riding and contact details.',
    contenu: `  <h1 class="titre-vue" data-i18n="deputes.titre">MPPs and cabinet</h1>
  <section data-vue="deputes"></section>`,
  },
  {
    fichier: 'glossary.html',
    vue: 'lexique',
    donnees: 'contenu:lexique apercu',
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
    <tr><td data-i18n="sources.l1">Bills, stages, official texts (the source of the plain-language summaries)</td>
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

// Le commentaire de tête du modèle parle du modèle, pas des pages : il n'a rien à faire
// dans ce qu'on sert (et il y affirmerait « ce fichier n'est jamais servi », ce qui
// serait faux une fois recopié).
const modele = readFileSync(MODELE, 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/<!-- MODÈLE[\s\S]*?-->\n/, '');

for (const page of PAGES) {
  let html = modele
    .replace(/\{\{TITRE\}\}/g, page.titre)
    .replace(/\{\{DESCRIPTION\}\}/g, page.description)
    .replace(/\{\{FICHIER\}\}/g, adressePropre(page.fichier))
    .replace(/\{\{VUE\}\}/g, page.vue)
    .replace(/\{\{DONNEES\}\}/g, page.donnees)
    // Les bandes pleine largeur vivent hors de la colonne : seule l'accueil en a.
    // L'alerte se lit AVANT les chiffres ; la mission se lit APRÈS, en bas de page,
    // comme sur DossierQuébec — on explique ce qu'on essaie de faire à qui a déjà vu
    // ce que le site fait.
    .replace(/\{\{BANDES\}\}/g, () => page.bandes ?? '')
    .replace(/\{\{BANDES_BAS\}\}/g, () => page.bandesBas ?? '')
    .replace(/\{\{CONTENU\}\}/g, () => page.contenu)
    .replace(/(href|src)="(commun\/on\.(?:css|js))"/g, (_, attr, chemin) => `${attr}="${chemin}?v=${VERSIONS[chemin]}"`);

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
