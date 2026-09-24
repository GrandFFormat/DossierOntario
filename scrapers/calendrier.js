// Scraper — les jours de séance
//
// La Chambre de l'Ontario ne siège pas toute l'année : en 2026, elle s'arrête du 3 juin
// au 26 octobre. Un site qui n'en dit rien a l'air en panne pendant cinq mois.
//
// Plutôt que d'écrire ces dates à la main (elles changent chaque année, et une date
// codée en dur finit toujours par mentir), on lit l'index des documents de la Chambre :
// il liste un jour par séance. Le dernier jour passé est la dernière séance ; le premier
// jour à venir est la prochaine — l'Assemblée publie le Feuilleton d'une séance avant
// qu'elle ait lieu, ce qui la rend visible d'avance.
//
// Usage : node scrapers/calendrier.js

import { writeFileSync, mkdirSync } from 'node:fs';
import { lirePage, ADRESSE, LEGISLATURE, SESSION } from './ola.js';

const INDEX = `${ADRESSE.base}/en/legislative-business/house-documents/parliament-44/session-1/`;
const OUT_PATH = 'data/calendrier.json';

async function main() {
  const html = await lirePage(INDEX);
  const jours = [...new Set([...html.matchAll(/session-1\/(\d{4}-\d{2}-\d{2})\//g)].map((m) => m[1]))].sort();

  if (!jours.length) throw new Error("Aucun jour de séance lu — l'index a changé de forme ?");

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const passes = jours.filter((j) => j <= aujourdhui);
  const aVenir = jours.filter((j) => j > aujourdhui);

  const calendrier = {
    source: INDEX,
    legislature: LEGISLATURE,
    session: SESSION,
    lus: new Date().toISOString(),
    nombreJours: jours.length,
    premiereSeance: jours[0],
    derniereSeance: passes.at(-1) ?? null,
    prochaineSeance: aVenir[0] ?? null,
    // Vrai quand la Chambre ne siège pas aujourd'hui et qu'aucune séance n'a eu lieu
    // depuis plus d'une semaine : c'est une relâche, pas une fin de semaine.
    enRelache: false,
  };

  if (calendrier.derniereSeance) {
    const ecartJours = Math.round(
      (Date.parse(`${aujourdhui}T12:00:00Z`) - Date.parse(`${calendrier.derniereSeance}T12:00:00Z`)) / 86400000
    );
    calendrier.joursDepuisDerniereSeance = ecartJours;
    calendrier.enRelache = ecartJours > 7 && !jours.includes(aujourdhui);
  }

  mkdirSync('data', { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(calendrier, null, 2));

  console.log(
    `${jours.length} jours de séance depuis le ${calendrier.premiereSeance}.\n` +
      `  dernière séance : ${calendrier.derniereSeance ?? '—'}` +
      (calendrier.joursDepuisDerniereSeance != null ? ` (il y a ${calendrier.joursDepuisDerniereSeance} jours)` : '') +
      `\n  prochaine séance annoncée : ${calendrier.prochaineSeance ?? 'aucune'}` +
      `\n  en relâche : ${calendrier.enRelache ? 'oui' : 'non'}`
  );
}

main().catch((err) => {
  console.error('Échec du scraper calendrier.js :', err.message);
  process.exitCode = 1;
});
