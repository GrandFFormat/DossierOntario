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
    bandesBas: `<div class="colonne recents-accueil" data-role="recents" hidden>
  <h2 class="titre-case" data-i18n="recents.titre">Recently active bills</h2>
  <ul class="titres-recents" data-role="recents-liste"></ul>
  <a class="lien-source" href="/bills" data-i18n="recents.tous">All bills →</a>
</div>
<div class="colonne">
  <!-- Comme l'encadré des pétitions de DossierBC (15 nov. 2026) : au-dessus des projets challengés (Martin, 16 nov.) ; remplace le bloc des pétitions et la mission en double avec la bande rouge. -->
  <p class="encadre-petitions" data-i18n-html="petitions.papier"></p>
</div>
<div class="bande bande-defis" data-role="defis" hidden>
  <div class="colonne">
    <h2 class="defis-titre" data-i18n="defis.titre">Bills challenged by citizens</h2>
    <p class="defis-sous" data-i18n="defis.sous">The moment one person asks for an explanation, the bill appears here.</p>
    <p class="defis-sous" data-i18n-html="defis.petitions"><b>** In Ontario, petitions are signed on paper only: the Assembly does not accept electronic petitions. **</b></p>
    <div data-role="defis-liste"></div>
  </div>
</div>
<!-- Votes et Quoi de neuf entre la bande des projets challengés et la bande rouge (Martin, 16 nov. 2026). -->
<div class="colonne">
  <section class="grille-2 cases">
    <div class="case" data-role="votes-recents"></div>
    <div class="case" data-role="nouvelles" hidden>
      <h2 class="titre-case" data-i18n="neuf.titre">What's new</h2>
      <p class="legende" data-i18n="neuf.sous">The latest real activity at the Legislature</p>
      <div data-role="neuf"></div>
    </div>
  </section>
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
  <section data-vue="projets"></section>
  <p class="lien-tous-votes"><a class="lien-source" href="/votes" data-i18n="projets.tousVotes">All recorded votes, motions included →</a></p>`,
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
    // Représentez votre ville : copie de la page de DossierBC (Martin, 15 nov. 2026).
    fichier: 'represente-ta-ville.html',
    vue: 'represente',
    donnees: '',
    titre: 'Represent your city',
    description: 'Bring your city council to DossierOntario: its decisions, its votes, its spending, in plain language. Prices and how it works.',
    contenu: `  <style>\n  /* Styles de la page de DossierBC (commun/dq.css, commun/bc.css), avec les variables de DossierOntario. */\n  .page-rtv { --muted: var(--slate, #5b6270); --bc-filet: var(--line); --bc-estompe: var(--slate, #5b6270); --bc-gris-fond: #eef0f3; --bc-jaune-fond: #fff4cc; --bc-rouge: var(--rouge); }\n  html:not([lang=\"fr\"]) .page-rtv .fr-txt, html[lang=\"fr\"] .page-rtv .en-txt { display: none; }\n  .page-rtv .rtv-intro{max-width:760px; margin:0 0 8px; overflow-wrap:anywhere;}
  .page-rtv .rtv-pot { position: absolute; left: -9999px; }\n  .page-rtv .hero-outline { display: block; }\n  .page-rtv .rtv{max-width:760px; margin:0 auto; padding:28px 0 48px;}\n  .page-rtv .rtv-etapes{display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:28px;}\n  .page-rtv .rtv-etape{border:3px solid var(--ink); background:var(--card); box-shadow:4px 4px 0 var(--ink); padding:14px 16px;}\n  .page-rtv .rtv-etape b{display:inline-block; background:#FFD24D; border:2px solid var(--ink); padding:0 8px; font-family:'Archivo',sans-serif; font-weight:900; margin-bottom:6px;}\n  .page-rtv .rtv-etape p{margin:0; font-size:15px; line-height:1.45;}\n  .page-rtv .rtv-form{display:grid; gap:14px; border:3px solid var(--ink); background:var(--card); box-shadow:4px 4px 0 var(--ink); padding:20px 22px;}\n  .page-rtv .rtv-form label{display:grid; gap:6px; font-weight:700; font-size:14px;}\n  .page-rtv .rtv-form input:not([type=radio]), .rtv-form textarea{font:inherit; font-weight:400; padding:10px 12px; border:2px solid var(--ink); background:#fff; color:#131313;}\n  .page-rtv .rtv-form fieldset{border:0; margin:0; padding:0; display:grid; gap:6px;}\n  .page-rtv .rtv-form legend{font-weight:700; font-size:14px; margin-bottom:6px;}\n  .page-rtv .rtv-form .rtv-choix{display:flex; align-items:center; gap:8px; font-weight:400;}\n  .page-rtv .rtv-form .bill-more{justify-self:start; cursor:pointer;}\n  .page-rtv .rtv-pot{position:absolute; left:-9999px; width:1px; height:1px; opacity:0;}\n  .page-rtv .rtv-note{margin:0; font-size:13px; color:var(--muted, #5B6570);}\n  .page-rtv .rtv-merci{margin:0; font-size:16px;}\n  .page-rtv .rtv-h1{font-size:clamp(40px, 7vw, 88px) !important; line-height:1 !important; overflow-wrap:anywhere;}\n  .page-rtv .rtv-lien{color:inherit; font-weight:700; text-decoration:underline; text-decoration-color:#FFD24D; text-decoration-thickness:4px; text-underline-offset:3px;}\n  .page-rtv .rtv-lien:hover{text-decoration-color:#0E4FC1;}\n  .page-rtv .rtv-prix{border:3px solid var(--ink); background:var(--card); box-shadow:4px 4px 0 var(--ink); padding:16px 18px; margin-bottom:28px;}\n  .page-rtv .rtv-prix p{margin:0 0 10px; font-size:15px; line-height:1.45;}\n  .page-rtv .rtv-prix-h{font-family:'Archivo',sans-serif; font-weight:900; font-size:20px; margin:0 0 12px;}\n  .page-rtv .rtv-grille{border-collapse:collapse; margin:0 0 12px; font-size:15px;}\n  .page-rtv .rtv-grille td{padding:5px 18px 5px 0; border-bottom:1px solid var(--line, #ddd);}\n  .page-rtv .rtv-grille td:last-child{font-weight:800; text-align:right; padding-right:0;}\n  .page-rtv .rtv-fondateur{background:#FFF3C4; color:#131313; border-left:4px solid #FFD24D; padding:8px 10px;}\n  .page-rtv .rtv-bloquee td{color:var(--bc-rouge); font-weight:700;}\n  .page-rtv .rtv-permission td{background:var(--bc-jaune-fond); color:#17202b; font-weight:600;}\n  .page-rtv .rtv-inconnu td{background:var(--bc-gris-fond); color:#17202b;}\n  .page-rtv .rtv-legende{margin:18px 0 0; padding:14px 16px; border:1px solid var(--bc-filet);}\n  .page-rtv .rtv-legende ul{margin:0; padding:0; list-style:none;}\n  .page-rtv .rtv-legende-titre{margin:0 0 10px; font-weight:700; font-size:11px; letter-spacing:.14em; text-transform:uppercase;}\n  .page-rtv .rtv-legende li{position:relative; padding:0 0 0 24px; margin:0 0 8px; font-size:13.5px; line-height:1.55;}\n  .page-rtv .rtv-legende li::before{content:\"\"; position:absolute; left:0; top:4px; width:12px; height:12px; border:1px solid var(--bc-filet);}\n  .page-rtv .rtv-villes{border-collapse:collapse; margin:0 0 12px; font-size:15px; width:100%;}\n  .page-rtv .rtv-villes th, .page-rtv .rtv-villes td{padding:5px 10px 5px 0; border-bottom:1px solid var(--line, #ddd); text-align:left;}\n  .page-rtv .rtv-villes td:nth-child(3), .page-rtv .rtv-villes td:nth-child(4){text-align:right;}\n  .page-rtv .rtv-villes-plus{margin:0 0 12px;}\n  .page-rtv .rtv-villes-plus summary, .page-rtv .rtv-menu-titre{cursor:pointer; font-weight:700;}\n  .page-rtv .rtv-legende li:last-child{margin-bottom:0;}\n  .page-rtv .rtv-l-rouge::before{background:var(--bc-rouge); border-color:var(--bc-rouge) !important;}\n  .page-rtv .rtv-l-jaune::before{background:var(--bc-jaune-fond);}\n  .page-rtv .rtv-l-gris::before{background:var(--bc-gris-fond);}\n  .page-rtv .rtv-legende-source{margin:12px 0 0; font-size:12px; color:var(--bc-estompe);}\n  \n  @media (max-width: 640px) { .page-rtv .rtv-etapes { grid-template-columns: 1fr; } }\n  </style>\n  <div class=\"page-rtv\">\n    <div class=\"view-hero\">\n      <h1 class=\"titre-vue\"><span class=\"en-txt\">Represent your city</span><span class=\"fr-txt\">Représentez votre ville</span></h1>\n      <p class=\"rtv-intro\">\n        <span class=\"en-txt\">DossierOntario puts the Legislative Assembly of Ontario in plain language. The same can be done for a city council: its decisions, its votes, its spending. <b>Ottawa is the first Ontario city covered.</b> Raise your hand and yours could be next. <a class=\"rtv-lien\" href=\"https://dossierquebec.ca/montreal/?lang=en\" target=\"_blank\" rel=\"noopener\">See what it looks like, on the City of Montréal →</a></span>\n        <span class=\"fr-txt\">DossierOntario met l'Assemblée législative de l'Ontario en langage clair. On peut faire la même chose pour un conseil municipal : ses décisions, ses votes, ses dépenses. <b>Ottawa est la première ville de l'Ontario couverte.</b> Levez la main et la vôtre pourrait être la prochaine. <a class=\"rtv-lien\" href=\"https://dossierquebec.ca/montreal/\" target=\"_blank\" rel=\"noopener\">Voir à quoi ça ressemble, sur la Ville de Montréal →</a></span>\n      </p>\n    </div>\n\n    <div class=\"band band-white bleed\"><div class=\"rtv\">\n      <div class=\"rtv-etapes\">\n        <div class=\"rtv-etape\"><b>1</b><p><span class=\"en-txt\">You tell us which city you want to see on the site.</span><span class=\"fr-txt\">Vous nous dites quelle ville vous voulez voir sur le site.</span></p></div>\n        <div class=\"rtv-etape\"><b>2</b><p><span class=\"en-txt\">We check how the city publishes its council minutes (some still scan handwritten pages) and come back to you with the cost.</span><span class=\"fr-txt\">On vérifie comment la Ville publie ses procès-verbaux (certaines numérisent encore des pages écrites à la main) et on vous revient avec le coût.</span></p></div>\n        <div class=\"rtv-etape\"><b>3</b><p><span class=\"en-txt\">Your city appears in the Cities menu, with “Report offered by” and your name on it.</span><span class=\"fr-txt\">Votre ville apparaît dans le menu Villes, avec la mention « Compte rendu offert par » et votre nom.</span></p></div>\n      </div>\n\n      <div class=\"rtv-prix\">\n        <h2 class=\"rtv-prix-h\"><span class=\"en-txt\">Prices, for a sponsoring business</span><span class=\"fr-txt\">Les prix, pour une entreprise commanditaire</span></h2>\n\n        <details class=\"rtv-menu\" open><summary class=\"rtv-menu-titre\"><span class=\"en-txt\">Prices</span><span class=\"fr-txt\">Les prix</span></summary>\n        <p><b class=\"en-txt\">Setup: $500, once.</b><b class=\"fr-txt\">Démarrage : 500 $, une fois.</b>\n          <span class=\"en-txt\">We load the decisions of the last two months. A council does not sit from the 1st to the 31st: two months guarantee one full month, so whoever subscribes gets a real summary right away. Not every city publishes its minutes in a modern way, and digging them out is most of the work.</span>\n          <span class=\"fr-txt\">On charge les décisions des deux derniers mois. Un conseil ne siège pas du 1<sup>er</sup> au 31 : deux mois garantissent un mois complet, et la personne qui s'abonne reçoit tout de suite un vrai résumé. Toutes les villes ne publient pas leurs procès-verbaux de façon moderne, et aller les chercher est l'essentiel du travail.</span></p>\n        <p><b class=\"en-txt\">Then, per month:</b><b class=\"fr-txt\">Ensuite, par mois :</b></p>\n        <table class=\"rtv-grille\">\n          <tr><td><span class=\"en-txt\">City under 50,000 people</span><span class=\"fr-txt\">Ville de moins de 50 000 habitant·e·s</span></td><td><span class=\"en-txt\">$50</span><span class=\"fr-txt\">50 $</span></td></tr>\n          <tr><td><span class=\"en-txt\">50,000 to 150,000 people</span><span class=\"fr-txt\">De 50 000 à 150 000</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr><td><span class=\"en-txt\">150,000 to 500,000 people</span><span class=\"fr-txt\">De 150 000 à 500 000</span></td><td><span class=\"en-txt\">$200</span><span class=\"fr-txt\">200 $</span></td></tr>\n          <tr><td><span class=\"en-txt\">500,000 to 1 million people</span><span class=\"fr-txt\">De 500 000 à 1 million</span></td><td><span class=\"en-txt\">$300</span><span class=\"fr-txt\">300 $</span></td></tr>\n          <tr><td><span class=\"en-txt\">Over 1 million people</span><span class=\"fr-txt\">Plus d'un million</span></td><td><span class=\"en-txt\">$500</span><span class=\"fr-txt\">500 $</span></td></tr>\n        </table>\n        </details>\n\n        <details class=\"rtv-menu\"><summary class=\"rtv-menu-titre\"><span class=\"en-txt\">Ontario cities and their prices</span><span class=\"fr-txt\">Les villes de l’Ontario et leurs prix</span></summary>\n        <p class=\"rtv-villes-titre\"><b class=\"en-txt\">Every municipality over 50,000</b><b class=\"fr-txt\">Toutes les municipalités de plus de 50 000</b>\n          <span class=\"rtv-archaique-legende\"><span class=\"en-txt\">In red: the city’s own website turns automated reading away. We write to the city first.</span><span class=\"fr-txt\">En rouge : le site de la Ville refuse la lecture automatisée. On écrit d’abord à la Ville.</span></span></p>\n        <table class=\"rtv-villes\">\n          <tr><th>#</th><th><span class=\"en-txt\">City</span><span class=\"fr-txt\">Ville</span></th><th><span class=\"en-txt\">Population (2021)</span><span class=\"fr-txt\">Population (2021)</span></th><th><span class=\"en-txt\">Price per month</span><span class=\"fr-txt\">Prix par mois</span></th></tr>\n          <tr class=\"rtv-bloquee\"><td>1</td><td>Toronto</td><td><span class=\"en-txt\">2,794,356</span><span class=\"fr-txt\">2 794 356</span></td><td><span class=\"en-txt\">$500</span><span class=\"fr-txt\">500 $</span></td></tr>\n          <tr><td>2</td><td>Ottawa <span class=\"pr-meta\">(<a class=\"rtv-lien\" href=\"/ottawa/\"><span class=\"en-txt\">on the site</span><span class=\"fr-txt\">déjà sur le site</span></a>)</span></td><td><span class=\"en-txt\">1,017,449</span><span class=\"fr-txt\">1 017 449</span></td><td><span class=\"en-txt\">$500</span><span class=\"fr-txt\">500 $</span></td></tr>\n          <tr class=\"rtv-permission\"><td>3</td><td>Mississauga</td><td><span class=\"en-txt\">717,961</span><span class=\"fr-txt\">717 961</span></td><td><span class=\"en-txt\">$300</span><span class=\"fr-txt\">300 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>4</td><td>Brampton</td><td><span class=\"en-txt\">656,480</span><span class=\"fr-txt\">656 480</span></td><td><span class=\"en-txt\">$300</span><span class=\"fr-txt\">300 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>5</td><td>Hamilton</td><td><span class=\"en-txt\">569,353</span><span class=\"fr-txt\">569 353</span></td><td><span class=\"en-txt\">$300</span><span class=\"fr-txt\">300 $</span></td></tr>\n          <tr class=\"rtv-permission\"><td>6</td><td>London</td><td><span class=\"en-txt\">422,324</span><span class=\"fr-txt\">422 324</span></td><td><span class=\"en-txt\">$200</span><span class=\"fr-txt\">200 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>7</td><td>Markham</td><td><span class=\"en-txt\">338,503</span><span class=\"fr-txt\">338 503</span></td><td><span class=\"en-txt\">$200</span><span class=\"fr-txt\">200 $</span></td></tr>\n        </table>\n        <details class=\"rtv-villes-plus\"><summary><span class=\"en-txt\">See the 35 other cities over 50,000</span><span class=\"fr-txt\">Voir les 35 autres villes de plus de 50 000</span></summary>\n        <table class=\"rtv-villes\">\n          <tr><th>#</th><th><span class=\"en-txt\">City</span><span class=\"fr-txt\">Ville</span></th><th><span class=\"en-txt\">Population (2021)</span><span class=\"fr-txt\">Population (2021)</span></th><th><span class=\"en-txt\">Price per month</span><span class=\"fr-txt\">Prix par mois</span></th></tr>\n          <tr class=\"rtv-inconnu\"><td>8</td><td>Vaughan</td><td><span class=\"en-txt\">323,103</span><span class=\"fr-txt\">323 103</span></td><td><span class=\"en-txt\">$200</span><span class=\"fr-txt\">200 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>9</td><td>Kitchener</td><td><span class=\"en-txt\">256,885</span><span class=\"fr-txt\">256 885</span></td><td><span class=\"en-txt\">$200</span><span class=\"fr-txt\">200 $</span></td></tr>\n          <tr class=\"rtv-permission\"><td>10</td><td>Windsor</td><td><span class=\"en-txt\">229,660</span><span class=\"fr-txt\">229 660</span></td><td><span class=\"en-txt\">$200</span><span class=\"fr-txt\">200 $</span></td></tr>\n          <tr class=\"rtv-permission\"><td>11</td><td>Oakville</td><td><span class=\"en-txt\">213,759</span><span class=\"fr-txt\">213 759</span></td><td><span class=\"en-txt\">$200</span><span class=\"fr-txt\">200 $</span></td></tr>\n          <tr class=\"rtv-permission\"><td>12</td><td>Richmond Hill</td><td><span class=\"en-txt\">202,022</span><span class=\"fr-txt\">202 022</span></td><td><span class=\"en-txt\">$200</span><span class=\"fr-txt\">200 $</span></td></tr>\n          <tr class=\"rtv-bloquee\"><td>13</td><td>Burlington</td><td><span class=\"en-txt\">186,948</span><span class=\"fr-txt\">186 948</span></td><td><span class=\"en-txt\">$200</span><span class=\"fr-txt\">200 $</span></td></tr>\n          <tr class=\"rtv-permission\"><td>14</td><td>Oshawa</td><td><span class=\"en-txt\">175,383</span><span class=\"fr-txt\">175 383</span></td><td><span class=\"en-txt\">$200</span><span class=\"fr-txt\">200 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>15</td><td><span class=\"en-txt\">Greater Sudbury</span><span class=\"fr-txt\">Grand Sudbury</span></td><td><span class=\"en-txt\">166,004</span><span class=\"fr-txt\">166 004</span></td><td><span class=\"en-txt\">$200</span><span class=\"fr-txt\">200 $</span></td></tr>\n          <tr class=\"rtv-permission\"><td>16</td><td>Barrie</td><td><span class=\"en-txt\">147,829</span><span class=\"fr-txt\">147 829</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>17</td><td>Guelph</td><td><span class=\"en-txt\">143,740</span><span class=\"fr-txt\">143 740</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>18</td><td>Whitby</td><td><span class=\"en-txt\">138,501</span><span class=\"fr-txt\">138 501</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-permission\"><td>19</td><td>Cambridge</td><td><span class=\"en-txt\">138,479</span><span class=\"fr-txt\">138 479</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>20</td><td>St. Catharines</td><td><span class=\"en-txt\">136,803</span><span class=\"fr-txt\">136 803</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>21</td><td>Milton</td><td><span class=\"en-txt\">132,979</span><span class=\"fr-txt\">132 979</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>22</td><td>Kingston</td><td><span class=\"en-txt\">132,485</span><span class=\"fr-txt\">132 485</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>23</td><td>Ajax</td><td><span class=\"en-txt\">126,666</span><span class=\"fr-txt\">126 666</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>24</td><td>Waterloo</td><td><span class=\"en-txt\">121,436</span><span class=\"fr-txt\">121 436</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr><td>25</td><td>Thunder Bay</td><td><span class=\"en-txt\">108,843</span><span class=\"fr-txt\">108 843</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>26</td><td>Brantford</td><td><span class=\"en-txt\">104,688</span><span class=\"fr-txt\">104 688</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>27</td><td>Chatham-Kent</td><td><span class=\"en-txt\">103,988</span><span class=\"fr-txt\">103 988</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>28</td><td>Clarington</td><td><span class=\"en-txt\">101,427</span><span class=\"fr-txt\">101 427</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>29</td><td>Pickering</td><td><span class=\"en-txt\">99,186</span><span class=\"fr-txt\">99 186</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>30</td><td>Niagara Falls</td><td><span class=\"en-txt\">94,415</span><span class=\"fr-txt\">94 415</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-permission\"><td>31</td><td>Newmarket</td><td><span class=\"en-txt\">87,942</span><span class=\"fr-txt\">87 942</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>32</td><td>Peterborough</td><td><span class=\"en-txt\">83,651</span><span class=\"fr-txt\">83 651</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>33</td><td>Kawartha Lakes</td><td><span class=\"en-txt\">79,247</span><span class=\"fr-txt\">79 247</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-permission\"><td>34</td><td>Caledon</td><td><span class=\"en-txt\">76,581</span><span class=\"fr-txt\">76 581</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-permission\"><td>35</td><td>Sault Ste. Marie</td><td><span class=\"en-txt\">72,051</span><span class=\"fr-txt\">72 051</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>36</td><td>Sarnia</td><td><span class=\"en-txt\">72,047</span><span class=\"fr-txt\">72 047</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>37</td><td>Norfolk County</td><td><span class=\"en-txt\">67,490</span><span class=\"fr-txt\">67 490</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr><td>38</td><td>Halton Hills</td><td><span class=\"en-txt\">62,951</span><span class=\"fr-txt\">62 951</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>39</td><td>Aurora</td><td><span class=\"en-txt\">62,057</span><span class=\"fr-txt\">62 057</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>40</td><td>Welland</td><td><span class=\"en-txt\">55,750</span><span class=\"fr-txt\">55 750</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-permission\"><td>41</td><td>Belleville</td><td><span class=\"en-txt\">55,071</span><span class=\"fr-txt\">55 071</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n          <tr class=\"rtv-permission\"><td>42</td><td>North Bay</td><td><span class=\"en-txt\">52,662</span><span class=\"fr-txt\">52 662</span></td><td><span class=\"en-txt\">$100</span><span class=\"fr-txt\">100 $</span></td></tr>\n        </table>\n        </details>\n        <details class=\"rtv-villes-plus\"><summary><span class=\"en-txt\">Just under the line, at $50 a month</span><span class=\"fr-txt\">Juste sous la barre, à 50 $ par mois</span></summary>\n        <table class=\"rtv-villes\">\n          <tr><th>#</th><th><span class=\"en-txt\">City</span><span class=\"fr-txt\">Ville</span></th><th><span class=\"en-txt\">Population (2021)</span><span class=\"fr-txt\">Population (2021)</span></th><th><span class=\"en-txt\">Price per month</span><span class=\"fr-txt\">Prix par mois</span></th></tr>\n          <tr class=\"rtv-permission\"><td>43</td><td>Whitchurch-Stouffville</td><td><span class=\"en-txt\">49,864</span><span class=\"fr-txt\">49 864</span></td><td><span class=\"en-txt\">$50</span><span class=\"fr-txt\">50 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>44</td><td>Haldimand County</td><td><span class=\"en-txt\">49,216</span><span class=\"fr-txt\">49 216</span></td><td><span class=\"en-txt\">$50</span><span class=\"fr-txt\">50 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>45</td><td>Cornwall</td><td><span class=\"en-txt\">47,845</span><span class=\"fr-txt\">47 845</span></td><td><span class=\"en-txt\">$50</span><span class=\"fr-txt\">50 $</span></td></tr>\n          <tr class=\"rtv-permission\"><td>46</td><td>Georgina</td><td><span class=\"en-txt\">47,642</span><span class=\"fr-txt\">47 642</span></td><td><span class=\"en-txt\">$50</span><span class=\"fr-txt\">50 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>47</td><td>Woodstock</td><td><span class=\"en-txt\">46,705</span><span class=\"fr-txt\">46 705</span></td><td><span class=\"en-txt\">$50</span><span class=\"fr-txt\">50 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>48</td><td>Quinte West</td><td><span class=\"en-txt\">46,560</span><span class=\"fr-txt\">46 560</span></td><td><span class=\"en-txt\">$50</span><span class=\"fr-txt\">50 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>49</td><td>New Tecumseth</td><td><span class=\"en-txt\">43,948</span><span class=\"fr-txt\">43 948</span></td><td><span class=\"en-txt\">$50</span><span class=\"fr-txt\">50 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>50</td><td>Innisfil</td><td><span class=\"en-txt\">43,326</span><span class=\"fr-txt\">43 326</span></td><td><span class=\"en-txt\">$50</span><span class=\"fr-txt\">50 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>51</td><td>Bradford West Gwillimbury</td><td><span class=\"en-txt\">42,880</span><span class=\"fr-txt\">42 880</span></td><td><span class=\"en-txt\">$50</span><span class=\"fr-txt\">50 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>52</td><td>St. Thomas</td><td><span class=\"en-txt\">42,840</span><span class=\"fr-txt\">42 840</span></td><td><span class=\"en-txt\">$50</span><span class=\"fr-txt\">50 $</span></td></tr>\n          <tr class=\"rtv-inconnu\"><td>53</td><td>Timmins</td><td><span class=\"en-txt\">41,145</span><span class=\"fr-txt\">41 145</span></td><td><span class=\"en-txt\">$50</span><span class=\"fr-txt\">50 $</span></td></tr>\n          <tr class=\"rtv-permission\"><td>54</td><td>Lakeshore</td><td><span class=\"en-txt\">40,410</span><span class=\"fr-txt\">40 410</span></td><td><span class=\"en-txt\">$50</span><span class=\"fr-txt\">50 $</span></td></tr>\n        </table>\n        </details>\n        <p class=\"rtv-note\"><span class=\"en-txt\">Population from the 2021 Census of Canada. Any city not listed here is under 40,000, at $50 a month.</span><span class=\"fr-txt\">Population du recensement de 2021 de Statistique Canada. Une ville absente de ces listes est sous les 40 000, à 50 $ par mois.</span></p>\n        <div class=\"rtv-legende\">\n          <p class=\"rtv-legende-titre\"><span class=\"en-txt\">Reading the colours</span><span class=\"fr-txt\">Lire les couleurs</span></p>\n          <ul>\n          <li class=\"rtv-l-rouge\"><span class=\"en-txt\">The city’s website turns automated reading away. We do not get around that: we write to the city to get access, then we deliver.</span><span class=\"fr-txt\">Le site de la Ville refuse la lecture automatisée. On ne contourne pas : on écrit à la Ville pour obtenir l’accès, puis on livre.</span></li>\n          <li class=\"rtv-l-jaune\"><span class=\"en-txt\">The city requires written permission before anyone republishes its records. We ask before we sell.</span><span class=\"fr-txt\">La Ville exige une permission écrite avant qu’on republie ses documents. On demande avant de vendre.</span></li>\n          <li class=\"rtv-l-gris\"><span class=\"en-txt\">No clause found either way, an unclear clause, or we could not read it. Nothing allows us, nothing forbids us, and silence is not permission. We ask too.</span><span class=\"fr-txt\">Aucune clause trouvée, ni dans un sens ni dans l’autre, une clause floue, ou on n’a pas pu la lire. Rien ne nous autorise, rien ne nous interdit, et le silence n’est pas une permission. On demande aussi.</span></li>\n          <li><span class=\"en-txt\">No colour: the city allows reproduction with credit, or it is already on the site.</span><span class=\"fr-txt\">Sans couleur : la Ville permet de reproduire avec mention de la source, ou elle est déjà sur le site.</span></li>\n          </ul>\n          <p class=\"rtv-legende-source\"><span class=\"en-txt\">Terms of use read, or attempted, on each city’s own website on 16 November 2026.</span><span class=\"fr-txt\">Conditions d’utilisation lues, ou tentées, sur le site de chaque ville le 16 novembre 2026.</span></p>\n        </div>\n        <p class=\"rtv-note\"><span class=\"en-txt\"><b>Toronto and Burlington take a few emails first.</b> Their websites answer an automated reader with a refusal instead of the document, and we do not work around that. We write to the city to get access. If one of them is your city, raise your hand: we handle the emails.</span><span class=\"fr-txt\"><b>Toronto et Burlington demandent d’abord quelques courriels.</b> Leurs sites répondent à un robot par un refus plutôt que par le document, et on ne contourne pas ça. On écrit à la Ville pour obtenir l’accès. Si c’est votre ville, levez la main : on s’occupe des courriels.</span></p>\n        </details>\n\n        <details class=\"rtv-menu\"><summary class=\"rtv-menu-titre\"><span class=\"en-txt\">Terms</span><span class=\"fr-txt\">Conditions</span></summary>\n        <p><span class=\"en-txt\">Sponsorship is taken in three-month blocks. One sponsor per city. If several want the same city, sealed bids, best offer wins.</span><span class=\"fr-txt\">La représentation se prend par blocs de trois mois. Un seul commanditaire par ville. Si plusieurs veulent la même ville, offres sous pli, la meilleure l'emporte.</span></p>\n        <p class=\"rtv-fondateur\"><b class=\"en-txt\">Founders:</b><b class=\"fr-txt\">Fondateurs :</b> <span class=\"en-txt\">the first sponsors choose three months, six months or a year, at the same monthly price for the whole term.</span><span class=\"fr-txt\">les premiers commanditaires choisissent trois mois, six mois ou un an, au même prix par mois pour toute la durée.</span></p>\n        </details>\n      </div>\n\n      <form class=\"rtv-form\" id=\"rtvForm\" onsubmit=\"event.preventDefault(); rtvEnvoyer(this)\">\n        <label><span><span class=\"en-txt\">Your city</span><span class=\"fr-txt\">Votre ville</span></span><input name=\"ville\" required maxlength=\"80\" placeholder=\"Ottawa, Hamilton, London…\"></label>\n        <label><span><span class=\"en-txt\">Your name or your organization's</span><span class=\"fr-txt\">Votre nom ou celui de votre organisme</span></span><input name=\"nom\" required maxlength=\"120\"></label>\n        <label><span><span class=\"en-txt\">Your email</span><span class=\"fr-txt\">Votre courriel</span></span><input name=\"courriel\" type=\"email\" required maxlength=\"200\"></label>\n        <fieldset>\n          <legend><span class=\"en-txt\">You are</span><span class=\"fr-txt\">Vous êtes</span></legend>\n          <label class=\"rtv-choix\"><input type=\"radio\" name=\"profil\" value=\"citoyen\" checked> <span class=\"en-txt\">A citizen</span><span class=\"fr-txt\">Un citoyen ou une citoyenne</span></label>\n          <label class=\"rtv-choix\"><input type=\"radio\" name=\"profil\" value=\"organisme\"> <span class=\"en-txt\">An organization</span><span class=\"fr-txt\">Un organisme</span></label>\n          <label class=\"rtv-choix\"><input type=\"radio\" name=\"profil\" value=\"entreprise\"> <span class=\"en-txt\">A business that wants to sponsor its city</span><span class=\"fr-txt\">Une entreprise qui veut commanditer sa ville</span></label>\n        </fieldset>\n        <label><span><span class=\"en-txt\">Anything else (optional)</span><span class=\"fr-txt\">Un mot de plus (facultatif)</span></span><textarea name=\"message\" rows=\"4\" maxlength=\"2000\"></textarea></label>\n        <input name=\"site_web\" class=\"rtv-pot\" tabindex=\"-1\" autocomplete=\"off\" aria-hidden=\"true\">\n        <button type=\"submit\" class=\"bill-more\"><span class=\"en-txt\">Raise my hand →</span><span class=\"fr-txt\">Lever la main →</span></button>\n        <p class=\"rtv-note\" aria-live=\"polite\" id=\"rtvEtat\"><span class=\"en-txt\">No parties, candidates or elected officials. A sponsor has no say over the content.</span><span class=\"fr-txt\">Pas de parti, de candidat·e ni d'élu·e. Le commanditaire n'a aucun droit de regard sur le contenu.</span></p>\n      </form>\n    </div></div>\n  </div>\n  <script>\n  // Le formulaire poste sur /api/represente (copie de api/represente.js de DossierBC), qui envoie le tout par courriel.\n  async function rtvEnvoyer(f) {\n    const en = document.documentElement.lang !== 'fr';\n    const note = f.querySelector('.rtv-note'), btn = f.querySelector('button');\n    btn.disabled = true;\n    note.textContent = en ? 'Sending…' : 'Envoi…';\n    try {\n      const d = Object.fromEntries(new FormData(f));\n      d.province = 'on';\n      const r = await fetch('/api/represente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });\n      if (!r.ok) throw new Error('HTTP ' + r.status);\n      f.innerHTML = en ? '<p class=\"rtv-merci\"><b>Thank you.</b> We will email you once we have looked at your city.</p>' : '<p class=\"rtv-merci\"><b>Merci.</b> On vous revient par courriel dès qu\\'on a regardé votre ville.</p>';\n    } catch (e) {\n      btn.disabled = false;\n      note.textContent = en ? 'Sending failed. Please try again in a moment.' : 'L\\'envoi n\\'a pas fonctionné. Réessayez dans un moment.';\n    }\n  }\n  </script>`,
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
    // Les législatures terminées (30 oct. 2026, comme DossierQuébec) : une case par législature,
    // vers ses projets (/bills?archives=N) et ses votes (/votes?archives=N). data/archives/index.json.
    fichier: 'archives.html',
    vue: 'archives',
    donnees: 'archives',
    titre: 'Archives',
    description: 'Bills and recorded votes of past Parliaments of Ontario, frozen as they were on their last day.',
    contenu: `  <h1 class="titre-vue" data-i18n="archives.titre">Archives</h1>
  <section data-vue="archives"></section>`,
  },
  {
    // La page introuvable : Vercel sert 404.html, à la racine, pour toute adresse inconnue.
    // Hors du plan du site (horsPlan), et jamais indexée.
    fichier: '404.html',
    vue: 'introuvable',
    donnees: '',
    horsPlan: true,
    titre: 'Page not found',
    description: 'This page does not exist on DossierOntario.',
    contenu: `  <section class="introuvable">
    <p class="sur-titre" data-i18n="e404.sur">Error 404 · Motion defeated</p>
    <h1 class="titre-vue" data-i18n="e404.titre">This page was prorogued.</h1>
    <p class="chapo" data-i18n="e404.texte">It was tabled, sent to committee, and never heard from again. No recorded vote, no Hansard, not even a petition on paper.</p>
    <div class="vote-404" aria-hidden="true">
      <div><b>0</b><span data-i18n="e404.pour">Yeas</span></div>
      <div class="contre"><b>404</b><span data-i18n="e404.contre">Nays</span></div>
    </div>
    <p class="legende" data-i18n="e404.speaker">The Speaker rules the address out of order.</p>
    <div class="boutons-une">
      <a class="bouton-plein" href="/"><span data-i18n="e404.accueil">Back to the House</span> <span aria-hidden="true">→</span></a>
      <a class="bouton-trait" href="/bills"><span data-i18n="e404.projets">Bills that do exist</span> <span aria-hidden="true">→</span></a>
    </div>
  </section>`,
  },
  {
    fichier: 'ottawa/index.html',
    horsPlan: true, // verrou : noindex tant que la Ville d'Ottawa n'a pas répondu (guide DQ, étape 2)
    vue: 'ottawaAccueil',
    donnees: 'ottawa ottawa-conseil',
    titre: "Ottawa, decision by decision",
    description: "What Ottawa City Council and its committees decided in the last two months, who sits on council, the contracts, the budget and taxes, and what is coming near you. Unofficial, bilingual.",
    contenu: `  <p class="fil"><a href="/" data-i18n="ottawa.retour">← DossierOntario</a></p>
  <p class="sur-titre" data-i18n="ottawa.surAccueil">City of Ottawa · an unofficial citizen file</p>
  <h1 class="titre-vue" data-i18n="ottawa.titreAccueil">Ottawa, decision by decision</h1>
  <nav class="sous-onglets" aria-label="Ottawa">
    <a href="/ottawa/" data-i18n="ottawa.ongletAccueil" class="${'accueil' === 'accueil' ? 'actif' : ''}">Overview</a>
    <a href="/ottawa/decisions" data-i18n="ottawa.ongletDecisions" class="${'decisions' === 'accueil' ? 'actif' : ''}">Decisions</a>
    <a href="/ottawa/council" data-i18n="ottawa.ongletConseil" class="${'council' === 'accueil' ? 'actif' : ''}">Council</a>
    <a href="/ottawa/contracts" data-i18n="ottawa.ongletContrats" class="${'contracts' === 'accueil' ? 'actif' : ''}">Contracts</a>
    <a href="/ottawa/budget" data-i18n="ottawa.ongletBudget" class="${'budget' === 'accueil' ? 'actif' : ''}">Budget &amp; taxes</a>
    <a href="/ottawa/near-me" data-i18n="ottawa.ongletPres" class="${'near-me' === 'accueil' ? 'actif' : ''}">Near me</a>
    <a href="/ottawa/lexicon" data-i18n="ottawa.ongletLexique" class="${'lexicon' === 'accueil' ? 'actif' : ''}">Lexicon</a>
    <a href="/ottawa/sources" data-i18n="ottawa.ongletSources" class="${'sources' === 'accueil' ? 'actif' : ''}">Sources</a>
  </nav>
  <div class="encadre" data-i18n-html="ottawa.introAccueil"><b>Unofficial, and new.</b> Everything here comes from what the City of Ottawa publishes: its minutes, its open data. Nothing is invented; every item links back to its source.</div>
  <section data-vue="ottawaAccueil"></section>`,
  },
  {
    fichier: 'ottawa/decisions.html',
    horsPlan: true, // verrou : noindex tant que la Ville d'Ottawa n'a pas répondu (guide DQ, étape 2)
    vue: 'ottawa',
    donnees: 'ottawa',
    titre: "Ottawa: what city council decided",
    description: "The last two months of Ottawa City Council and committee decisions, item by item, in plain language, with a link to the official minutes.",
    contenu: `  <p class="fil"><a href="/" data-i18n="ottawa.retour">← DossierOntario</a></p>
  <p class="sur-titre" data-i18n="ottawa.sur2">City of Ottawa · city council and standing committees</p>
  <h1 class="titre-vue" data-i18n="ottawa.titre">What Ottawa city council decided</h1>
  <nav class="sous-onglets" aria-label="Ottawa">
    <a href="/ottawa/" data-i18n="ottawa.ongletAccueil" class="${'accueil' === 'decisions' ? 'actif' : ''}">Overview</a>
    <a href="/ottawa/decisions" data-i18n="ottawa.ongletDecisions" class="${'decisions' === 'decisions' ? 'actif' : ''}">Decisions</a>
    <a href="/ottawa/council" data-i18n="ottawa.ongletConseil" class="${'council' === 'decisions' ? 'actif' : ''}">Council</a>
    <a href="/ottawa/contracts" data-i18n="ottawa.ongletContrats" class="${'contracts' === 'decisions' ? 'actif' : ''}">Contracts</a>
    <a href="/ottawa/budget" data-i18n="ottawa.ongletBudget" class="${'budget' === 'decisions' ? 'actif' : ''}">Budget &amp; taxes</a>
    <a href="/ottawa/near-me" data-i18n="ottawa.ongletPres" class="${'near-me' === 'decisions' ? 'actif' : ''}">Near me</a>
    <a href="/ottawa/lexicon" data-i18n="ottawa.ongletLexique" class="${'lexicon' === 'decisions' ? 'actif' : ''}">Lexicon</a>
    <a href="/ottawa/sources" data-i18n="ottawa.ongletSources" class="${'sources' === 'decisions' ? 'actif' : ''}">Sources</a>
  </nav>
  <div class="encadre" data-i18n-html="ottawa.intro"><b>Unofficial, and new.</b> The last two months of decisions of Ottawa City Council and its standing committees, read from the minutes the City publishes, one card per decision, with a plain-language summary written by AI. Every card links to the official minutes.</div>
  <section data-vue="ottawa"></section>`,
  },
  {
    fichier: 'ottawa/council.html',
    horsPlan: true, // verrou : noindex tant que la Ville d'Ottawa n'a pas répondu (guide DQ, étape 2)
    vue: 'ottawaConseil',
    donnees: 'ottawa-conseil ottawa-quartiers',
    titre: "Ottawa: city council and wards",
    description: "The mayor and the 24 ward councillors of Ottawa, their ward on the map, their attendance at council meetings, and how to reach them.",
    contenu: `  <p class="fil"><a href="/" data-i18n="ottawa.retour">← DossierOntario</a></p>
  <p class="sur-titre" data-i18n="ottawa.surConseil">City of Ottawa · 2022-2026 Term of Council</p>
  <h1 class="titre-vue" data-i18n="ottawa.titreConseil">Who sits on Ottawa city council</h1>
  <nav class="sous-onglets" aria-label="Ottawa">
    <a href="/ottawa/" data-i18n="ottawa.ongletAccueil" class="${'accueil' === 'council' ? 'actif' : ''}">Overview</a>
    <a href="/ottawa/decisions" data-i18n="ottawa.ongletDecisions" class="${'decisions' === 'council' ? 'actif' : ''}">Decisions</a>
    <a href="/ottawa/council" data-i18n="ottawa.ongletConseil" class="${'council' === 'council' ? 'actif' : ''}">Council</a>
    <a href="/ottawa/contracts" data-i18n="ottawa.ongletContrats" class="${'contracts' === 'council' ? 'actif' : ''}">Contracts</a>
    <a href="/ottawa/budget" data-i18n="ottawa.ongletBudget" class="${'budget' === 'council' ? 'actif' : ''}">Budget &amp; taxes</a>
    <a href="/ottawa/near-me" data-i18n="ottawa.ongletPres" class="${'near-me' === 'council' ? 'actif' : ''}">Near me</a>
    <a href="/ottawa/lexicon" data-i18n="ottawa.ongletLexique" class="${'lexicon' === 'council' ? 'actif' : ''}">Lexicon</a>
    <a href="/ottawa/sources" data-i18n="ottawa.ongletSources" class="${'sources' === 'council' ? 'actif' : ''}">Sources</a>
  </nav>
  <section data-vue="ottawaConseil"></section>`,
  },
  {
    fichier: 'ottawa/contracts.html',
    horsPlan: true, // verrou : noindex tant que la Ville d'Ottawa n'a pas répondu (guide DQ, étape 2)
    vue: 'ottawaContrats',
    donnees: 'ottawa-contrats',
    titre: "Ottawa: contracts of $25,000 and more",
    description: "Every contract of $25,000 or more awarded by City of Ottawa staff under delegated authority in 2025: supplier, department, amount, and why it was not competed when it was not.",
    contenu: `  <p class="fil"><a href="/" data-i18n="ottawa.retour">← DossierOntario</a></p>
  <p class="sur-titre" data-i18n="ottawa.surContrats">City of Ottawa · contracts awarded under delegated authority</p>
  <h1 class="titre-vue" data-i18n="ottawa.titreContrats">Who the City pays, and for what</h1>
  <nav class="sous-onglets" aria-label="Ottawa">
    <a href="/ottawa/" data-i18n="ottawa.ongletAccueil" class="${'accueil' === 'contracts' ? 'actif' : ''}">Overview</a>
    <a href="/ottawa/decisions" data-i18n="ottawa.ongletDecisions" class="${'decisions' === 'contracts' ? 'actif' : ''}">Decisions</a>
    <a href="/ottawa/council" data-i18n="ottawa.ongletConseil" class="${'council' === 'contracts' ? 'actif' : ''}">Council</a>
    <a href="/ottawa/contracts" data-i18n="ottawa.ongletContrats" class="${'contracts' === 'contracts' ? 'actif' : ''}">Contracts</a>
    <a href="/ottawa/budget" data-i18n="ottawa.ongletBudget" class="${'budget' === 'contracts' ? 'actif' : ''}">Budget &amp; taxes</a>
    <a href="/ottawa/near-me" data-i18n="ottawa.ongletPres" class="${'near-me' === 'contracts' ? 'actif' : ''}">Near me</a>
    <a href="/ottawa/lexicon" data-i18n="ottawa.ongletLexique" class="${'lexicon' === 'contracts' ? 'actif' : ''}">Lexicon</a>
    <a href="/ottawa/sources" data-i18n="ottawa.ongletSources" class="${'sources' === 'contracts' ? 'actif' : ''}">Sources</a>
  </nav>
  <section data-vue="ottawaContrats"></section>`,
  },
  {
    fichier: 'ottawa/budget.html',
    horsPlan: true, // verrou : noindex tant que la Ville d'Ottawa n'a pas répondu (guide DQ, étape 2)
    vue: 'ottawaBudget',
    donnees: 'ottawa-budget',
    titre: "Ottawa: budget and taxes",
    description: "Ottawa municipal taxes by ward from 2022 to 2026, the 2026 draft budget by committee, revenues, capital program, reserves and fees, from the City’s open data.",
    contenu: `  <p class="fil"><a href="/" data-i18n="ottawa.retour">← DossierOntario</a></p>
  <p class="sur-titre" data-i18n="ottawa.surBudget">City of Ottawa · taxes by ward and 2026 draft budget</p>
  <h1 class="titre-vue" data-i18n="ottawa.titreBudget">Where the money comes from, and where it goes</h1>
  <nav class="sous-onglets" aria-label="Ottawa">
    <a href="/ottawa/" data-i18n="ottawa.ongletAccueil" class="${'accueil' === 'budget' ? 'actif' : ''}">Overview</a>
    <a href="/ottawa/decisions" data-i18n="ottawa.ongletDecisions" class="${'decisions' === 'budget' ? 'actif' : ''}">Decisions</a>
    <a href="/ottawa/council" data-i18n="ottawa.ongletConseil" class="${'council' === 'budget' ? 'actif' : ''}">Council</a>
    <a href="/ottawa/contracts" data-i18n="ottawa.ongletContrats" class="${'contracts' === 'budget' ? 'actif' : ''}">Contracts</a>
    <a href="/ottawa/budget" data-i18n="ottawa.ongletBudget" class="${'budget' === 'budget' ? 'actif' : ''}">Budget &amp; taxes</a>
    <a href="/ottawa/near-me" data-i18n="ottawa.ongletPres" class="${'near-me' === 'budget' ? 'actif' : ''}">Near me</a>
    <a href="/ottawa/lexicon" data-i18n="ottawa.ongletLexique" class="${'lexicon' === 'budget' ? 'actif' : ''}">Lexicon</a>
    <a href="/ottawa/sources" data-i18n="ottawa.ongletSources" class="${'sources' === 'budget' ? 'actif' : ''}">Sources</a>
  </nav>
  <section data-vue="ottawaBudget"></section>`,
  },
  {
    fichier: 'ottawa/near-me.html',
    horsPlan: true, // verrou : noindex tant que la Ville d'Ottawa n'a pas répondu (guide DQ, étape 2)
    vue: 'ottawaPres',
    donnees: 'ottawa-conseil ottawa-quartiers ottawa-pres',
    titre: "Ottawa: near me",
    description: "Type an Ottawa street or postal code: your ward, your councillor, the parks, the upcoming construction and the building permits around you. Nothing is sent to a server.",
    contenu: `  <p class="fil"><a href="/" data-i18n="ottawa.retour">← DossierOntario</a></p>
  <p class="sur-titre" data-i18n="ottawa.surPres">City of Ottawa · your ward, your councillor, what is coming</p>
  <h1 class="titre-vue" data-i18n="ottawa.titrePres">Near me</h1>
  <nav class="sous-onglets" aria-label="Ottawa">
    <a href="/ottawa/" data-i18n="ottawa.ongletAccueil" class="${'accueil' === 'near-me' ? 'actif' : ''}">Overview</a>
    <a href="/ottawa/decisions" data-i18n="ottawa.ongletDecisions" class="${'decisions' === 'near-me' ? 'actif' : ''}">Decisions</a>
    <a href="/ottawa/council" data-i18n="ottawa.ongletConseil" class="${'council' === 'near-me' ? 'actif' : ''}">Council</a>
    <a href="/ottawa/contracts" data-i18n="ottawa.ongletContrats" class="${'contracts' === 'near-me' ? 'actif' : ''}">Contracts</a>
    <a href="/ottawa/budget" data-i18n="ottawa.ongletBudget" class="${'budget' === 'near-me' ? 'actif' : ''}">Budget &amp; taxes</a>
    <a href="/ottawa/near-me" data-i18n="ottawa.ongletPres" class="${'near-me' === 'near-me' ? 'actif' : ''}">Near me</a>
    <a href="/ottawa/lexicon" data-i18n="ottawa.ongletLexique" class="${'lexicon' === 'near-me' ? 'actif' : ''}">Lexicon</a>
    <a href="/ottawa/sources" data-i18n="ottawa.ongletSources" class="${'sources' === 'near-me' ? 'actif' : ''}">Sources</a>
  </nav>
  <section data-vue="ottawaPres"></section>`,
  },
  {
    fichier: 'ottawa/lexicon.html',
    horsPlan: true, // verrou : noindex tant que la Ville d'Ottawa n'a pas répondu (guide DQ, étape 2)
    vue: 'ottawaLexique',
    donnees: 'contenu:ottawa-lexique',
    titre: "Ottawa: municipal lexicon",
    description: "By-law, zoning amendment, recorded vote, bulk consent, delegation of authority: the words of Ottawa city council explained in plain language.",
    contenu: `  <p class="fil"><a href="/" data-i18n="ottawa.retour">← DossierOntario</a></p>
  <p class="sur-titre" data-i18n="ottawa.surLexique">City of Ottawa · the words of the council, explained</p>
  <h1 class="titre-vue" data-i18n="ottawa.titreLexique">Municipal lexicon</h1>
  <nav class="sous-onglets" aria-label="Ottawa">
    <a href="/ottawa/" data-i18n="ottawa.ongletAccueil" class="${'accueil' === 'lexicon' ? 'actif' : ''}">Overview</a>
    <a href="/ottawa/decisions" data-i18n="ottawa.ongletDecisions" class="${'decisions' === 'lexicon' ? 'actif' : ''}">Decisions</a>
    <a href="/ottawa/council" data-i18n="ottawa.ongletConseil" class="${'council' === 'lexicon' ? 'actif' : ''}">Council</a>
    <a href="/ottawa/contracts" data-i18n="ottawa.ongletContrats" class="${'contracts' === 'lexicon' ? 'actif' : ''}">Contracts</a>
    <a href="/ottawa/budget" data-i18n="ottawa.ongletBudget" class="${'budget' === 'lexicon' ? 'actif' : ''}">Budget &amp; taxes</a>
    <a href="/ottawa/near-me" data-i18n="ottawa.ongletPres" class="${'near-me' === 'lexicon' ? 'actif' : ''}">Near me</a>
    <a href="/ottawa/lexicon" data-i18n="ottawa.ongletLexique" class="${'lexicon' === 'lexicon' ? 'actif' : ''}">Lexicon</a>
    <a href="/ottawa/sources" data-i18n="ottawa.ongletSources" class="${'sources' === 'lexicon' ? 'actif' : ''}">Sources</a>
  </nav>
  <div class="encadre" data-i18n="ottawa.introLexique">Council words, explained in ordinary ones. These explanations are ours, not the City’s: we write them to be understood, not to be precise in the legal sense.</div>
  <section data-vue="ottawaLexique"></section>`,
  },
  {
    fichier: 'ottawa/sources.html',
    horsPlan: true, // verrou : noindex tant que la Ville d'Ottawa n'a pas répondu (guide DQ, étape 2)
    vue: 'ottawaSources',
    donnees: 'ottawa ottawa-conseil contenu:journal',
    titre: "Ottawa: sources",
    description: "Where every number on the Ottawa pages comes from, under which licence, what the City’s terms of use say, and what this site does not do.",
    contenu: `  <p class="fil"><a href="/" data-i18n="ottawa.retour">← DossierOntario</a></p>
  <p class="sur-titre" data-i18n="ottawa.surSources">City of Ottawa · where it all comes from</p>
  <h1 class="titre-vue" data-i18n="ottawa.titreSources">Sources and limits</h1>
  <nav class="sous-onglets" aria-label="Ottawa">
    <a href="/ottawa/" data-i18n="ottawa.ongletAccueil" class="${'accueil' === 'sources' ? 'actif' : ''}">Overview</a>
    <a href="/ottawa/decisions" data-i18n="ottawa.ongletDecisions" class="${'decisions' === 'sources' ? 'actif' : ''}">Decisions</a>
    <a href="/ottawa/council" data-i18n="ottawa.ongletConseil" class="${'council' === 'sources' ? 'actif' : ''}">Council</a>
    <a href="/ottawa/contracts" data-i18n="ottawa.ongletContrats" class="${'contracts' === 'sources' ? 'actif' : ''}">Contracts</a>
    <a href="/ottawa/budget" data-i18n="ottawa.ongletBudget" class="${'budget' === 'sources' ? 'actif' : ''}">Budget &amp; taxes</a>
    <a href="/ottawa/near-me" data-i18n="ottawa.ongletPres" class="${'near-me' === 'sources' ? 'actif' : ''}">Near me</a>
    <a href="/ottawa/lexicon" data-i18n="ottawa.ongletLexique" class="${'lexicon' === 'sources' ? 'actif' : ''}">Lexicon</a>
    <a href="/ottawa/sources" data-i18n="ottawa.ongletSources" class="${'sources' === 'sources' ? 'actif' : ''}">Sources</a>
  </nav>
  <section data-vue="ottawaSources"></section>`,
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
const adressePropre = (fichier) => (fichier === 'index.html' ? '' : fichier.replace(/index\.html$/, '').replace(/\.html$/, ''));

// Le commentaire de tête du modèle parle du modèle, pas des pages : il n'a rien à faire
// dans ce qu'on sert (et il y affirmerait « ce fichier n'est jamais servi », ce qui
// serait faux une fois recopié).
const modele = readFileSync(MODELE, 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/<!-- MODÈLE[\s\S]*?-->\n/, '');

mkdirSync('ottawa', { recursive: true });
for (const page of PAGES) {
  // Le volet Ottawa a ses propres pages (copiées du modèle de Vancouver, 15 nov. 2026) : on ne les écrase pas.
  if (page.fichier.startsWith('ottawa/')) continue;
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

  // Les pages d'Ottawa, comme les volets de ville de DQ : la barre de la ville remplace celle de la
  // province (pas d'onglets de l'Assemblée, pas de bande des chiffres de l'Assemblée). Les huit
  // onglets du volet montent dans l'en-tête, à la place de la sous-navigation dans la page.
  if (page.fichier.startsWith('ottawa/')) {
    const sous = html.match(/  <nav class="sous-onglets"[\s\S]*?<\/nav>\n/);
    if (sous) {
      const liens = sous[0].replace(/^  <nav class="sous-onglets" aria-label="Ottawa">\n/, '').replace(/  <\/nav>\n$/, '');
      // L'onglet Sources quitte la barre : le lien est au pied de page, comme sur DQ (Martin, 15 nov. 2026).
      const liensSansSources = liens.replace(/    <a href="\/ottawa\/sources"[^\n]*\n/, '');
      html = html.replace(sous[0], '')
        .replace(/<nav class="onglets" aria-label="Sections">[\s\S]*?<\/nav>/, `<nav class="onglets onglets-ville" aria-label="Ottawa">\n${liensSansSources}    </nav>`);
    }
    // Pas de bande rouge (« Gratuit. Sans publicité. » et la mission sur ola.org) ni de pied de page
    // à colonnes : le pied des pages de ville de DQ, une phrase et une ligne de liens (Martin, 15 nov. 2026).
    html = html
      .replace(/<!-- La bande rouge de fin[\s\S]*?<\/section>\n/, '')
      .replace(/<footer class="pied">[\s\S]*?<\/footer>/, `<footer class="pied pied-ville">
  <div class="colonne">
    <p data-i18n-html="ottawa.piedTexte">Independent citizen site. No connection with the City of Ottawa, no official status. If anything differs, the City's original document prevails. <a href="/ottawa/sources">Sources</a>.</p>
    <p class="pied-ville-liens" data-i18n-html="ottawa.piedLiens"><a href="/">DossierOntario: the Legislative Assembly in plain language</a> · <a href="/rules">The rules of the site</a> · <a href="/ottawa/sources">Sources</a> · <a href="https://ottawa.ca/en" target="_blank" rel="noopener">City of Ottawa site ↗</a> · A project by <a href="https://www.dafrsolution.com/en" target="_blank" rel="noopener">DAFR Solution</a></p>
  </div>
</footer>`);
    html = html.replace(/<div class="ticker"[^>]*>.*?<\/div><\/div>\n/, '');
    // Le logo devient celui de la ville (DQ : « DossierVilleDeLaval ») ; la feuille d'érable mène à
    // DossierOntario, comme le petit lien vers DQ sur les pages de ville de DQ. Pas de fil « ← DossierOntario ».
    html = html
      .replace(/<a class="mot-symbole" href="\/">[\s\S]*?<\/a>/, '<a class="mot-symbole" href="/ottawa/">Dossier<span class="province">VilleDOttawa</span></a>')
      .replace(/<a class="erable" href="https:\/\/dossiercanada\.ca\/"[^>]*>/, '<a class="erable" href="/" title="DossierOntario" aria-label="DossierOntario">')
      .replace(/  <p class="fil"><a href="\/" data-i18n="ottawa\.retour">[^<]*<\/a><\/p>\n/, '');
  }
  if (page.fichier.startsWith('ottawa/')) {
    html = html
      .replace('https://dossierontario.ca/partage.png', 'https://dossierontario.ca/ottawa/og-ottawa.png')
      .replace(/<meta property="og:image:alt" content="[^"]*">/, '<meta property="og:image:alt" content="DossierVilleDOttawa: Ottawa, decision by decision">');
  }
  if (page.horsPlan) {
    html = html.replace(/<link rel="canonical"[^>]*>\n/, '<meta name="robots" content="noindex">\n').replace(/<link rel="alternate"[^>]*>\n/, '');
  }
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

// ---------------------------------------------------------------- une page par ministre
// /minister/<identifiant> (11 nov. 2026), même mécanique que DossierQuébec : fonctions,
// parti, circonscription, projets de loi parrainés, présence aux votes, coordonnées,
// Person en données structurées, sitemap. Texte anglais par défaut, français basculé par
// html[lang] (.fr-txt / .en-txt, commun/on.css).
// Réseaux sociaux : data/site/ministresReseaux.json, relevés sur une source officielle
// seulement : le site de circonscription du ministre (11 nov. 2026). Source de chaque lien
// dans ministresReseaux-sources.json. Rien n'est deviné : un nom affiché sans lien ne compte pas.
// Pas de photo : les portraits d'ola.org ne sont pas sous licence ouverte.
const deux = (en, fr) => `<span class="en-txt">${en}</span><span class="fr-txt">${fr}</span>`;
const ICONES_RESEAUX = {
  Facebook: 'f', X: 'X', Instagram: 'IG', LinkedIn: 'in', YouTube: 'YT', TikTok: 'TT',
};
const nomReseau = (u) => [[/\/\/x\.com|twitter/, 'X'], [/facebook/, 'Facebook'], [/instagram/, 'Instagram'], [/linkedin/, 'LinkedIn'], [/youtube/, 'YouTube'], [/tiktok/, 'TikTok']].find(([r]) => r.test(u))?.[1] || 'Web';
// Sans identifiant ola.org (la secrétaire du Conseil, fonctionnaire hors Assemblée) : pas de fiche.
const ministresOn = (JSON.parse(readFileSync('data/ministers.json', 'utf8')).ministres ?? []).filter((m) => m.identifiant);
const deputesOn = JSON.parse(readFileSync('data/site/members.json', 'utf8')).deputes ?? [];
const chefsOn = existsSync('data/site/chefs.json') ? JSON.parse(readFileSync('data/site/chefs.json', 'utf8')) : { chefs: [], gouvernement: {} };
const reseauxOn = existsSync('data/site/ministresReseaux.json') ? JSON.parse(readFileSync('data/site/ministresReseaux.json', 'utf8')) : {};
const sansHon = (s) => String(s).replace(/\bHon\.\s*/g, '').trim();
const normNom = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
// « Ford, Hon. Doug » → « dougford »
const parrainNorme = (p) => { const [nom, prenom] = sansHon(p).split(','); return normNom(`${prenom ?? ''}${nom}`); };
mkdirSync('minister', { recursive: true });
for (const vieux of readdirSync('minister')) if (vieux.endsWith('.html')) unlinkSync(`minister/${vieux}`);
const PAGES_MINISTRES = [];
for (const m of ministresOn) {
  const d = deputesOn.find((x) => x.identifiant === m.identifiant) ?? {};
  const fichier = `minister/${m.identifiant}.html`;
  const url = `https://dossierontario.ca/${adressePropre(fichier)}`;
  const projets = projetsSite.filter((p) => (p.parrains ?? []).some((x) => parrainNorme(x) === normNom(m.nom)));
  const res = reseauxOn[m.identifiant] ?? [];
  const presence = d.votesTenus ? `${Math.round((d.votesExprimes / d.votesTenus) * 100)}% (${d.votesExprimes}/${d.votesTenus})` : null;
  const titreEn = m.titreEn.split(';')[0];
  const titre = `${m.nom}, ${titreEn.length + m.nom.length > 50 ? 'Ontario minister' : titreEn}`;
  const description = `${m.nom}${d.circonscription ? ` (${d.circonscription})` : ''}: ${m.titreEn}. Bills sponsored, voting attendance and official contact details.`.slice(0, 300);
  const ligne = (en, fr, valeur) => `<div><dt>${deux(en, fr)}</dt><dd>${valeur}</dd></div>`;
  const contenu = `  <p class="fil"><a href="/mpps#cabinet">${deux('← MPPs and cabinet', '← Député·e·s et Conseil des ministres')}</a></p>
  <h1 class="titre-vue">${echapperHtml(m.nom)}</h1>
  <section data-vue="ministre" class="min-fiche">
    <article class="carte">
      <p class="depute-role">${deux(echapperHtml(m.titreEn), echapperHtml(m.titreFr))}</p>
      ${chefsOn.gouvernement?.[m.identifiant] ? `<p class="depute-role">${deux(echapperHtml(chefsOn.gouvernement[m.identifiant].roleEn), echapperHtml(chefsOn.gouvernement[m.identifiant].roleFr))}</p>` : ''}
      ${res.length ? `<p class="min-reseaux">${res.map((u) => `<a href="${echapperHtml(u)}" target="_blank" rel="noopener" title="${nomReseau(u)}" aria-label="${nomReseau(u)}">${ICONES_RESEAUX[nomReseau(u)] ?? nomReseau(u)}</a>`).join('')}</p>` : ''}
      <dl class="depute-faits">
        ${d.parti ? ligne('Party', 'Parti', deux(echapperHtml(d.parti), echapperHtml(d.partiFr ?? d.parti))) : ''}
        ${d.circonscription ? ligne('Riding', 'Circonscription', deux(echapperHtml(d.circonscription), echapperHtml(d.circonscriptionFr ?? d.circonscription))) : ''}
        ${presence ? ligne('Recorded-vote attendance', 'Présence aux votes nominaux', echapperHtml(presence)) : ''}
      </dl>
      <h2 class="titre-case">${deux('Bills sponsored', 'Projets de loi parrainés')}</h2>
      ${projets.length ? `<ul class="min-liste">${projets.map((p) => `<li><a href="/bill/${slug(p.numero)}">${deux(`Bill ${echapperHtml(p.numero)}`, `Projet de loi ${echapperHtml(p.numero)}`)}</a> — ${deux(echapperHtml(p.titreEn), echapperHtml(p.titreFr ?? p.titreEn))}</li>`).join('')}</ul>` : `<p>${deux('No bill sponsored in this session.', 'Aucun projet de loi parrainé pendant cette session.')}</p>`}
      <h2 class="titre-case">${deux('Official links', 'Liens officiels')}</h2>
      <ul class="min-liste">
        <li><a href="${echapperHtml(m.url)}" rel="noopener">${deux('Profile on ola.org', 'Fiche sur ola.org')}</a></li>
        ${d.courriel ? `<li><a href="mailto:${echapperHtml(d.courriel)}">${echapperHtml(d.courriel)}</a></li>` : ''}
      </ul>
    </article>
  </section>`;
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Person', name: m.nom, url, jobTitle: m.titreEn, ...(d.parti ? { affiliation: { '@type': 'PoliticalParty', name: d.parti } } : {}), sameAs: [m.url, ...res] },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'DossierOntario', item: 'https://dossierontario.ca/' },
      { '@type': 'ListItem', position: 2, name: 'MPPs and cabinet', item: 'https://dossierontario.ca/mpps' },
      { '@type': 'ListItem', position: 3, name: m.nom, item: url } ] } ] };
  PAGES_MINISTRES.push({ fichier, titre, description, contenu, ld });
}
for (const page of PAGES_MINISTRES) {
  const html = modele
    .replace(/\{\{TITRE\}\}/g, () => echapperHtml(page.titre))
    .replace(/\{\{DESCRIPTION\}\}/g, () => echapperHtml(page.description))
    .replace(/\{\{FICHIER\}\}/g, adressePropre(page.fichier))
    .replace(/\{\{VUE\}\}/g, 'ministre')
    .replace(/\{\{DONNEES\}\}/g, 'apercu')
    .replace(/\{\{BANDES\}\}/g, '')
    .replace(/\{\{BANDES_BAS\}\}/g, '')
    .replace(/\{\{CONTENU\}\}/g, () => page.contenu)
    .replace(/(href|src)="\/(commun\/on\.(?:css|js))"/g, (_, attr, chemin) => `${attr}="/${chemin}?v=${VERSIONS[chemin]}"`)
    .replace(/\{\{ACTIF_deputes\}\}/g, 'actif')
    .replace(/\{\{ACTIF_[a-z]+\}\}/g, '')
    .replace('</head>', () => `<script type="application/ld+json">\n${JSON.stringify(page.ld, null, 2).replace(/</g, '\\u003c')}\n</script>\n</head>`);
  writeFileSync(page.fichier, html);
}
console.log(`${PAGES_MINISTRES.length} pages de ministres dans minister/`);

// ---------------------------------------------------------------- une page par chef de parti
// /leader/<identifiant> (11 nov. 2026) : chef·fe·s des partis d'opposition (data/site/chefs.json,
// source de la fonction et des réseaux notée). Même fiche que celle d'un ministre.
mkdirSync('leader', { recursive: true });
for (const vieux of readdirSync('leader')) if (vieux.endsWith('.html')) unlinkSync(`leader/${vieux}`);
const PAGES_CHEFS = [];
for (const c of chefsOn.chefs ?? []) {
  const d = deputesOn.find((x) => x.identifiant === c.identifiant);
  if (!d) continue;
  const fichier = `leader/${c.identifiant}.html`;
  const url = `https://dossierontario.ca/${adressePropre(fichier)}`;
  const nom = d.nom.replace(/^Hon\.\s+/, '');
  const projets = projetsSite.filter((p) => (p.parrains ?? []).some((x) => parrainNorme(x) === normNom(nom)));
  const presence = d.votesTenus ? `${Math.round((d.votesExprimes / d.votesTenus) * 100)}% (${d.votesExprimes}/${d.votesTenus})` : null;
  const res = c.reseaux ?? [];
  const ligne = (en, fr, valeur) => `<div><dt>${deux(en, fr)}</dt><dd>${valeur}</dd></div>`;
  const contenu = `  <p class="fil"><a href="/mpps">${deux('← MPPs and cabinet', '← Député·e·s et Conseil des ministres')}</a></p>
  <h1 class="titre-vue">${echapperHtml(nom)}</h1>
  <section data-vue="chef" class="min-fiche">
    <article class="carte">
      <p class="depute-role">${deux(echapperHtml(c.roleEn), echapperHtml(c.roleFr))}</p>
      ${res.length ? `<p class="min-reseaux">${res.map((u) => `<a href="${echapperHtml(u)}" target="_blank" rel="noopener" title="${nomReseau(u)}" aria-label="${nomReseau(u)}">${ICONES_RESEAUX[nomReseau(u)] ?? nomReseau(u)}</a>`).join('')}</p>` : ''}
      <dl class="depute-faits">
        ${ligne('Party', 'Parti', deux(echapperHtml(d.parti), echapperHtml(d.partiFr ?? d.parti)))}
        ${ligne('Riding', 'Circonscription', deux(echapperHtml(d.circonscription), echapperHtml(d.circonscriptionFr ?? d.circonscription)))}
        ${presence ? ligne('Recorded-vote attendance', 'Présence aux votes nominaux', echapperHtml(presence)) : ''}
      </dl>
      <h2 class="titre-case">${deux('Bills sponsored', 'Projets de loi parrainés')}</h2>
      ${projets.length ? `<ul class="min-liste">${projets.map((p) => `<li><a href="/bill/${slug(p.numero)}">${deux(`Bill ${echapperHtml(p.numero)}`, `Projet de loi ${echapperHtml(p.numero)}`)}</a> — ${deux(echapperHtml(p.titreEn), echapperHtml(p.titreFr ?? p.titreEn))}</li>`).join('')}</ul>` : `<p>${deux('No bill sponsored in this session.', 'Aucun projet de loi parrainé pendant cette session.')}</p>`}
      <h2 class="titre-case">${deux('Official links', 'Liens officiels')}</h2>
      <ul class="min-liste">
        <li><a href="${echapperHtml(d.url)}" rel="noopener">${deux('Profile on ola.org', 'Fiche sur ola.org')}</a></li>
        <li><a href="${echapperHtml(c.source)}" rel="noopener">${deux('Party page', 'Page du parti')}</a></li>
        ${d.courriel ? `<li><a href="mailto:${echapperHtml(d.courriel)}">${echapperHtml(d.courriel)}</a></li>` : ''}
      </ul>
    </article>
  </section>`;
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Person', name: nom, url, jobTitle: c.roleEn, affiliation: { '@type': 'PoliticalParty', name: d.parti }, sameAs: [d.url, ...res] },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'DossierOntario', item: 'https://dossierontario.ca/' },
      { '@type': 'ListItem', position: 2, name: 'MPPs and cabinet', item: 'https://dossierontario.ca/mpps' },
      { '@type': 'ListItem', position: 3, name: nom, item: url } ] } ] };
  PAGES_CHEFS.push({ fichier, titre: `${nom}, ${c.roleEn.length + nom.length > 50 ? 'party leader' : c.roleEn}`, description: `${nom} (${d.circonscription}): ${c.roleEn}. Bills sponsored, voting attendance, official links and social media.`, contenu, ld });
}
for (const page of PAGES_CHEFS) {
  const html = modele
    .replace(/\{\{TITRE\}\}/g, () => echapperHtml(page.titre))
    .replace(/\{\{DESCRIPTION\}\}/g, () => echapperHtml(page.description))
    .replace(/\{\{FICHIER\}\}/g, adressePropre(page.fichier))
    .replace(/\{\{VUE\}\}/g, 'chef')
    .replace(/\{\{DONNEES\}\}/g, 'apercu')
    .replace(/\{\{BANDES\}\}/g, '')
    .replace(/\{\{BANDES_BAS\}\}/g, '')
    .replace(/\{\{CONTENU\}\}/g, () => page.contenu)
    .replace(/(href|src)="\/(commun\/on\.(?:css|js))"/g, (_, attr, chemin) => `${attr}="/${chemin}?v=${VERSIONS[chemin]}"`)
    .replace(/\{\{ACTIF_deputes\}\}/g, 'actif')
    .replace(/\{\{ACTIF_[a-z]+\}\}/g, '')
    .replace('</head>', () => `<script type="application/ld+json">\n${JSON.stringify(page.ld, null, 2).replace(/</g, '\\u003c')}\n</script>\n</head>`);
  writeFileSync(page.fichier, html);
}
console.log(`${PAGES_CHEFS.length} pages de chefs dans leader/`);

// Les pages d'Ottawa (indexées sur décision de Martin, 16 nov. 2026).
function fs_ottawa() { return readdirSync('ottawa').filter((f) => f.endsWith('.html')).map((f) => ({ fichier: 'ottawa/' + f })); }
// Le plan du site, pour que Google trouve les six pages (leçon de DossierQuébec).
const plan = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...PAGES.filter((p) => !p.horsPlan), ...PAGES_PROJETS, ...PAGES_MINISTRES, ...PAGES_CHEFS, ...fs_ottawa()].map(
  (p) => `  <url><loc>https://dossierontario.ca/${adressePropre(p.fichier)}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`
).join('\n')}
</urlset>
`;
writeFileSync('sitemap.xml', plan);
console.log('sitemap.xml');

// /llms.txt : le site expliqué aux assistants IA, avec les nombres du jour (scripts/build-llms.js).
// En dernier : il vérifie que chaque page qu'il annonce existe, donc après leur fabrication.
const { construireLlms } = await import('./build-llms.js');
construireLlms();
