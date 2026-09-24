// Scraper — les votes nominatifs (« recorded divisions »)
//
// COMMENT ON LES TROUVE, ET POURQUOI PAS AUTREMENT
// ola.org a un moteur de recherche de votes (« votes-search »), mais il fonctionne par
// formulaire : ses adresses contiennent un « ? », et le robots.txt l'interdit
// (`Disallow: /*?`). On ne s'en sert donc PAS. Chaque vote a par ailleurs sa propre page
// à adresse propre, et on y arrive par les liens que le site nous donne :
//   1. le tableau des étapes de chaque projet de loi (scrapers/bill-details.js) ;
//   2. les trois pages « Status of business » des motions : motions du gouvernement,
//      motions des député·e·s, et jours de l'opposition.
// Les adresses de ces pages sont imprévisibles (deux votes du même jour sur la même
// motion donnent « …-marit-stiles » et « …-marit-stiles-0 »). On ne les devine jamais.
//
// L'adresse française d'un vote n'est pas déductible de l'anglaise : on la lit dans la
// balise <link hreflang="fr"> de la page.
//
// Ce qu'on enregistre : pour chaque vote, le sujet, la date, le résultat, le compte des
// pour et des contre, et la liste nominative avec le parti et la circonscription. Un
// député·e absent n'est PAS dans la liste : l'Ontario ne publie pas les absences, et on
// n'en déduit rien.

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import * as cheerio from 'cheerio';
import { lirePage, texte, ADRESSE, LEGISLATURE, SESSION } from './ola.js';

const DETAILS_PATH = 'data/bill-details.json';
const OUT_PATH = 'data/votes.json';

const PAGES_MOTIONS = [
  { cle: 'motions-gouvernement', url: `${ADRESSE.base}/en/legislative-business/status-business/government-motions` },
  { cle: 'motions-deputes', url: `${ADRESSE.base}/en/legislative-business/status-business/private-members-motions` },
  {
    cle: 'jours-opposition',
    url: `${ADRESSE.base}/en/legislative-business/status-business/opposition-day-debates-want-confidence-motions`,
  },
];

const MOIS_EN = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

function dateIso(brut) {
  const m = /([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/.exec(brut || '');
  if (!m) return null;
  const mois = MOIS_EN[m[1].toLowerCase()];
  return mois ? `${m[3]}-${mois}-${String(m[2]).padStart(2, '0')}` : null;
}

/** Tous les liens « votes-search » d'une page, en adresses absolues. */
function liensDeVote(html) {
  const liens = new Set();
  const regex = /\/(?:en|fr)\/legislative-business\/votes-search\/parliament-\d+\/session-\d+\/[a-z0-9-]+/gi;
  for (const trouve of html.matchAll(regex)) liens.add(new URL(trouve[0], ADRESSE.base).href);
  return [...liens];
}

function lireVote(html, langue) {
  const $ = cheerio.load(html);
  const T = (sel) => texte($(sel).first().html() ?? '') || null;

  const sujet = T('h1');
  // Le bloc d'en-tête colle tout à la suite :
  //   EN « Vote on third reading 44th Parliament, 1st Session June 4, 2025 View related bill »
  //   FR « Clôture de la deuxième lecture 44e législature, 1re session 2 juin 2026 Voir le projet… »
  // Le type de vote est ce qui précède la législature — dans les deux langues.
  const typeEtSuite = texte($('.votes-meta').first().html() ?? '');
  const type = typeEtSuite.split(/\d+\s*(?:st|nd|rd|th|re|e)\s+(?:Parliament|législature)/i)[0].trim() || null;

  const dateAffichee = T('.divisions-meta-date');
  const resultat = T('.divisions-outcome-result');
  const pour = Number(T('.division-count_aye'));
  const contre = Number(T('.division-count_nay'));

  const urlAutreLangue = $(`link[hreflang="${langue === 'en' ? 'fr' : 'en'}"]`).attr('href') ?? null;

  const projetLie =
    $('a[href*="/bills/parliament-"], a[href*="/projets-loi/legislature-"]')
      .map((_, a) => $(a).attr('href'))
      .get()
      .find((h) => /\/(bill|projet-loi)-(pr)?\d+$/i.test(h)) ?? null;

  // Les cartes sont rangées sous deux titres, « Aye » puis « Nay » (« Pour »/« Contre »).
  const votants = [];
  let camp = null;
  $('h3.lao-heading, .photo-card-pattern').each((_, el) => {
    const $el = $(el);
    if ($el.is('h3')) {
      const t = texte($el.html() ?? '').toLowerCase();
      camp = /^(aye|pour)/.test(t) ? 'pour' : /^(nay|contre)/.test(t) ? 'contre' : null;
      return;
    }
    if (!camp) return;
    const lien = $el.find('a.photo-card-link').attr('href') ?? null;
    votants.push({
      nom: texte($el.find('h4').html() ?? '') || null,
      identifiant: lien ? lien.split('/').pop() : null,
      parti: texte($el.find('.card-heading').html() ?? '') || null,
      circonscription: texte($el.find('.card-subheading').html() ?? '') || null,
      vote: camp,
    });
  });

  return {
    sujet,
    type,
    dateAffichee,
    date: langue === 'en' ? dateIso(dateAffichee) : null,
    resultat,
    pour: Number.isFinite(pour) ? pour : null,
    contre: Number.isFinite(contre) ? contre : null,
    votants,
    urlAutreLangue,
    projetLie: projetLie ? new URL(projetLie, ADRESSE.base).href : null,
  };
}

function argument(nom, defaut = null) {
  const i = process.argv.indexOf(`--${nom}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : defaut;
}

async function main() {
  const limite = Number(argument('limite', '0'));
  const sansFrancais = process.argv.includes('--sans-francais');

  // 1. les liens venant des projets de loi
  const liens = new Map(); // url -> origine
  if (existsSync(DETAILS_PATH)) {
    const details = JSON.parse(readFileSync(DETAILS_PATH, 'utf-8'));
    for (const fiche of Object.values(details.fiches ?? {})) {
      for (const url of fiche.votes ?? []) liens.set(url, { type: 'projet', projet: fiche.numero });
    }
  } else {
    console.warn(`${DETAILS_PATH} manquant : on ne lira que les votes sur les motions.`);
  }

  // 2. les liens venant des trois pages de motions
  for (const page of PAGES_MOTIONS) {
    const html = await lirePage(page.url);
    const trouves = liensDeVote(html);
    for (const url of trouves) if (!liens.has(url)) liens.set(url, { type: 'motion', page: page.cle });
    console.log(`  ${page.cle} : ${trouves.length} liens de vote`);
  }

  let cibles = [...liens.keys()];
  if (limite > 0) cibles = cibles.slice(0, limite);
  console.log(`${cibles.length} votes à lire.`);

  const anciens = existsSync(OUT_PATH) ? JSON.parse(readFileSync(OUT_PATH, 'utf-8')).votes ?? [] : [];
  const parUrl = new Map(anciens.map((v) => [v.url, v]));

  let lus = 0;
  const echecs = [];
  for (const url of cibles) {
    try {
      const en = lireVote(await lirePage(url), 'en');
      let fr = null;
      if (!sansFrancais && en.urlAutreLangue) {
        try {
          fr = lireVote(await lirePage(en.urlAutreLangue), 'fr');
        } catch (err) {
          console.warn(`  (français indisponible pour ${url} : ${err.message})`);
        }
      }

      const origine = liens.get(url) ?? {};
      parUrl.set(url, {
        url,
        urlFr: en.urlAutreLangue,
        origine,
        sujetEn: en.sujet,
        sujetFr: fr?.sujet ?? null,
        typeEn: en.type,
        typeFr: fr?.type ?? null,
        date: en.date,
        dateAfficheeEn: en.dateAffichee,
        dateAfficheeFr: fr?.dateAffichee ?? null,
        resultatEn: en.resultat,
        resultatFr: fr?.resultat ?? null,
        pour: en.pour,
        contre: en.contre,
        projetLie: en.projetLie,
        // Le français ne sert qu'aux libellés (parti, circonscription) : la liste
        // nominative est la même, et on la joint par l'identifiant de la fiche.
        votants: en.votants.map((v) => {
          const jumeau = fr?.votants.find((x) => x.identifiant && x.identifiant === v.identifiant);
          return { ...v, partiFr: jumeau?.parti ?? null, circonscriptionFr: jumeau?.circonscription ?? null };
        }),
        lu: new Date().toISOString(),
      });

      // Garde-fou : le compte annoncé par la page doit correspondre aux noms listés.
      const vote = parUrl.get(url);
      const pourListes = vote.votants.filter((v) => v.vote === 'pour').length;
      const contreListes = vote.votants.filter((v) => v.vote === 'contre').length;
      if (vote.pour !== pourListes || vote.contre !== contreListes) {
        console.warn(
          `  ⚠ ${url} : la page annonce ${vote.pour}-${vote.contre} mais liste ${pourListes}-${contreListes} noms.`
        );
        vote.ecartCompte = true;
      }

      lus++;
      if (lus % 20 === 0) console.log(`  ${lus}/${cibles.length} votes lus…`);
    } catch (err) {
      echecs.push({ url, erreur: err.message });
      console.warn(`  ✖ ${url} : ${err.message}`);
    }
  }

  const votes = [...parUrl.values()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  mkdirSync('data', { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        source: 'https://www.ola.org — une page par vote, atteinte par les liens des projets de loi et des motions',
        legislature: LEGISLATURE,
        session: SESSION,
        lus: new Date().toISOString(),
        nombre: votes.length,
        votes,
      },
      null,
      2
    )
  );

  const ecarts = votes.filter((v) => v.ecartCompte).length;
  console.log(
    `${lus} votes lus (${votes.length} au total dans ${OUT_PATH}).` +
      `\n  votes sur des projets de loi : ${votes.filter((v) => v.origine?.type === 'projet').length}` +
      `\n  votes sur des motions : ${votes.filter((v) => v.origine?.type === 'motion').length}` +
      (ecarts ? `\n  ⚠ écarts entre le compte annoncé et les noms listés : ${ecarts}` : '') +
      (echecs.length ? `\n  échecs : ${echecs.length}` : '')
  );
}

main().catch((err) => {
  console.error('Échec du scraper votes.js :', err.message);
  process.exitCode = 1;
});
