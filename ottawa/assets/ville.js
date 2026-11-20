// CONFIGURATION DU VOLET OTTAWA pour le moteur commun des villes (20 nov. 2026).
// Le code est dans /commun/ville/moteur.js, COPIÉ de dossierquebec par son scripts/synchro-moteur.js :
// on ne le modifie jamais ici. La liste des clés est en tête de montreal/assets/ville.js (dossierquebec)
// et, pour les volets anglophones, dans la section « VOLETS ANGLOPHONES » à la fin du moteur.
//
// Ottawa : procès-verbaux en anglais ET en français (on prend celui de la langue lue), résumés IA des
// procès-verbaux, 24 quartiers (carte, fiches par quartier, coordonnées, présences au conseil),
// conflits d'intérêts déclarés.
import { libelleEn, themeEn, libelleFr, themeFr, INSTANCES_FR, ajouterLibellesFr } from './libelles-en.js';

globalThis.VILLE = {
  nom: 'Ottawa',
  province: 'DossierOntario',
  pages: {
    decisions: 'decisions-of-ottawa-city-council',
    conseil: 'ottawa-city-council',
  },
  // Copies locales : la langue (anglais par défaut, français en option) et l'impression des séances.
  chemins: { langue: '/ottawa/assets/langue.js', imprimer: '/ottawa/assets/imprimer-seance.js' },
  langueDefaut: 'en',
  cleZoom: 'dossier:zoom',
  mesure: 'https://dossierquebec.ca/commun/mesure.js',
  libelles: { libelleEn, themeEn, libelleFr, themeFr },
  regexMaire: /mayor/i,
  anglophone: true,
  date1er: true,
  textes: true,
  palmaresVotesContre: true,
  conflits: true,
  quartiers: true,
  fenetre: {
    points: ['décisions', 'decisions'],
    affichees: ['décision(s) affichée(s)', 'decision(s) shown'],
    seances: ['séances du conseil et des comités', 'Council and committee meetings'],
    point: ['décision', 'décisions', 'decision', 'decisions'],
  },
  vocabulaire: {
    lienSource: ['Procès-verbal officiel — Ville d’Ottawa ↗', 'Official minutes — City of Ottawa ↗'],
    titreFil: ['Là où le conseil s’est divisé', 'Where Council split'],
    texteExact: ['Texte exact du procès-verbal', 'Exact text from the minutes'],
    bulletins: ['vote(s) nominatif(s) consigné(s) au procès-verbal sur la période', 'recorded vote(s) in the minutes in this period'],
    pageVille: ['Page sur ottawa.ca', 'Page on ottawa.ca'],
    carte: ['Carte des {n} quartiers de la Ville d’Ottawa', 'Map of the {n} wards of the City of Ottawa'],
  },
  besoins: {
    accueil: ['decisions', 'votes', 'elus', 'resumes'],
    decisions: ['decisions', 'votes-decisions', 'votes', 'resumes'],
    votes: ['votes'],
    conseil: ['elus', 'votes', 'decisions', 'districts'],
    lexique: ['lexique'],
    sources: ['decisions', 'votes', 'elus', 'seances', 'resumes'],
  },
  porteeDe: (instance, tr, etat, EN) => (EN ? null : INSTANCES_FR[instance]) ?? etat.decisions?.instances?.[instance] ?? null,
  filSansResume: (d) => Boolean(d.dissidences?.length || d.resultat === 'Lost'),
  // Les décisions où le procès-verbal consigne au moins une voix contre (vote nominatif ou dissidence).
  chiffreVotes: (etat, tr, nombreFr) => ({ n: nombreFr((etat.decisions?.decisions ?? []).filter((d) => d.dissidences?.length).length), quoi: tr('décisions avec au moins une voix contre', 'decisions with at least one vote against') }),
  compteElus: ({ n, maires, conseillers, p }, tr, dateFr) => tr(
    `${n} membres : ${maires.length ? 'le maire, élu par toute la ville, et ' : ''}${conseillers.length} conseillers et conseillères, un par quartier. Les décomptes de votes portent sur les votes nominatifs consignés du ${dateFr(p.depuis)} au ${dateFr(p.jusqua)}.`,
    `${n} members: ${maires.length ? 'the Mayor, elected city-wide, and ' : ''}${conseillers.length} Councillors, one per ward. Vote counts cover the recorded votes in the minutes from ${dateFr(p.depuis)} to ${dateFr(p.jusqua)}.`
  ),
  lignesSources(ajouter, { etat, tr, nombreFr }) {
    ajouter(tr('Décisions (fenêtre)', 'Decisions (window)'), etat.decisions, etat.decisions ? `${nombreFr(etat.decisions.nombre)}` : '');
    ajouter(tr('Votes nominatifs consignés', 'Recorded votes in the minutes'), etat.votes, etat.votes ? `${nombreFr(etat.votes.nombre)}` : '');
    ajouter(tr('Membres du conseil', 'Council members'), etat.elus, etat.elus ? `${etat.elus.nombre}` : '');
    ajouter(tr('Séances lues (procès-verbaux)', 'Meetings read (minutes)'), etat.seances, etat.seances ? `${etat.seances.nombre}` : '');
    ajouter(tr('Décisions résumées par IA', 'Decisions summarized by AI'), etat.resumes ? { generatedAt: etat.decisions?.generatedAt } : null, etat.resumes ? `${nombreFr(etat.resumes.nombre)}` : '');
  },
  // Le procès-verbal existe en anglais et en français : on prend celui de la langue lue.
  apresChargement({ etat, EN }) {
    ajouterLibellesFr([...(etat.decisions?.decisions ?? []).flatMap((d) => [[d.instance, d.instanceFr], [d.resultat, d.resultatFr]]), ...(etat.votes?.votes ?? []).map((v) => [v.resultat, v.resultatFr]), ...Object.entries(etat.decisions?.instancesFr ?? etat.votes?.instancesFr ?? {})]);
    if (EN) return;
    for (const d of [...(etat.decisions?.decisions ?? []), ...(etat.votes?.votes ?? [])]) {
      if (d.objetFr) d.objet = d.objetFr;
      if (d.lienSourceFr) d.lienSource = d.lienSourceFr;
    }
    for (const r of etat.resumes?.resumes ?? []) if (r.pucesFr?.length) r.puces = r.pucesFr;
  },
};
