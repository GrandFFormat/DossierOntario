// Scraper — les comités permanents
//
// Ce que ce scraper récolte : le nom officiel de chaque comité, son adresse, et la liste
// de ses transcriptions (une par jour de séance du comité).
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
    // Les comités de surveillance (comptes publics, organismes gouvernementaux, procédure)
    // n'ont jamais de projet de loi renvoyé : leur nom français n'est donc nulle part dans
    // nos fiches. On va le chercher sur leur propre page française, que la page anglaise
    // désigne elle-même par sa balise hreflang. Bilingue partout, sans exception.
    let nomFr = fr.get(c.nom) ?? null;
    if (!nomFr) {
      try {
        const $ = cheerio.load(await lirePage(c.url));
        const urlFr = $('link[hreflang="fr"]').attr('href');
        if (urlFr) {
          const $fr = cheerio.load(await lirePage(urlFr));
          nomFr = texte($fr('h1').first().html() ?? '') || null;
        }
      } catch (err) {
        console.warn(`  (nom français de ${cle} : ${err.message})`);
      }
    }

    comites.push({
      cle,
      nomEn: c.nom,
      nomFr,
      url: c.url,
      transcriptions,
    });
    console.log(`  ${cle} : ${transcriptions.length} transcriptions`);
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
  const sansFr = comites.filter((c) => !c.nomFr).map((c) => c.cle);
  if (sansFr.length) {
    console.log(`  sans nom français (aucun projet de loi ne leur a été renvoyé) : ${sansFr.join(', ')}`);
  }
}

main().catch((err) => {
  console.error('Échec du scraper comites.js :', err.message);
  process.exitCode = 1;
});
