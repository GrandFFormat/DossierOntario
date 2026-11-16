// Scraper — le conseil municipal d'Ottawa et ses comités permanents (volet de ville)
//
// La Ville d'Ottawa publie ses ordres du jour et ses procès-verbaux sur eScribe
// (pub-ottawa.escribemeetings.com), en HTML, en anglais ET en français, point par point :
// numéro, titre, pièces jointes, texte de la recommandation, résultat (« Carried »,
// « Received », « Carried (20 to 4) », « Carried with dissent from… ») et, pour les votes
// nominaux, le tableau des pour et des contre. C'est ce que ce script lit.
//
// Ce qu'il lit, et rien d'autre : les séances des DEUX DERNIERS MOIS (décision de Martin,
// 15 nov. 2026 : assez pour montrer à la Ville une page déjà faite de ses propres décisions,
// et pour nourrir un courriel aux gens qui s'abonnent). Le conseil et les comités permanents ;
// pas le Comité de dérogation (des dizaines d'adresses par séance), pas les conseils
// d'administration (police, bibliothèque, santé).
//
// Les règles : User-Agent honnête, 2 s entre deux requêtes, aucune reprise sur un 403/404.
// Le robots.txt d'eScribe ne bloque que PetalBot (lu le 15 nov. 2026). ottawa.ca, lui, est
// derrière une protection anti-robot : on ne le lit pas. Les conditions d'ottawa.ca demandent
// une permission pour republier : la page le dit, et la Ville est prévenue — c'est l'approche
// « montrer une page déjà faite » plutôt que demander dans le vide.
//
// Usage : node scrapers/ottawa.js            (62 derniers jours)
//         node scrapers/ottawa.js --jours 90

import { writeFileSync, mkdirSync } from 'node:fs';
import * as cheerio from 'cheerio';

const BASE = 'https://pub-ottawa.escribemeetings.com';
const SORTIE = 'data/ottawa.json';
const USER_AGENT =
  'dossierontario-scraper/0.1 (projet citoyen independant, usage non commercial; +https://dossierontario.ca; contact@dossierquebec.ca)';
const DELAI_MS = 2000;

// Le conseil et les comités permanents, avec leur nom officiel en français (tel qu'il
// apparaît dans les procès-verbaux français de la Ville).
const INSTANCES = {
  'City Council': 'Conseil municipal',
  'Transit Committee': 'Comité du transport en commun',
  'Built Heritage Committee': 'Comité du patrimoine bâti',
  'Planning and Housing Committee': 'Comité de la planification et du logement',
  'Audit Committee': 'Comité de la vérification',
  'Finance and Corporate Services Committee': 'Comité des finances et des services organisationnels',
  'Community Services Committee': 'Comité des services communautaires',
  'Public Works and Infrastructure Committee': 'Comité des travaux publics et de l’infrastructure',
  'Environment and Climate Change Committee': 'Comité de l’environnement et du changement climatique',
  'Agriculture and Rural Affairs Committee': 'Comité de l’agriculture et des affaires rurales',
  'Emergency Preparedness and Protective Services Committee': 'Comité de la protection civile et des services de protection',
  'Light Rail Sub-Committee': 'Sous-comité du train léger',
};

// Les points de pure procédure : on les garde dans la séance (ils disent comment elle s'est
// passée) mais ils ne sont jamais résumés et ne comptent pas comme des décisions.
const PROCEDURE =
  /call to order|moment of reflection|public notices|national anthem|announcements|ceremonial|roll call|confirmation of minutes|declarations? of interest|^communications$|responses to inquiries|^petitions$|other communications|^regrets$|motion to introduce reports|adjournment|^inquiries$|notices? of motion|notice of intent|motion to adopt reports|confirmation by-law|land acknowledgement|^minutes \d+/i;

let dernierAppel = 0;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function appeler(url, options = {}) {
  const attente = DELAI_MS - (Date.now() - dernierAppel);
  if (attente > 0) await dormir(attente);
  dernierAppel = Date.now();
  const res = await fetch(url, { ...options, headers: { 'User-Agent': USER_AGENT, ...(options.headers ?? {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  return res;
}

function argument(nom, defaut) {
  const i = process.argv.indexOf(`--${nom}`);
  return i === -1 ? defaut : process.argv[i + 1];
}

const iso = (d) => d.toISOString().slice(0, 10);

/** Les séances passées de la fenêtre, avec leurs documents (le calendrier public d'eScribe). */
async function lireCalendrier(du, au) {
  const res = await appeler(`${BASE}/MeetingsCalendarView.aspx/GetCalendarMeetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: `{'calendarStartDate':'${du}','calendarEndDate':'${au}'}`,
  });
  const { d } = await res.json();
  return d
    .filter((m) => m.MeetingPassed && INSTANCES[m.MeetingName.trim()])
    .map((m) => {
      const docs = m.MeetingDocumentLink ?? [];
      const pv = (langueId) => docs.find((x) => x.Format === 'HTML' && /Minutes|Procès-verbal/i.test(x.Title) && x.LanguageId === langueId);
      const en = pv(9), fr = pv(12);
      return {
        id: m.ID,
        nomEn: m.MeetingName.trim(),
        nomFr: INSTANCES[m.MeetingName.trim()],
        date: m.StartDate.slice(0, 10).replace(/\//g, '-'),
        urlEn: en ? new URL(en.Url, BASE).href : null,
        urlFr: fr ? new URL(fr.Url, BASE).href : null,
        video: docs.some((x) => /video/i.test(x.Title)),
      };
    })
    .filter((m) => m.urlEn) // sans procès-verbal HTML, rien à lire (séance annulée, ou pas encore publié)
    .sort((a, b) => a.date.localeCompare(b.date));
}

const texte = ($, el) => $(el).text().replace(/\s+/g, ' ').trim();

/** Les noms d'un tableau de vote : « M. Sutcliffe, L. Dudas, and W. Lo » → trois noms. */
const noms = (s) =>
  s
    .replace(/\s+(and|et)\s+/g, ', ')
    .split(/\s*,\s*/)
    .map((x) => x.trim())
    .filter(Boolean);

/** Tous les points d'un procès-verbal HTML, dans l'ordre, avec leurs motions et leurs votes. */
function lirePoints(html) {
  const $ = cheerio.load(html);
  const points = [];
  $('.AgendaItem').each((_, el) => {
    const item = $(el);
    const titreRow = item.children('.AgendaItemTitleRow');
    const numero = texte($, titreRow.find('.AgendaItemCounter').first()).replace(/\.$/, '');
    const titre = texte($, titreRow.find('.AgendaItemTitle').first());
    if (!numero || !titre) return;

    const pieces = [];
    const vus = new Set();
    titreRow.find('.AgendaItemAttachment a.Link').each((_, a) => {
      const href = $(a).attr('href');
      const m = /DocumentId=(\d+)/i.exec(href ?? '');
      if (!m || vus.has(m[1])) return;
      vus.add(m[1]);
      pieces.push({ titre: texte($, a), url: new URL(href, BASE).href });
    });

    const rangs = item.children('.AgendaItemContentRow');
    const description = texte($, rangs.find('> .AgendaItemDescription'));
    const compteRendu = texte($, rangs.find('> .AgendaItemMinutes'));

    const motions = [];
    rangs.find('> .AgendaItemMotions > .AgendaItemMotion').each((_, li) => {
      const mo = $(li);
      const vote = {};
      mo.find('.MotionVoters tr').each((_, tr) => {
        const camp = texte($, $(tr).find('.VoterVote'));
        const gens = texte($, $(tr).find('.VotesUsers'));
        if (/^(For|Pour)/i.test(camp)) vote.pour = noms(gens);
        else if (/^(Against|Contre)/i.test(camp)) vote.contre = noms(gens);
      });
      motions.push({
        numero: texte($, mo.find('> .Number .Value')) || null,
        propose: texte($, mo.find('> .MovedBy .Value')) || null,
        appuye: texte($, mo.find('> .SecondedBy .Value')) || null,
        texte: texte($, mo.find('> .MotionText')),
        resultat: texte($, mo.find('> .MotionResult')) || null,
        apres: texte($, mo.find('> .PostMotionText')) || null,
        ...(vote.pour || vote.contre ? { vote } : {}),
      });
    });

    points.push({ numero, titre, description, compteRendu, pieces, motions, niveau: numero.split('.').length });
  });
  return points;
}

/** « File No. ACS2026-PDB-RHU-0049 - Kanata North (Ward 4) » → le dossier et le quartier. */
function dossierEtQuartier(description) {
  const m = /File No\.?\s*([A-Z0-9-]+)\s*[–-]\s*(.+?)\s*$/i.exec(description ?? '');
  return m ? { dossier: m[1], quartier: m[2] } : {};
}

/** Le résultat d'un point : la dernière motion qui en a un. */
function resultatDe(motions) {
  for (let i = motions.length - 1; i >= 0; i--) if (motions[i].resultat) return motions[i].resultat;
  return null;
}

/** « Carried with dissent from Councillors Leiper and Menard. » → les noms. */
function dissidences(resultat) {
  const m = /dissent(?:s)? (?:from|of) (?:Councillors?|Mayor)?\s*(.+?)\.?$/i.exec(resultat ?? '') ?? /dissidence(?:s)? (?:de|des|du) (?:conseill(?:er|ère)s?|maire)?\s*(.+?)\.?$/i.exec(resultat ?? '');
  return m ? noms(m[1]) : [];
}

async function main() {
  const jours = Number(argument('jours', 62));
  const au = new Date();
  const du = new Date(au.getTime() - jours * 86400000);
  console.log(`Fenêtre : ${iso(du)} → ${iso(au)}`);

  const seancesCal = await lireCalendrier(iso(du), iso(au));
  console.log(`${seancesCal.length} séance(s) du conseil et des comités avec un procès-verbal HTML.`);

  const seances = [];
  for (const s of seancesCal) {
    console.log(`  ${s.date} ${s.nomEn}`);
    const htmlEn = await (await appeler(s.urlEn)).text();
    const en = lirePoints(htmlEn);
    const fr = s.urlFr ? lirePoints(await (await appeler(s.urlFr)).text()) : [];
    // « Meeting #: 88 » dans l'en-tête du procès-verbal.
    const numeroSeance = cheerio.load(htmlEn)('.AgendaMeetingNumberText').first().text().trim() || null;
    const frParNumero = new Map(fr.map((p) => [p.numero, p]));

    // Le titre de section (« Audit Committee Report 19 ») de chaque point : le dernier point de
    // niveau 1 rencontré avant lui.
    let sectionEn = null, sectionFr = null;
    const points = en.map((p) => {
      const q = frParNumero.get(p.numero);
      if (p.niveau === 1) { sectionEn = p.titre; sectionFr = q?.titre ?? null; }
      const resultat = resultatDe(p.motions);
      const procedural = PROCEDURE.test(p.titre) || PROCEDURE.test(sectionEn ?? '') || (!resultat && p.niveau === 1);
      const motionsFr = q?.motions ?? [];
      return {
        numero: p.numero,
        niveau: p.niveau,
        sectionEn: p.niveau === 1 ? null : sectionEn,
        sectionFr: p.niveau === 1 ? null : sectionFr,
        titreEn: p.titre,
        titreFr: q?.titre ?? null,
        ...dossierEtQuartier(p.description),
        descriptionEn: p.description || null,
        descriptionFr: q?.description || null,
        compteRenduEn: p.compteRendu || null,
        compteRenduFr: q?.compteRendu || null,
        texteEn: p.motions.map((m) => m.texte).filter(Boolean).join('\n\n') || null,
        texteFr: motionsFr.map((m) => m.texte).filter(Boolean).join('\n\n') || null,
        resultatEn: resultat,
        resultatFr: resultatDe(motionsFr),
        dissidences: dissidences(resultat),
        motions: p.motions.map((m, i) => ({ ...m, texteFr: motionsFr[i]?.texte ?? null, resultatFr: motionsFr[i]?.resultat ?? null })),
        pieces: p.pieces,
        procedural,
        // Un vote nominal, c'est toujours une décision, même sous un titre de cérémonie.
        decision: !!resultat && (!procedural || p.motions.some((m) => m.vote)),
      };
    });

    seances.push({ ...s, numeroSeance, points, decisions: points.filter((p) => p.decision).length });
  }

  mkdirSync('data', { recursive: true });
  writeFileSync(
    SORTIE,
    JSON.stringify(
      {
        source: `${BASE}/`,
        conditions: 'https://ottawa.ca/en/terms-use/disclaimer',
        lus: new Date().toISOString(),
        fenetre: { du: iso(du), au: iso(au) },
        nombreSeances: seances.length,
        nombreDecisions: seances.reduce((n, s) => n + s.decisions, 0),
        seances,
      },
      null,
      2
    )
  );
  console.log(`${seances.length} séances, ${seances.reduce((n, s) => n + s.decisions, 0)} décisions → ${SORTIE}`);
}

main().catch((err) => {
  console.error('Échec du scraper ottawa.js :', err.message);
  process.exitCode = 1;
});
