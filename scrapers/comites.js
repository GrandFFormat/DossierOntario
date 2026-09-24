// Scraper — les comités permanents
//
// Ce que ce scraper récolte : le nom officiel de chaque comité (dans les deux langues),
// son MANDAT officiel, sa COMPOSITION, et la liste de ses transcriptions.
//
// Ce qu'il ne récolte PAS, et pourquoi : les votes tenus en comité. Ils existent — 359
// sur 96 transcriptions, soit trois fois plus que les 115 votes de la Chambre —, mais ils
// ne sont publiés que dans la prose des transcriptions, sous la forme « Recorded vote.
// Ayes Shaw. Nays Cuzzetto, Dowie… » : des noms de famille au fil du texte, sans page ni
// liste. Les lire demande un analyseur et son propre vérificateur. C'est un chantier à
// part, pas un effet de bord de celui-ci.
//
// À savoir aussi : environ 15 % seulement des décisions de comité passent par un vote
// nominatif (359 sur ~2 350). Le reste se décide à la voix, sans aucun nom. Toute page
// qui montrera ces votes devra le dire.
//
// Usage : node scrapers/comites.js

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import * as cheerio from 'cheerio';
import { lirePage, texte, ADRESSE, LEGISLATURE, SESSION } from './ola.js';

const INDEX = `${ADRESSE.base}/en/legislative-business/committees`;
const OUT_PATH = 'data/comites.json';
const MAX_MANDAT = 1200;

const MOIS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

const MOTIF_COMITE = new RegExp(`/([a-z-]+)/(?:parliament|legislature)-${LEGISLATURE}/?$`);

/** Les comités de la législature en cours, avec leur nom et leur adresse. */
function lireIndex(html) {
  const $ = cheerio.load(html);
  const comites = new Map();

  $('a').each((_, a) => {
    const href = $(a).attr('href') ?? '';
    if (!href.includes('/committees/')) return;
    const trouve = MOTIF_COMITE.exec(href);
    if (!trouve) return;
    const nom = texte($(a).html() ?? '');
    if (!nom || nom.length > 120) return;
    comites.set(trouve[1], { cle: trouve[1], nom, url: new URL(href, ADRESSE.base).href });
  });

  return comites;
}

/**
 * Le nom français de chaque comité.
 *
 * Il ne vient PAS de l'index français : ses adresses ont leurs propres mots-clés
 * (« affaires-interieures » là où l'anglais dit « interior »), et apparier deux listes
 * par leur ordre serait un pari. Il vient des fiches de projets de loi, où chaque ligne
 * d'étape porte déjà le nom du comité dans les deux langues, côte à côte.
 */
function nomsFrancais() {
  if (!existsSync('data/bill-details.json')) return new Map();
  const details = JSON.parse(readFileSync('data/bill-details.json', 'utf-8'));
  const paires = new Map();
  for (const fiche of Object.values(details.fiches ?? {})) {
    for (const etape of fiche.etapes ?? []) {
      if (etape.comite && etape.comiteFr) paires.set(etape.comite, etape.comiteFr);
    }
  }
  return paires;
}

/**
 * Les onglets d'une page de comité (Business, Members, …, Mandate) sont des boutons
 * « role=tab », dans le même ordre que leurs contenus. On repère donc un onglet par son
 * NOM plutôt que par sa position : l'Assemblée peut en ajouter un sans nous casser.
 */
function ongletParNom($, noms) {
  const etiquettes = $('button[role="tab"]')
    .map((_, b) => texte($(b).html() ?? ''))
    .get();

  const i = etiquettes.findIndex((t) => noms.some((n) => t.toLowerCase() === n.toLowerCase()));
  return i < 0 ? null : $('.lao-tab-content').eq(i);
}

/** Le mandat officiel : ce que la Chambre charge ce comité de faire. */
function lireMandat($) {
  const onglet = ongletParNom($, ['Mandate', 'Mandat']);
  if (!onglet || !onglet.length) return null;
  const t = texte(onglet.html() ?? '');
  if (t.length <= 40) return null;
  return t.length > MAX_MANDAT ? `${t.slice(0, MAX_MANDAT)}…` : t;
}

/** La composition : présidence, vice-présidences et membres, avec leur rôle. */
function lireMembres($) {
  const onglet = ongletParNom($, ['Members', 'Membres']);
  if (!onglet || !onglet.length) return [];

  const membres = [];
  let role = null;

  onglet.find('h2, h3, h4, h5, a').each((_, el) => {
    const $el = $(el);
    const balise = (el.tagName ?? '').toLowerCase();

    if (balise !== 'a') {
      role = texte($el.html() ?? '') || role;
      return;
    }
    const href = $el.attr('href') ?? '';
    if (!href.includes('/members/all/')) return;
    const nom = texte($el.html() ?? '');
    if (!nom) return;
    membres.push({ identifiant: href.split('/').pop(), nom, role });
  });

  return [...new Map(membres.map((m) => [m.identifiant, m])).values()];
}

/** Les transcriptions d'un comité : une par jour de séance. */
async function lireTranscriptions(urlComite) {
  const $ = cheerio.load(await lirePage(`${urlComite}/transcripts`));
  const transcriptions = [];

  $('a[href*="/transcripts/"]').each((_, a) => {
    const href = $(a).attr('href') ?? '';
    if (!/\/transcripts\/[^/]+$/.test(href)) return;
    const jour = /(\d{4})-([a-z]{3})-(\d{2})/i.exec(href);
    transcriptions.push({
      date: jour && MOIS[jour[2].toLowerCase()] ? `${jour[1]}-${MOIS[jour[2].toLowerCase()]}-${jour[3]}` : null,
      libelle: texte($(a).html() ?? '') || null,
      url: new URL(href, ADRESSE.base).href,
    });
  });

  return [...new Map(transcriptions.map((t) => [t.url, t])).values()].sort((a, b) =>
    (b.date ?? '').localeCompare(a.date ?? '')
  );
}

async function main() {
  const index = lireIndex(await lirePage(INDEX));
  if (!index.size) throw new Error("Aucun comité lu — l'index a changé de forme ?");
  const fr = nomsFrancais();

  const comites = [];
  for (const [cle, c] of index) {
    let transcriptions = [];
    try {
      transcriptions = await lireTranscriptions(c.url);
    } catch (err) {
      console.warn(`  (transcriptions de ${cle} : ${err.message})`);
    }

    // La page du comité porte son mandat officiel et sa composition — les deux choses qui
    // répondent à « il sert à quoi, celui-là ? ».
    let nomFr = fr.get(c.nom) ?? null;
    let mandatEn = null;
    let mandatFr = null;
    let membres = [];
    let urlFr = null;

    try {
      const $ = cheerio.load(await lirePage(c.url));
      mandatEn = lireMandat($);
      membres = lireMembres($);
      urlFr = $('link[hreflang="fr"]').attr('href') ?? null;

      if (urlFr) {
        const $fr = cheerio.load(await lirePage(urlFr));
        mandatFr = lireMandat($fr);
        if (!nomFr) nomFr = texte($fr('h1').first().html() ?? '') || null;
      }
    } catch (err) {
      console.warn(`  (page de ${cle} : ${err.message})`);
    }

    comites.push({ cle, nomEn: c.nom, nomFr, url: c.url, urlFr, mandatEn, mandatFr, membres, transcriptions });
    console.log(
      `  ${cle} : ${transcriptions.length} transcriptions, ${membres.length} membres,` +
        ` mandat ${mandatEn ? 'lu' : 'ABSENT'}${mandatFr ? ' (FR ok)' : ''}`
    );
  }

  mkdirSync('data', { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        source: INDEX,
        legislature: LEGISLATURE,
        session: SESSION,
        lus: new Date().toISOString(),
        nombre: comites.length,
        comites,
      },
      null,
      2
    )
  );

  const total = comites.reduce((n, c) => n + c.transcriptions.length, 0);
  console.log(`${comites.length} comités écrits dans ${OUT_PATH} (${total} transcriptions).`);
}

main().catch((err) => {
  console.error('Échec du scraper comites.js :', err.message);
  process.exitCode = 1;
});
