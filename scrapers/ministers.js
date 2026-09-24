// Scraper — le Conseil des ministres, en anglais ET en français
//
// Deux sources, complémentaires :
//
//   1. ola.org, /en/members/current/ministers (et sa version française) : qui est
//      ministre, avec le lien vers sa fiche de député·e. C'est ce lien qui permet de
//      joindre un ministre à la liste des 124 (scrapers/members.js).
//
//   2. data.ontario.ca, jeu de données « Government official names » (ONTERM) : les
//      titres OFFICIELS, publiés par le gouvernement dans les deux langues
//      (« Minister of Health » / « ministre de la Santé »). Licence du gouvernement
//      ouvert – Ontario. Sans cette source, il faudrait traduire nous-mêmes des titres
//      officiels, ce qui est exactement le genre d'invention que le projet s'interdit.
//
// Deux règles imposées par data.ontario.ca, respectées ici :
//   - son robots.txt interdit /api/ : on ne touche pas à l'API CKAN, on lit la page du
//     jeu de données comme un lecteur ;
//   - son robots.txt demande un Crawl-Delay de 10 secondes : on l'applique.
//
// Piège : le nom du fichier CSV change à chaque mise à jour (il porte la date, par ex.
// « …-2026-09-10-fr-utf8-… »). On ne peut donc PAS coder l'adresse en dur : on relit la
// page du jeu de données pour retrouver le fichier courant.

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import * as cheerio from 'cheerio';
import { parse } from 'csv-parse/sync';
import { lirePage, texte, cleNom, ADRESSE, LEGISLATURE, SESSION } from './ola.js';

const URL_OLA_EN = `${ADRESSE.base}/en/members/current/ministers`;
const URL_OLA_FR = `${ADRESSE.base}/fr/deputes/actuels/ministres`;
const URL_JEU = 'https://data.ontario.ca/dataset/government-official-names';
const OUT_PATH = 'data/ministers.json';

const UA_ONTARIO =
  'dossierontario-scraper/0.1 (projet citoyen independant, usage non commercial; +https://dossierontario.ca)';
const CRAWL_DELAY_MS = 10000; // data.ontario.ca : « Crawl-Delay: 10 »

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function lireOntarioCa(url) {
  if (new URL(url).search) throw new Error(`Adresse avec paramètres refusée : ${url}`);
  if (new URL(url).pathname.startsWith('/api/')) {
    throw new Error(`robots.txt de data.ontario.ca : « Disallow: /api/ » — ${url}`);
  }
  const res = await fetch(url, { headers: { 'User-Agent': UA_ONTARIO } });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  const contenu = await res.text();
  await dormir(CRAWL_DELAY_MS);
  return contenu;
}

/** Retrouve les quatre CSV courants (ministres et adjoint·e·s, EN et FR). */
function trouverFichiers(html) {
  const adresses = new Set();
  for (const m of html.matchAll(/https:\/\/data\.ontario\.ca\/dataset\/[^"']*?\/download\/[^"']+\.csv/gi)) {
    adresses.add(m[0].replace(/&amp;/g, '&'));
  }

  const trouve = (motif, langue) =>
    [...adresses].find((u) => motif.test(u) && new RegExp(`[-_]${langue}[-_.]`, 'i').test(u)) ?? null;

  const fichiers = {
    ministresEn: trouve(/minister-list/i, 'en'),
    ministresFr: trouve(/minister-list/i, 'fr'),
    adjointsEn: trouve(/parliamentary-assistants/i, 'en'),
    adjointsFr: trouve(/parliamentary-assistants/i, 'fr'),
  };

  const manquants = Object.entries(fichiers).filter(([, v]) => !v).map(([k]) => k);
  if (manquants.length) {
    throw new Error(
      `Fichiers ONTERM introuvables sur ${URL_JEU} : ${manquants.join(', ')}. ` +
        `La page a peut-être changé de forme — vérifier à la main avant de corriger le motif.`
    );
  }
  return fichiers;
}

/** Les champs d'ONTERM contiennent du HTML (<span lang="fr">…</span>). */
function nettoyer(valeur) {
  return texte(valeur ?? '')
    .replace(/^The Honourable\s*\/\s*/i, '')
    .replace(/^L[’']honorable\s*/i, '')
    .trim();
}

function lireOnterm(csv) {
  const lignes = parse(csv, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true });
  return lignes
    .map((l) => {
      const colonnes = Object.keys(l);
      const nom = nettoyer(l[colonnes[0]]);
      const titreEn = nettoyer(l[colonnes[1]]);
      const titreFr = nettoyer(l[colonnes[2]]);
      return { nom, titreEn: titreEn || null, titreFr: titreFr || null };
    })
    .filter((m) => m.nom);
}

/** La page d'ola.org : une ligne par portefeuille, avec le lien vers la fiche. */
function lireTableauOla(html) {
  const $ = cheerio.load(html);
  const lignes = [];
  $('table tbody tr').each((_, tr) => {
    const cellules = $(tr).find('td');
    if (cellules.length < 2) return;
    const lien = $(cellules[0]).find('a').attr('href') ?? null;
    lignes.push({
      nomAffiche: texte($(cellules[0]).html() ?? ''),
      identifiant: lien ? lien.split('/').pop() : null,
      portefeuille: texte($(cellules[1]).html() ?? ''),
      url: lien ? new URL(lien, ADRESSE.base).href : null,
    });
  });
  return lignes;
}

async function main() {
  const olaEn = lireTableauOla(await lirePage(URL_OLA_EN));
  let olaFr = [];
  try {
    olaFr = lireTableauOla(await lirePage(URL_OLA_FR));
  } catch (err) {
    console.warn(`Page française des ministres indisponible (${err.message}) — on continue avec ONTERM.`);
  }

  const pageJeu = await lireOntarioCa(URL_JEU);
  const fichiers = trouverFichiers(pageJeu);

  const ministresOnterm = lireOnterm(await lireOntarioCa(fichiers.ministresEn));
  const ministresOntermFr = lireOnterm(await lireOntarioCa(fichiers.ministresFr));
  const adjoints = lireOnterm(await lireOntarioCa(fichiers.adjointsEn));

  // ONTERM publie déjà les deux titres dans chaque fichier ; on lit quand même le
  // fichier français, et on signale tout écart plutôt que de choisir en silence.
  const ecarts = [];
  const parNom = new Map(ministresOnterm.map((m) => [cleNom(m.nom), m]));
  for (const m of ministresOntermFr) {
    const jumeau = parNom.get(cleNom(m.nom));
    if (jumeau && m.titreFr && jumeau.titreFr && m.titreFr !== jumeau.titreFr) {
      ecarts.push({ nom: m.nom, en: jumeau.titreFr, fr: m.titreFr });
    }
  }

  const parPortefeuilleOla = new Map();
  for (const ligne of olaEn) {
    const cle = cleNom(ligne.nomAffiche);
    if (!parPortefeuilleOla.has(cle)) parPortefeuilleOla.set(cle, []);
    parPortefeuilleOla.get(cle).push(ligne);
  }

  // Deux personnes d'ONTERM ne figurent pas dans le tableau des ministères :
  //   - la secrétaire du Conseil des ministres, qui est une haute fonctionnaire et non
  //     une élue : elle n'a pas de fiche de député·e, et c'est normal ;
  //   - le leader parlementaire du gouvernement, qui n'a pas de ministère mais qui est
  //     bien député : on le relie alors par la liste des 124 (data/members.json).
  let parNomMembre = new Map();
  if (existsSync('data/members.json')) {
    const membres = JSON.parse(readFileSync('data/members.json', 'utf-8'));
    parNomMembre = new Map((membres.deputes ?? []).map((d) => [cleNom(d.nom), d]));
  }

  const ministres = ministresOnterm.map((m) => {
    const lignes = parPortefeuilleOla.get(cleNom(m.nom)) ?? [];
    const membre = parNomMembre.get(cleNom(m.nom)) ?? null;
    return {
      nom: m.nom,
      titreEn: m.titreEn,
      titreFr: m.titreFr,
      // Les portefeuilles tels qu'ola.org les liste (un ministre peut en avoir deux).
      portefeuillesOla: lignes.map((l) => l.portefeuille),
      identifiant: lignes[0]?.identifiant ?? membre?.identifiant ?? null,
      url: lignes[0]?.url ?? membre?.url ?? null,
      // Vrai quand la personne n'est pas député·e (la secrétaire du Conseil des ministres).
      horsAssemblee: !lignes.length && !membre,
    };
  });

  const sansFiche = ministres.filter((m) => !m.identifiant).map((m) => m.nom);

  mkdirSync('data', { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        source: {
          ola: URL_OLA_EN,
          olaFr: URL_OLA_FR,
          onterm: URL_JEU,
          fichiers,
          licence: 'Licence du gouvernement ouvert – Ontario',
        },
        legislature: LEGISLATURE,
        session: SESSION,
        lus: new Date().toISOString(),
        nombre: ministres.length,
        ministres,
        adjointsParlementaires: adjoints,
        ecartsDeTitre: ecarts,
      },
      null,
      2
    )
  );

  console.log(
    `${ministres.length} ministres et ${adjoints.length} adjoint·e·s parlementaires écrits dans ${OUT_PATH}.\n` +
      `  titres français : ${ministres.filter((m) => m.titreFr).length}/${ministres.length}\n` +
      `  reliés à une fiche de député·e : ${ministres.length - sansFiche.length}/${ministres.length}` +
      (sansFiche.length ? `\n  ⚠ sans fiche : ${sansFiche.join(', ')}` : '') +
      (ecarts.length ? `\n  ⚠ écarts de titre entre les deux fichiers ONTERM : ${ecarts.length}` : '')
  );
}

main().catch((err) => {
  console.error('Échec du scraper ministers.js :', err.message);
  process.exitCode = 1;
});
