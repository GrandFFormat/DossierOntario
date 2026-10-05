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
    donnees: 'apercu contenu:lexique',
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
    // Accueil éditorial (30 sept. 2026, maquette de Martin) : des cases séparées par des
    // filets, une grille. Tous les chiffres sont LUS (apercu.json), jamais illustratifs ; le
    // bloc « What the bills are about » de la maquette n'existe pas ici : aucune source ne
    // classe les projets par sujet.
    bandesBas: `<div class="colonne">
  <section class="grille-2 cases">
    <div class="case" data-role="votes-recents"></div>
    <div class="case" data-role="nouvelles" hidden>
      <h2 class="titre-case" data-i18n="neuf.titre">What's new</h2>
      <p class="legende" data-i18n="neuf.sous">The latest real activity at the Legislature</p>
      <div data-role="neuf"></div>
    </div>
  </section>
</div>
<div class="bande bande-defis" data-role="defis" hidden>
  <div class="colonne">
    <h2 class="defis-titre" data-i18n="defis.titre">Bills challenged by citizens</h2>
    <p class="defis-sous" data-i18n="defis.sous">The moment one person asks for an explanation, the bill appears here.</p>
    <p class="defis-sous" data-i18n-html="defis.petitions"><b>** In Ontario, petitions are signed on paper only: the Assembly does not accept electronic petitions. **</b></p>
    <div data-role="defis-liste"></div>
  </div>
</div>
<div class="colonne recents-accueil" data-role="recents" hidden>
  <h2 class="titre-case" data-i18n="recents.titre">Recently active bills</h2>
  <p class="legende recents-indice" data-i18n="recents.indice">↓ Click anywhere in a card to read what the bill does ↓</p>
  <div class="liste-projets" data-role="recents-liste"></div>
  <a class="lien-source" href="/bills" data-i18n="recents.tous">All bills →</a>
</div>
<div class="colonne">
  <section class="grille-2 cases">
    <div class="case">
      <p class="sur-titre" data-i18n="petitions.titre">Petitions to the Legislature</p>
      <h2 class="titre-case" data-i18n="petitions.sous">On paper only in Ontario</h2>
      <div data-role="petitions"></div>
    </div>
    <div class="case">
      <p class="sur-titre" data-i18n="mission.surTitre">Our mission</p>
      <p class="enonce-case" data-i18n="mission.enonceSimple">The Assembly's site is the most reliable source there is. This one just makes it easier to follow.</p>
      <table class="comparatif" data-role="comparatif"></table>
    </div>
  </section>
  <section class="cases case-lexique" data-role="lexique-accueil"></section>
</div>`,
    contenu: `  <section class="grille-2 cases une">
    <div class="case">
      <p class="sur-titre" data-role="legislature"></p>
      <h1 class="titre-une">
        <span data-i18n="accueil.titre1">WHAT THE</span>
        <span data-i18n="accueil.titre2">LEGISLATURE</span>
        <span data-i18n="accueil.titre3">IS DOING</span>
      </h1>
      <p class="chapo" data-i18n="accueil.chapo">Ontario's 124 MPPs pass the laws that shape schools, housing,
        health care and mining.</p>
      <div class="boutons-une">
        <a class="bouton-plein" href="/bills"><span data-i18n="accueil.tousProjets">All bills</span> <span aria-hidden="true">→</span></a>
        <a class="bouton-trait" href="/votes"><span data-i18n="accueil.votes">Recorded votes</span> <span aria-hidden="true">→</span></a>
      </div>
    </div>
    <div class="case" data-role="sieges"></div>
  </section>
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
  <div class="encadre" data-i18n-html="intro.projetsCourt"><b>44th Parliament, 1st session.</b> Summaries are written by AI from the official text, which is one click away on ola.org.</div>
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
    // « …et moi » dans le pied de page : pourquoi ce site existe, et ses mises à jour.
    fichier: 'about.html',
    vue: 'apropos',
    donnees: 'contenu:journal',
    titre: 'Why this site exists',
    description: 'Who is behind DossierOntario, why it exists, and every update made to the site.',
    contenu: `  <h1 class="titre-vue" data-i18n="etmoi.titre">Why this site exists</h1>
  <!-- Le même bloc que DQ : photo, bulle, puis le mot. -->
  <div class="createur">
    <div class="createur-tete">
      <img class="createur-photo" src="/commun/martin.jpg" width="120" height="120" alt="Martin Archambault">
      <div class="createur-bulle">
        <span data-i18n="bd.intro1">Hi! My name is</span>
        <strong class="createur-nom">Martin Archambault</strong>
        <span data-i18n="bd.intro3">I'm 45, and dossiercanada.ca is your first step into democracy!</span>
      </div>
    </div>
    <div class="createur-mot">
      <p class="createur-lead" data-i18n="bd.mot1"></p>
      <p data-i18n="bd.mot2"></p>
      <p data-i18n="bd.mot3"></p>
      <p data-i18n="bd.mot4"></p>
    </div>
  </div>
  <h2 class="titre-vue" data-i18n="etmoi.maj">Site updates</h2>
  <section data-vue="apropos"><ul class="journal" data-role="journal"></ul></section>`,
  },
  {
    // « The rules » dans le pied de page, à côté de Facebook (5 oct. 2026), comme /regles sur
    // DossierQuébec. Le contenu est propre à l'Ontario : pas de promesses ni de partis ici.
    // Chaque règle doit rester VRAIE : si le site change, la règle change avec lui.
    fichier: 'rules.html',
    vue: 'regles',
    donnees: '',
    titre: 'The rules',
    description: 'The sourcing rules of DossierOntario: official sources only, nothing invented, robots.txt respected, free and non-commercial, and what is missing is said.',
    contenu: `  <h1 class="titre-vue" data-i18n="regles.titre">The rules</h1>
  <div class="encadre" data-i18n-html="regles.intro">This site publishes only what the Legislative Assembly of Ontario and the Government of Ontario have themselves published, with a link to the original. <b>And it says clearly what is missing.</b></div>
  <ol class="regles-liste">
    <li class="regle">
      <h2 class="regle-titre"><span class="regle-no">1</span><span data-i18n="regles.1.h">No invented data</span></h2>
      <p data-i18n-html="regles.1.p">This is rule number one. If a piece of information is missing, the field stays empty or the site says it is unknown. We do not guess and we do not fill in.</p>
    </li>
    <li class="regle">
      <h2 class="regle-titre"><span class="regle-no">2</span><span data-i18n="regles.2.h">Official sources only</span></h2>
      <p data-i18n-html="regles.2.p">Everything on this site is read from two places: the <b>Legislative Assembly of Ontario</b> (ola.org) for bills, their stages and official texts, recorded votes, MPPs, committees and petitions; and the <b>Ontario Data Catalogue</b> (data.ontario.ca) for ministers and their official titles. Nothing is taken from the news media or from any other website.</p>
    </li>
    <li class="regle">
      <h2 class="regle-titre"><span class="regle-no">3</span><span data-i18n="regles.3.h">We respect a website’s refusal</span></h2>
      <p data-i18n-html="regles.3.p">Our reader says honestly who it is and never pretends to be a browser. It follows each site’s robots.txt: that is why we follow links instead of using the Assembly’s own search engine. It waits between two requests: 2 seconds on ola.org, and 10 seconds on data.ontario.ca, which asks for it. We never get around a protection: a refusal is an answer, not an obstacle.</p>
    </li>
    <li class="regle">
      <h2 class="regle-titre"><span class="regle-no">4</span><span data-i18n="regles.4.h">Free and non-commercial</span></h2>
      <p data-i18n-html="regles.4.p">The Assembly’s terms of use allow extracts to be reproduced for reasonable, fair and non-commercial use. So this site is free, with no advertising and nothing for sale. It reproduces short extracts, names its sources and links back to the official page.</p>
    </li>
    <li class="regle">
      <h2 class="regle-titre"><span class="regle-no">5</span><span data-i18n="regles.5.h">The official text always prevails</span></h2>
      <p data-i18n-html="regles.5.p">Plain-language summaries are written by AI from the official text published on ola.org, and each one is marked as such. The AI is instructed to add nothing that is not in the text and to make no judgement. When a text is too thin to be summarised honestly, we show no summary at all. The official text is always one click away, and it is the one that counts. This site is independent and has no official status.</p>
    </li>
    <li class="regle">
      <h2 class="regle-titre"><span class="regle-no">6</span><span data-i18n="regles.6.h">What we work out, we say</span></h2>
      <p data-i18n-html="regles.6.p">One thing on this site is deduced rather than read: ola.org does not say whether a bill comes from the government, so the “Government” filter is worked out from the sponsor, a minister. Ministers’ official titles come from the Ontario government’s own bilingual list: we do not translate a title ourselves.</p>
    </li>
    <li class="regle">
      <h2 class="regle-titre"><span class="regle-no">7</span><span data-i18n="regles.7.h">Our vote count is checked</span></h2>
      <p data-i18n-html="regles.7.p">At every refresh, the site counts the recorded votes announced in the Assembly’s official minutes, sitting day by sitting day, and compares that number with its own.</p>
    </li>
    <li class="regle">
      <h2 class="regle-titre"><span class="regle-no">8</span><span data-i18n="regles.8.h">We explain what is missing</span></h2>
      <p data-i18n-html="regles.8.p">When the Assembly does not publish something, the page says so: divisions published with their totals only, without the names; absences, which the Assembly does not publish; committee votes, which are not listed here yet; bills with no French text, whose summary is shown in English with a note. Ontario has no electronic petitions, and Hansard is not translated.</p>
    </li>
  </ol>
  <p class="regles-suite" data-i18n-html="regles.suite">These rules apply everywhere on the site. See where each piece of data comes from on the <a href="/sources">Sources</a> page, and follow what changes in the <a href="/about">site updates</a>.</p>`,
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
    Government of Ontario. It is free, with no advertising. It reproduces short extracts
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
    .replace(/\{\{DONNEES\}\}/g, page.donnees.split(/\s+/).includes('apercu') ? page.donnees : `${page.donnees} apercu`.trim())
    // Les bandes pleine largeur vivent hors de la colonne : seule l'accueil en a.
    // L'alerte se lit AVANT les chiffres ; la mission se lit APRÈS, en bas de page,
    // comme sur DossierQuébec — on explique ce qu'on essaie de faire à qui a déjà vu
    // ce que le site fait.
    .replace(/\{\{BANDES\}\}/g, () => page.bandes ?? '')
    .replace(/\{\{BANDES_BAS\}\}/g, () => page.bandesBas ?? '')
    .replace(/\{\{CONTENU\}\}/g, () => page.contenu)
    .replace(/(href|src)="\/(commun\/on\.(?:css|js))"/g, (_, attr, chemin) => `${attr}="/${chemin}?v=${VERSIONS[chemin]}"`);

  for (const autre of PAGES) {
    html = html.replace(`{{ACTIF_${autre.vue}}}`, autre.fichier === page.fichier ? 'actif' : '');
  }
  html = html.replace(/\{\{ACTIF_[a-z]+\}\}/g, '');

  writeFileSync(page.fichier, html);
  console.log(`${page.fichier} (${(html.length / 1024).toFixed(1)} ko)`);
}

// ---------------------------------------------------------------- une page par projet de loi
// Chaque projet a SA page, /bill/109 (1er oct. 2026, demande de Martin) : une adresse qu'on
// partage, et que Google trouve avec son propre titre et sa propre description. Le texte
// lisible sans JavaScript (titre, parrain, état, résumé en clair) est écrit dans la page ;
// on.js y pose ensuite la vraie carte, ouverte, avec Challenger et Partager.
import { mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
const echapperHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (numero) => String(numero).toLowerCase();
const projetsSite = JSON.parse(readFileSync('data/site/bills.json', 'utf8')).projets;
const resumesEn = existsSync('data/site/resumes-en.json') ? JSON.parse(readFileSync('data/site/resumes-en.json', 'utf8')) : {};
mkdirSync('bill', { recursive: true });
for (const vieux of readdirSync('bill')) if (vieux.endsWith('.html')) unlinkSync(`bill/${vieux}`);
const PAGES_PROJETS = [];
for (const p of projetsSite) {
  const r = resumesEn[p.numero];
  const puces = r ? [...(r.p ?? []), ...(r.a ?? []).flatMap((a) => a.p)].slice(0, 8) : [];
  const fichier = `bill/${slug(p.numero)}.html`;
  const titre = `Bill ${p.numero} — ${p.titreEn}`;
  const description = (puces[0] ?? `${p.titreEn}: sponsor, stage reached and recorded votes, from the Legislative Assembly of Ontario.`).slice(0, 300);
  const contenu = `  <p class="fil"><a href="/bills" data-i18n="projet.retour">← All bills</a></p>
  <h1 class="titre-vue titre-projet"><span data-i18n-numero="${echapperHtml(p.numero)}">Bill ${echapperHtml(p.numero)}</span></h1>
  <section data-vue="projet" data-numero="${echapperHtml(p.numero)}">
    <article class="carte carte-projet">
      <h2 class="carte-titre">${echapperHtml(p.titreEn)}</h2>
      <p class="legende">Sponsored by ${echapperHtml(p.parrains.join(', '))}${p.statutEn ? ` · ${echapperHtml(p.statutEn)}` : ''}</p>
      ${puces.length ? `<ul class="resume">${puces.map((x) => `<li>${echapperHtml(x)}</li>`).join('')}</ul>` : ''}
      <a class="bouton-source" href="${echapperHtml(p.url)}">Read the bill on ola.org →</a>
    </article>
  </section>`;
  PAGES_PROJETS.push({ fichier, vue: 'projet', donnees: 'bills', titre, description, contenu, actif: 'projets' });
}
for (const page of PAGES_PROJETS) {
  let html = modele
    .replace(/\{\{TITRE\}\}/g, () => echapperHtml(page.titre))
    .replace(/\{\{DESCRIPTION\}\}/g, () => echapperHtml(page.description))
    .replace(/\{\{FICHIER\}\}/g, adressePropre(page.fichier))
    .replace(/\{\{VUE\}\}/g, page.vue)
    .replace(/\{\{DONNEES\}\}/g, `${page.donnees} apercu`)
    .replace(/\{\{BANDES\}\}/g, '')
    .replace(/\{\{BANDES_BAS\}\}/g, '')
    .replace(/\{\{CONTENU\}\}/g, () => page.contenu)
    .replace(/(href|src)="\/(commun\/on\.(?:css|js))"/g, (_, attr, chemin) => `${attr}="/${chemin}?v=${VERSIONS[chemin]}"`)
    .replace(/\{\{ACTIF_projets\}\}/g, 'actif')
    .replace(/\{\{ACTIF_[a-z]+\}\}/g, '');
  writeFileSync(page.fichier, html);
}
console.log(`${PAGES_PROJETS.length} pages de projets de loi dans bill/`);

// Le plan du site, pour que Google trouve les six pages (leçon de DossierQuébec).
const plan = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...PAGES, ...PAGES_PROJETS].map(
  (p) => `  <url><loc>https://dossierontario.ca/${adressePropre(p.fichier)}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`
).join('\n')}
</urlset>
`;
writeFileSync('sitemap.xml', plan);
console.log('sitemap.xml');
