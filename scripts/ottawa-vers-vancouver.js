// Ottawa, présenté comme Vancouver (Martin, 15 nov. 2026 : « ottawa look awfull… i just finish
// vancouver, can you simply copy it over here ? », puis « adjust data »). Les pages d'ottawa/ sont une
// copie des pages du volet Vancouver de DossierBC ; elles lisent ottawa/data/*.json dans les formes de
// Vancouver. Ce script fabrique ces fichiers à partir des données d'Ottawa DÉJÀ LUES
// (data/site/ottawa*.json, data/ottawa-resumes.json, contenu/ottawa-lexique.json). Aucune requête,
// rien d'inventé : un champ qu'Ottawa ne publie pas reste vide (null, liste vide).
//
//   node scripts/ottawa-vers-vancouver.js        (après npm run ottawa ou build-site-data)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { classer, THEMES } from './ottawa-themes.js';

const lire = (f) => JSON.parse(readFileSync(f, 'utf-8'));
const O = lire('data/site/ottawa.json');
const C = lire('data/site/ottawa-conseil.json');
const B = lire('data/site/ottawa-budget.json');
const K = lire('data/site/ottawa-contrats.json');
const P = lire('data/site/ottawa-pres.json');
const R = lire('data/ottawa-resumes.json');
const LX = lire('contenu/ottawa-lexique.json');
const GEO = lire('data/site/ottawa-quartiers.json');
mkdirSync('ottawa/data', { recursive: true });
const ecrire = (nom, d) => writeFileSync(`ottawa/data/${nom}.json`, JSON.stringify(d));

const LICENCE = `${C.licence.nom} — ${C.licence.url}`;
const ATTRIBUTION = 'Contains information licensed under the Open Government Licence – City of Ottawa.';
const commun = { generatedAt: O.lus, source: O.source, licence: LICENCE, attribution: ATTRIBUTION, parametres: { annee: O.fenetre.au.slice(0, 4), depuis: O.fenetre.du, jusqua: O.fenetre.au } };
const themesLib = Object.fromEntries(Object.entries(THEMES).map(([k, v]) => [k, typeof v === 'string' ? { libelle: v } : v]));

// Les procès-verbaux nomment les votants « M. Luloff » ; les fiches des élus, « Matthew Luloff ».
// On relie l'initiale et le nom de famille ; un nom qui ne se relie à personne reste tel quel.
// Les élus en poste seulement : une période terminée (« … to February 27, 2025 ») sort de la liste.
const elus = C.elus.filter((e) => !e.periode || /present/i.test(e.periode)).map((e) => ({ ...e, complet: `${e.prenom} ${e.nom}` }));
const nomComplet = (n) => {
  const m = /^([A-Z])\.\s*(.+)$/.exec(String(n).trim());
  if (!m) return n;
  const l = elus.filter((e) => e.nom.toLowerCase() === m[2].toLowerCase() && e.prenom[0] === m[1]);
  return l.length === 1 ? l[0].complet : n;
};

// ---------------------------------------------------------------- séances et décisions
const PROCEDURE = /^(adjournment|confirmation by-law|motion to adopt|roll call|declarations of interest|confirmation of minutes|inquiries|disposition of items|notices of motion|communications|regrets|motion to introduce|approval of the agenda|announcements|ceremonial)/i;
const decisions = [], votes = [], resumes = [], textes = {};
const noms = [], idx = new Map();
const indice = (n) => { if (!idx.has(n)) { idx.set(n, noms.length); noms.push(n); } return idx.get(n); };
const vd = {};
const seances = O.seances.map((s) => {
  let divises = 0, rejetes = 0;
  for (const d of s.decisions) {
    const id = `${s.id}|${d.numero}`;
    const numero = `${s.date} #${d.numero}`;
    const pour = (d.vote?.pour ?? []).map(nomComplet), contre = (d.vote?.contre ?? []).map(nomComplet);
    const { theme, themeSource } = PROCEDURE.test(d.titreEn ?? '') ? { theme: 'procedure', themeSource: 'objet' } : classer({ objet: d.titreEn });
    if (contre.length) divises++;
    if (/lost|defeated/i.test(d.resultatEn ?? '')) rejetes++;
    decisions.push({
      id, numero, objet: d.titreEn, objetFr: d.titreFr, article: d.numero, date: s.date, annee: s.date.slice(0, 4),
      instance: s.nomEn, instanceFr: s.nomFr, seanceId: s.id, dossier: d.dossier ?? null,
      resultat: d.resultatEn, resultatFr: d.resultatFr, pdf: null, lienSource: s.urlEn, lienSourceFr: s.urlFr,
      decomptePour: d.vote ? pour.length : null, decompteContre: d.vote ? contre.length : null,
      theme, themeSource, type: 'Agenda item', unite: null, sommaireId: null, sommairePdf: null,
      dissidences: d.vote ? contre : (d.dissidences ?? []).map(nomComplet), abstentions: [], absents: [], conflits: [],
      voteEnregistre: Boolean(d.vote), quartier: d.quartier ?? null, nouveau: false,
    });
    if (d.texteEn || d.texteFr) textes[id] = { dispositif: d.texteEn || null, dispositifFr: d.texteFr || null, motifs: null };
    if (d.vote) {
      votes.push({ id, numero, objet: d.titreEn, objetFr: d.titreFr, date: s.date, annee: s.date.slice(0, 4), instance: s.nomEn, seanceId: s.id, resultat: d.resultatEn, resultatFr: d.resultatFr, lienSource: s.urlEn, decomptePour: pour.length, decompteContre: contre.length, theme, pour, contre, abstentions: [], absents: [], conflits: [], inadmissibles: [], sansVote: [] });
      const motion = d.motions?.[0];
      vd[numero] = [d.resultatEn, pour.map(indice), contre.map(indice), motion?.propose ? nomComplet(motion.propose) : null, s.urlEn];
    }
    const r = R.resumes?.[id];
    if (r?.en?.puces?.length && !r.en.sansContenu) resumes.push({ id, numero, puces: r.en.puces, pucesFr: r.fr?.puces ?? null, source: 'pv', montantPrincipal: null });
  }
  return {
    id: s.id, instance: s.nomEn, nom: s.nomEn, nomFr: s.nomFr, date: s.date, titre: `${s.nomEn} — ${s.date}`, lien: s.urlEn, lienFr: s.urlFr,
    numeroSeance: s.numeroSeance ?? null, video: Boolean(s.video), nombrePoints: s.decisions.length, nombreDivises: divises, nombreRejetes: rejetes,
    enBrefEn: s.enBrefEn, enBrefFr: s.enBrefFr, motsClesEn: s.motsClesEn ?? [], motsClesFr: s.motsClesFr ?? [], points: s.points ?? [],
  };
});
const facette = (cle) => Object.entries(decisions.reduce((a, d) => ((a[d[cle]] = (a[d[cle]] ?? 0) + 1), a), {})).map(([valeur, n]) => ({ valeur, n })).sort((a, b) => b.n - a.n);
const parInstance = Object.fromEntries(facette('instance').map((f) => [f.valeur, seances.filter((s) => s.nom === f.valeur).length]));
const nomsFr = Object.fromEntries(seances.map((s) => [s.nom, s.nomFr]));
ecrire('decisions', { ...commun, jeu: 'escribe-minutes', partiel: false, nombre: decisions.length, seancesLues: seances.length, seancesEnAttente: 0, themes: themesLib, instances: {}, instancesFr: nomsFr, facettes: { type: facette('type'), instance: facette('instance'), theme: facette('theme') }, seances, decisions });
ecrire('seances', { ...commun, nombre: seances.length, parInstance, instances: {}, instancesFr: nomsFr, seances });
ecrire('votes', { ...commun, methode: 'Recorded votes read from the minutes of each meeting (eScribe). Only items with a recorded vote are here.', nombre: votes.length, documentsAnalyses: seances.length, themes: themesLib, instancesFr: nomsFr, votes });
ecrire('votes-decisions', { noms, v: vd });
ecrire('resumes', { modele: R.modele ?? null, avertissementEn: O.avertissementEn, avertissementFr: O.avertissementFr, nombre: resumes.length, resumes });
ecrire('textes', { textes });

// ---------------------------------------------------------------- élus
const membres = elus.map((e) => {
  const p = votes.filter((v) => v.pour.includes(e.complet)).length, c = votes.filter((v) => v.contre.includes(e.complet)).length;
  const q = C.quartiers.find((x) => x.numero === e.quartier);
  return {
    nomComplet: e.complet, fonction: e.role, prenom: e.prenom, nom: e.nom, genre: null, siegeAuConseilMunicipal: true,
    districtNumero: e.quartier ?? null, district: e.quartierNom ?? null, districtFr: q?.nomFr ?? null, districtCle: e.quartier != null ? String(e.quartier) : null,
    arrondissement: q?.secteurEn ?? null, arrondissementFr: q?.secteurFr ?? null, parti: null, roles: [], comiteExecutif: false,
    telephone: e.telephone ?? null, courriel: e.courriel ?? null, site: e.site ?? null, formulaireCourriel: null, biographie: null, photo: null, lienVille: e.source ?? null,
    presence: e.presence ?? null, votes: { pour: p, contre: c, abstentions: 0, absents: 0, conflits: 0, inadmissibles: 0, sansVote: 0, total: p + c },
  };
});
ecrire('elus', { ...commun, source: C.sources?.elus?.page ?? null, nombre: membres.length, nombreTotal: membres.length, presencesNote: C.presencesNote, partis: {}, membres });

// La carte des quartiers : mêmes champs que data/districts.json de Montréal (numero, nom, anneaux).
let ouest = 180, est = -180, sud = 90, nord = -90;
const districts = GEO.features.map((f) => {
  const anneaux = f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat();
  for (const a of anneaux) for (const [x, y] of a) { ouest = Math.min(ouest, x); est = Math.max(est, x); sud = Math.min(sud, y); nord = Math.max(nord, y); }
  const n = f.properties.numero, q = C.quartiers.find((x) => x.numero === n), e = elus.find((x) => x.quartier === n);
  return { numero: n, cle: String(n), nom: f.properties.nomEn, nomFr: f.properties.nomFr, arrondissement: q?.secteurEn ?? null, arrondissementFr: q?.secteurFr ?? null, conseiller: e?.complet ?? null, anneaux };
});
ecrire('districts', { source: C.sources?.quartiers?.page ?? null, licence: LICENCE, cadre: { ouest, est, sud, nord }, districts });

// ---------------------------------------------------------------- lexique
const categories = {}, categoriesFr = {}, entrees = [], entreesFr = {};
LX.groupes.forEach((g, i) => {
  const cle = `g${i + 1}`;
  categories[cle] = g.titre.en; categoriesFr[cle] = g.titre.fr;
  for (const e of g.entrees) { entrees.push({ terme: e.terme.en, categorie: cle, definition: e.texte.en }); entreesFr[e.terme.en] = { equivalent: e.terme.fr, definition: e.texte.fr }; }
});
ecrire('lexique', { generatedAt: O.lus, source: LX.source?.en ?? null, sourceFr: LX.source?.fr ?? null, categories, nombre: entrees.length, entrees });
ecrire('lexique-fr', { categories: categoriesFr, entrees: entreesFr });

// ---------------------------------------------------------------- contrats
// Ottawa : [numéro, service, description, type, montant, fournisseur, article du règlement, période, motif].
// Pas de date d'attribution (seulement le semestre), pas de soumissionnaires : ces colonnes n'existent pas ici.
const types = [...new Set(K.c.map((r) => r[3]).filter(Boolean))].sort();
ecrire('contrats-page', {
  sources: [C.sources?.contratsH1, C.sources?.contratsH2].filter(Boolean), licence: LICENCE, attribution: ATTRIBUTION,
  extraction: K.lus, periodes: [...new Set(K.c.map((r) => r[7]))].sort(), nombre: K.c.length, types,
  // [période, montant, type, fournisseur, description, numéro, service, article, motif]
  c: K.c.map((r) => [r[7], r[4], types.indexOf(r[3]), r[5], r[2], r[0], r[1], r[6], r[8]]),
});

// ---------------------------------------------------------------- budget
ecrire('budget', { source: C.sources?.budget2026?.page ?? null, sourceTaxes: C.sources?.taxes?.page ?? null, licence: LICENCE, attribution: ATTRIBUTION, extraction: B.lus, budget: B.budget, taxes: B.taxes });

// ---------------------------------------------------------------- près de chez moi
ecrire('quartiers', {
  licence: LICENCE, attribution: ATTRIBUTION, extraction: P.lus, quartiers: C.quartiers, totaux: P.totaux, parQuartier: P.parQuartier, sources: C.sources,
  elus: membres.map(({ nomComplet, fonction, districtNumero, telephone, courriel, site, lienVille }) => ({ nomComplet, fonction, districtNumero, telephone, courriel, site, lienVille })),
});

console.log(`ottawa/data : ${decisions.length} décisions, ${votes.length} votes nominatifs, ${resumes.length} résumés, ${membres.length} élus, ${districts.length} quartiers, ${entrees.length} termes, ${K.c.length} contrats.`);
