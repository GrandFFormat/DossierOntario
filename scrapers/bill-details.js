// Scraper — la fiche de chaque projet de loi
//
// Une page ola.org par projet, dans les deux langues, et tout y est : l'état courant,
// le tableau des étapes (avec les liens vers les votes), la note explicative, les
// versions PDF et les lois touchées.
//
// Ce qu'on garde : la note explicative (l'équivalent officiel d'un résumé, écrite par
// les légistes, et publiée dans les deux langues), les étapes, les liens. Ce qu'on ne
// garde PAS : le texte intégral du projet. Les conditions d'ola.org permettent des
// EXTRAITS ; le texte complet reste chez elle, et chaque fiche y renvoie. On note quand
// même sa longueur : elle servira à mesurer le coût des résumés IA, plus tard.
//
// Trois pièges vus le 19 septembre 2026, tous gérés ici :
//   1. Trois projets (3, 84, 119) n'ont AUCUNE ligne « Current status » en haut de page.
//      L'état se déduit alors de la première ligne du tableau des étapes.
//   2. La note explicative s'intitule « EXPLANATORY NOTE », parfois « NOTE » tout court
//      (projet 65), et les lois de crédits (18, 95) n'en ont pas du tout. Pas de note
//      trouvée => null, jamais un texte inventé ou recopié d'ailleurs.
//   3. Le tableau des étapes des pages EN et FR se lit ligne à ligne dans le même ordre.
//      On ne fusionne les libellés français QUE si les deux tableaux ont le même nombre
//      de lignes ; sinon on laisse le français à null.
//
// Usage : node scrapers/bill-details.js [--limite N] [--type public|prive|tous] [--numeros 5,12]

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import * as cheerio from 'cheerio';
import { lirePage, texte, ADRESSE, LEGISLATURE, SESSION } from './ola.js';

const LISTE_PATH = 'data/bills.json';
const OUT_PATH = 'data/bill-details.json';

const MOIS_EN = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

/** « June 5, 2025 » -> « 2025-06-05 ». Rend null si la forme n'est pas celle-là. */
function dateIso(brut) {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec((brut || '').trim());
  if (!m) return null;
  const mois = MOIS_EN[m[1].toLowerCase()];
  if (!mois) return null;
  return `${m[3]}-${mois}-${String(m[2]).padStart(2, '0')}`;
}

function lireEtapes($, langue) {
  const lignes = [];
  $('.bill-status-tab table tr').each((_, tr) => {
    const cellules = $(tr).find('td');
    if (cellules.length < 5) return; // ligne d'en-tête
    const valeur = (i) => {
      const t = texte($(cellules[i]).html() ?? '');
      return t && t !== '-' ? t : null;
    };
    const lienVote = $(cellules[2]).find('a').attr('href') ?? null;
    lignes.push({
      dateAffichee: valeur(0),
      date: langue === 'en' ? dateIso(valeur(0)) : null,
      etape: valeur(1),
      evenement: valeur(2),
      resultat: valeur(3),
      comite: valeur(4),
      vote: lienVote ? new URL(lienVote, ADRESSE.base).href : null,
    });
  });
  return lignes;
}

/**
 * La note explicative, lue par la STRUCTURE de la page plutôt que par son titre.
 *
 * Elle commence à un paragraphe `p.schedule` intitulé « EXPLANATORY NOTE », « NOTE »
 * (projet 65) ou « note explicative » côté français, et se termine au premier
 * paragraphe du projet de loi lui-même : la formule d'édiction `p.preamble` (« His
 * Majesty, by and with the advice and consent… ») ou, à défaut, le premier article
 * numéroté `p.Psection`.
 *
 * Rend null s'il n'y a pas de note — c'est le cas des lois de crédits (18, 95).
 */
const TITRES_NOTE = /^(EXPLANATORY\s+NOTE|NOTE|NOTE\s+EXPLICATIVE)$/i;
const FIN_NOTE = new Set(['preamble', 'Psection', 'billheading']);
const MAX_NOTE = 40000;

function lireNote($) {
  const paragraphes = $('.bill-view-bill-tab').find('p').toArray();
  const debut = paragraphes.findIndex(
    (el) => ($(el).attr('class') || '') === 'schedule' && TITRES_NOTE.test(texte($(el).html() ?? ''))
  );
  if (debut < 0) return null;

  const morceaux = [];
  for (let i = debut + 1; i < paragraphes.length; i++) {
    const classe = $(paragraphes[i]).attr('class') || '';
    if (FIN_NOTE.has(classe)) break;
    const t = texte($(paragraphes[i]).html() ?? '');
    if (t) morceaux.push(t);
  }

  const note = morceaux.join('\n\n').trim();
  if (note.length <= 30) return null;
  return note.length > MAX_NOTE ? `${note.slice(0, MAX_NOTE)}…` : note;
}

function lireVersions($) {
  const versions = [];
  $('.bill-view-bill-tab a[href$=".pdf"], .bill-view-bill-tab a[href*=".pdf"]').each((_, a) => {
    const href = $(a).attr('href');
    if (!href || !/\.pdf$/i.test(href)) return;
    const libelle = texte($(a).html() ?? '') || null;
    versions.push({ libelle, url: new URL(href, ADRESSE.base).href });
  });
  // dédoublonnage par adresse
  return [...new Map(versions.map((v) => [v.url, v])).values()];
}

function lireLoisTouchees($) {
  const lois = [];
  $('.bill-acts-tab li, .bill-acts-tab a').each((_, el) => {
    const t = texte($(el).html() ?? '');
    if (t && t.length < 200 && !/e-Laws|Lois-en-ligne/i.test(t)) lois.push(t);
  });
  return [...new Set(lois)];
}

function lireFiche(html, { numero, langue }) {
  const $ = cheerio.load(html);

  const statutBrut = texte($('.views-field-field-current-status-1').html() ?? '');
  const statut =
    statutBrut.replace(/^\s*(Current status:|Statut\s*:)\s*/i, '').trim() || null;

  const etapes = lireEtapes($, langue);
  const ongletTexte = texte($('.bill-view-bill-tab').html() ?? '');

  return {
    statut,
    // Piège n° 1 : pas de ligne d'état en haut ⇒ on le dit avec la dernière étape
    // franchie, en marquant d'où vient l'information.
    statutSource: statut ? 'entete' : etapes.length ? 'derniere-etape' : null,
    statutDerniereEtape: etapes.length
      ? [etapes[0].etape, etapes[0].evenement].filter(Boolean).join(' — ')
      : null,
    etapes,
    note: lireNote($),
    versions: lireVersions($),
    loisTouchees: lireLoisTouchees($),
    longueurTexte: ongletTexte.length,
    votes: [...new Set(etapes.map((e) => e.vote).filter(Boolean))],
  };
}

function argument(nom, defaut = null) {
  const i = process.argv.indexOf(`--${nom}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : defaut;
}

async function main() {
  if (!existsSync(LISTE_PATH)) throw new Error(`${LISTE_PATH} manquant — lancer d'abord « npm run scrape:bills ».`);
  const liste = JSON.parse(readFileSync(LISTE_PATH, 'utf-8'));

  const type = argument('type', 'tous');
  const numeros = argument('numeros');
  const limite = Number(argument('limite', '0'));

  let cibles = liste.projets;
  if (type !== 'tous') cibles = cibles.filter((p) => p.type === type);
  if (numeros) {
    const voulus = new Set(numeros.split(',').map((n) => n.trim().toUpperCase()));
    cibles = cibles.filter((p) => voulus.has(p.numero));
  }
  if (limite > 0) cibles = cibles.slice(0, limite);

  const anciennes = existsSync(OUT_PATH)
    ? JSON.parse(readFileSync(OUT_PATH, 'utf-8')).fiches ?? {}
    : {};

  const fiches = { ...anciennes };
  let lus = 0;
  const echecs = [];

  for (const projet of cibles) {
    try {
      const htmlEn = await lirePage(projet.url);
      const en = lireFiche(htmlEn, { numero: projet.numero, langue: 'en' });

      let fr = null;
      // Les projets privés n'ont pas de version française du texte : la page française
      // affiche l'anglais. On ne va donc pas la chercher.
      if (projet.type === 'public' && projet.urlFr) {
        const htmlFr = await lirePage(projet.urlFr);
        fr = lireFiche(htmlFr, { numero: projet.numero, langue: 'fr' });
      }

      // Piège n° 3 : on n'aligne les libellés français que si les tableaux concordent.
      const etapes = en.etapes.map((etape, i) => ({
        ...etape,
        etapeFr: fr && fr.etapes.length === en.etapes.length ? fr.etapes[i].etape : null,
        evenementFr: fr && fr.etapes.length === en.etapes.length ? fr.etapes[i].evenement : null,
        resultatFr: fr && fr.etapes.length === en.etapes.length ? fr.etapes[i].resultat : null,
        comiteFr: fr && fr.etapes.length === en.etapes.length ? fr.etapes[i].comite : null,
        dateAfficheeFr: fr && fr.etapes.length === en.etapes.length ? fr.etapes[i].dateAffichee : null,
      }));

      fiches[projet.numero] = {
        numero: projet.numero,
        url: projet.url,
        urlFr: projet.urlFr,
        statutEn: en.statut,
        statutFr: fr ? fr.statut : null,
        statutSource: en.statutSource,
        statutDerniereEtape: en.statutDerniereEtape,
        etapes,
        premiereLecture: etapes.length ? etapes[etapes.length - 1].date : null,
        derniereActivite: etapes.length ? etapes[0].date : null,
        noteEn: en.note,
        noteFr: fr ? fr.note : null,
        versionsEn: en.versions,
        versionsFr: fr ? fr.versions : [],
        loisTouchees: en.loisTouchees,
        loisToucheesFr: fr ? fr.loisTouchees : [],
        longueurTexteEn: en.longueurTexte,
        longueurTexteFr: fr ? fr.longueurTexte : null,
        votes: en.votes,
        lu: new Date().toISOString(),
      };
      lus++;
      if (lus % 20 === 0) console.log(`  ${lus}/${cibles.length} fiches lues…`);
    } catch (err) {
      echecs.push({ numero: projet.numero, erreur: err.message });
      console.warn(`  ✖ projet ${projet.numero} : ${err.message}`);
    }
  }

  mkdirSync('data', { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        source: 'https://www.ola.org — une page par projet de loi, versions anglaise et française',
        legislature: LEGISLATURE,
        session: SESSION,
        lus: new Date().toISOString(),
        nombre: Object.keys(fiches).length,
        fiches,
      },
      null,
      2
    )
  );

  const avecNote = Object.values(fiches).filter((f) => f.noteEn).length;
  const avecNoteFr = Object.values(fiches).filter((f) => f.noteFr).length;
  const sansEntete = Object.values(fiches).filter((f) => f.statutSource === 'derniere-etape').length;
  const votes = new Set(Object.values(fiches).flatMap((f) => f.votes)).size;
  console.log(
    `${lus} fiches lues (${Object.keys(fiches).length} au total dans ${OUT_PATH}).\n` +
      `  notes explicatives : ${avecNote} en anglais, ${avecNoteFr} en français\n` +
      `  états déduits du tableau (pas d'en-tête) : ${sansEntete}\n` +
      `  liens de vote distincts : ${votes}` +
      (echecs.length ? `\n  échecs : ${echecs.map((e) => e.numero).join(', ')}` : '')
  );
}

main().catch((err) => {
  console.error('Échec du scraper bill-details.js :', err.message);
  process.exitCode = 1;
});
