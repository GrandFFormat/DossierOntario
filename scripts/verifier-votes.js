// Contrôle : avons-nous VRAIMENT tous les votes nominatifs ?
//
// Les pages de vote sont trouvées par les liens des projets de loi et des trois pages de
// motions (scrapers/votes.js). Rien ne garantit à priori qu'aucun vote ne nous échappe.
// Ce script compare notre récolte au compte rendu officiel de la Chambre : les
// procès-verbaux (Votes and Proceedings), publiés pour chaque jour de séance, qui
// annoncent chaque vote par « Carried on the following division » ou « Lost on the
// following division ».
//
// Il ne corrige rien et n'écrit aucune donnée : il compte, il compare, il dit où ça cloche.
//
// Usage : node scripts/verifier-votes.js

import { readFileSync, existsSync } from 'node:fs';
import { lirePage, texte, ADRESSE } from '../scrapers/ola.js';

const INDEX = `${ADRESSE.base}/en/legislative-business/house-documents/parliament-44/session-1/`;
const VOTES_PATH = 'data/votes.json';
const SANS_NOMS_PATH = 'data/votes-sans-noms.json';

async function main() {
  if (!existsSync(VOTES_PATH)) throw new Error(`${VOTES_PATH} manquant — lancer « npm run scrape:votes ».`);
  const recolte = [
    ...(JSON.parse(readFileSync(VOTES_PATH, 'utf-8')).votes ?? []),
    // Les votes dont l'Assemblée ne publie que le compte comptent, eux aussi : ils sont
    // dans le compte rendu, et sur le site.
    ...(existsSync(SANS_NOMS_PATH) ? JSON.parse(readFileSync(SANS_NOMS_PATH, 'utf-8')).votes ?? [] : []),
  ];

  const index = await lirePage(INDEX);
  // L'index liste chaque jour de séance, le plus souvent par son Journal des débats
  // (« /hansard »). On en tire les DATES, puis on va chercher le procès-verbal de
  // chacune : c'est lui qui annonce les votes.
  const jours = [...new Set([...index.matchAll(/session-1\/(\d{4}-\d{2}-\d{2})\//g)].map((m) => m[1]))].sort();
  console.log(`${jours.length} jours de séance avec procès-verbal.`);

  const parJourOfficiel = new Map();
  let total = 0;

  const sansProcesVerbal = [];
  for (const jour of jours) {
    let html;
    try {
      html = await lirePage(`${ADRESSE.base}/en/legislative-business/house-documents/parliament-44/session-1/${jour}/votes-proceedings`);
    } catch (err) {
      // Un jour de séance À VENIR a déjà son Feuilleton mais pas encore son
      // procès-verbal : ola.org répond 404, et c'est normal.
      if (/HTTP 404/.test(err.message)) {
        sansProcesVerbal.push(jour);
        continue;
      }
      throw err;
    }
    // Les procès-verbaux sont bilingues : chaque annonce apparaît en anglais ET en
    // français. On ne compte que la version anglaise, sinon on double tout.
    const annonces = texte(html).match(/(Carried|Lost) on the following division/gi) ?? [];
    parJourOfficiel.set(jour, annonces.length);
    total += annonces.length;
    if (annonces.length) console.log(`  ${jour} : ${annonces.length} vote(s) annoncé(s)`);
  }

  const parJourRecolte = new Map();
  for (const vote of recolte) {
    if (!vote.date) continue;
    parJourRecolte.set(vote.date, (parJourRecolte.get(vote.date) ?? 0) + 1);
  }

  if (sansProcesVerbal.length) {
    console.log(`\n${sansProcesVerbal.length} jour(s) sans procès-verbal (séance à venir) : ${sansProcesVerbal.join(', ')}`);
  }
  console.log(`\nProcès-verbaux officiels : ${total} votes nominatifs`);
  console.log(`Notre récolte            : ${recolte.length} votes`);

  const ecarts = [];
  for (const jour of new Set([...parJourOfficiel.keys(), ...parJourRecolte.keys()])) {
    const officiel = parJourOfficiel.get(jour) ?? 0;
    const chezNous = parJourRecolte.get(jour) ?? 0;
    if (officiel !== chezNous) ecarts.push({ jour, officiel, chezNous });
  }

  if (!ecarts.length) {
    console.log('\n✓ Aucun écart : chaque vote annoncé par la Chambre est chez nous, et aucun de plus.');
    return;
  }

  console.log(`\n⚠ ${ecarts.length} jour(s) en écart :`);
  for (const e of ecarts.sort((a, b) => a.jour.localeCompare(b.jour))) {
    console.log(`  ${e.jour} : ${e.officiel} au procès-verbal, ${e.chezNous} chez nous`);
  }
  console.log(
    '\nUn écart ne veut pas dire « donnée fausse » : il veut dire qu\'un vote existe sans que\n' +
      'nos deux chemins (projets de loi, motions) y mènent. Il faut alors regarder le\n' +
      'procès-verbal du jour et trouver par où le site y renvoie.'
  );
  process.exitCode = 1;
}

main().catch((err) => {
  console.error('Échec de la vérification :', err.message);
  process.exitCode = 1;
});
