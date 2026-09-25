// Scraper — les pétitions présentées à l'Assemblée
//
// En Ontario, une pétition est sur PAPIER, signée à la main, et présentée à la Chambre par un
// ou une député·e ; le gouvernement doit y répondre dans les 24 jours de séance. Il n'y a pas
// de pétition électronique, donc pas de compteur de signatures à afficher (ola.org,
// « Petitions », lu le 24 septembre 2026).
//
// Ce qui existe, et que ce script lit : l'index que tient la greffière — chaque SUJET de
// pétition (« No. 225 Tree by-law applicability for building permits »), avec chaque
// présentation : qui l'a présentée, quand, et quand le gouvernement a répondu.
//
// Une seule page. L'index n'existe qu'en ANGLAIS : la page française (/fr/…/petitions-reponses)
// reprend les mêmes sujets en anglais — 224 sur 225 le 24 septembre 2026, le dernier renvoyant
// à « See P-157 for French version ». On ne fait donc pas passer ces titres pour du français :
// le site dit que l'index est publié en anglais seulement.
//
// Usage : node scrapers/petitions.js

import { writeFileSync, mkdirSync } from 'node:fs';
import * as cheerio from 'cheerio';
import { lirePage, texte, ADRESSE } from './ola.js';

const EN = `${ADRESSE.base}/en/legislative-business/status-business/petitions-responses-subject-index`;
const SORTIE = 'data/petitions.json';

const MOIS_EN = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };
function isoEn(t) {
  const m = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/.exec((t ?? '').trim());
  if (!m || !MOIS_EN[m[1]]) return null;   // « - » : pas encore de réponse
  return `${m[3]}-${String(MOIS_EN[m[1]]).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

/** Les sujets de l'index : { numero, sujet, lignes[] }. */
function lireIndex(html) {
  const $ = cheerio.load(html);
  const sujets = [];
  $('.views-row').each((_, rang) => {
    const titre = texte($(rang).find('h4').first().html() ?? '');
    const m = /^No\.\s*(\d+)\s+(.+)$/i.exec(titre);
    if (!m) return;
    const lignes = [];
    $(rang).find('tr').each((i, tr) => {
      const c = $(tr).find('td').map((_, td) => texte($(td).html() ?? '')).get();
      if (c.length >= 2) lignes.push(c);
    });
    sujets.push({ numero: Number(m[1]), sujet: m[2].trim(), lignes });
  });
  return sujets;
}

async function main() {
  const en = lireIndex(await lirePage(EN));
  if (!en.length) throw new Error("Aucune pétition lue — l'index a changé de forme ?");

  const petitions = en
    .map((s) => ({
      numero: s.numero,
      sujet: s.sujet,
      presentations: s.lignes.map(([membre, depot, reponse]) => ({
        membre,
        depot: isoEn(depot),
        reponse: isoEn(reponse),
      })),
    }))
    .sort((a, b) => b.numero - a.numero);

  const sansDate = petitions.flatMap((p) => p.presentations).filter((x) => !x.depot).length;
  if (sansDate) console.warn(`  ${sansDate} présentation(s) sans date de dépôt lisible`);

  mkdirSync('data', { recursive: true });
  writeFileSync(SORTIE, JSON.stringify({ source: EN, lus: new Date().toISOString(), nombre: petitions.length, petitions }, null, 2));
  const presentations = petitions.reduce((n, p) => n + p.presentations.length, 0);
  console.log(`${petitions.length} sujets, ${presentations} présentations → ${SORTIE}`);
}

main().catch((err) => {
  console.error('Échec du scraper petitions.js :', err.message);
  process.exitCode = 1;
});
