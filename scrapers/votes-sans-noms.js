// Scraper — les votes dont l'Assemblée ne publie PAS les noms
//
// Pourquoi ce fichier existe : le contrôle (scripts/verifier-votes.js) a montré un écart.
// Les procès-verbaux annoncent 115 votes nominatifs, mais seulement 111 ont une page de
// vote avec la liste des noms. Les quatre autres sont des motions d'ajournement de
// l'Assemblée : le procès-verbal les annonce sous la forme
//
//     « Carried on the following division – Ayes 69, Nays 25 »
//
// c'est-à-dire avec le compte, et sans la liste des noms. Ces votes ne sont pas cachés :
// ils sont publiés autrement. Les taire donnerait un site qui compte 111 votes là où la
// Chambre en a tenu 115.
//
// On les lit donc ici, tels quels, et le site les affiche en disant ce qui manque :
// le compte vient du procès-verbal, les noms n'existent nulle part publiquement.
//
// Usage : node scrapers/votes-sans-noms.js

import { writeFileSync, mkdirSync } from 'node:fs';
import { lirePage, texte, ADRESSE, LEGISLATURE, SESSION } from './ola.js';

const INDEX = `${ADRESSE.base}/en/legislative-business/house-documents/parliament-44/session-1/`;
const pv = (jour) => `${ADRESSE.base}/en/legislative-business/house-documents/parliament-44/session-1/${jour}/votes-proceedings`;
const OUT_PATH = 'data/votes-sans-noms.json';

// « Carried on the following division – Ayes 69, Nays 25 » (tiret demi-cadratin).
// Le deux-points, lui, annonce une liste de noms : ces votes-là ont leur propre page.
const SANS_NOMS = /(Carried|Lost) on the following division\s*[–-]\s*Ayes (\d+), Nays (\d+)/g;

// On n'essaie PAS de recomposer la phrase du procès-verbal : il est bilingue, ses phrases
// s'entremêlent, et « L’hon. » porte un point qui casse tout découpage. On relève donc
// les deux faits que le procès-verbal énonce noir sur blanc — QUI propose, et QUELLE
// motion — et c'est le site qui écrit l'étiquette, dans la langue du visiteur.
const MOTION = /((?:Hon\.\s+)?[A-Z][\p{L}'’\-]+(?:\s+[A-Z][\p{L}'’\-]+){0,3})\s+moved adjournment of the (House|debate)\./gu;

function motionAvant(t, position) {
  const avant = t.slice(Math.max(0, position - 500), position);
  MOTION.lastIndex = 0;
  let dernier = null;
  let trouve;
  while ((trouve = MOTION.exec(avant))) dernier = trouve;
  if (!dernier) return { proposePar: null, motion: null };
  return {
    proposePar: dernier[1].trim(),
    motion: dernier[2].toLowerCase() === 'house' ? 'ajournement-chambre' : 'ajournement-debat',
  };
}

async function main() {
  const index = await lirePage(INDEX);
  const jours = [...new Set([...index.matchAll(/session-1\/(\d{4}-\d{2}-\d{2})\//g)].map((m) => m[1]))].sort();

  const votes = [];
  let jourSansPv = 0;

  for (const jour of jours) {
    let html;
    try {
      html = await lirePage(pv(jour));
    } catch (err) {
      // Séance à venir : le Feuilleton existe déjà, le procès-verbal pas encore.
      if (/HTTP 404/.test(err.message)) { jourSansPv++; continue; }
      throw err;
    }

    const t = texte(html);
    SANS_NOMS.lastIndex = 0;
    let trouve;
    while ((trouve = SANS_NOMS.exec(t))) {
      const { proposePar, motion } = motionAvant(t, trouve.index);
      votes.push({
        date: jour,
        proposePar,
        motion,
        resultatEn: trouve[1],
        resultatFr: trouve[1] === 'Carried' ? 'Adoptée' : 'Rejetée',
        pour: Number(trouve[2]),
        contre: Number(trouve[3]),
        // Ce qui manque, et pourquoi : à dire tel quel sur le site.
        sansNoms: true,
        source: pv(jour),
      });
    }
  }

  mkdirSync('data', { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        source: 'https://www.ola.org — procès-verbaux (Votes and Proceedings) de chaque jour de séance',
        explication:
          "Votes annoncés par la Chambre avec leur compte seulement : l'Assemblée ne publie pas " +
          'la liste des noms pour ces motions (des motions d\'ajournement, en pratique).',
        legislature: LEGISLATURE,
        session: SESSION,
        lus: new Date().toISOString(),
        joursLus: jours.length - jourSansPv,
        nombre: votes.length,
        votes,
      },
      null,
      2
    )
  );

  console.log(`${votes.length} votes sans liste de noms, sur ${jours.length - jourSansPv} jours de séance.`);
  for (const v of votes) console.log(`  ${v.date} : ${v.pour}-${v.contre} ${v.resultatEn} — ${v.motion ?? 'motion non reconnue'}, ${v.proposePar ?? '?'}`);
}

main().catch((err) => {
  console.error('Échec du scraper votes-sans-noms.js :', err.message);
  process.exitCode = 1;
});
