// Prépare les fichiers que le site charge (data/site/*.json) à partir de ce que les
// scrapers ont lu (data/*.json).
//
// Le site n'ouvre jamais les fichiers bruts : ils contiennent le détail complet (toutes
// les étapes, les notes explicatives entières, les bureaux de circonscription), utile
// pour vérifier et pour les résumés IA plus tard, mais lourd à télécharger.
//
// Une seule transformation mérite une explication : l'ÉTAPE en cinq cases.
// ola.org ne publie pas de « numéro d'étape » ; il publie un tableau d'événements datés.
// On en déduit la case la plus avancée, et seulement à partir de ce que le tableau dit :
//   1 première lecture   — le projet a été déposé (toujours vrai)
//   2 deuxième lecture   — il y a au moins une ligne à l'étape « Second Reading »
//   3 comité             — une ligne nomme un comité
//   4 troisième lecture  — il y a au moins une ligne « Third Reading »
//   5 sanction royale    — il y a une ligne « Royal Assent »
// Rien n'est supposé : un projet sans ligne de deuxième lecture reste à l'étape 1.
//
// Usage : node scripts/build-site-data.js

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const SORTIE = 'data/site';
const MAX_NOTE = 1200; // le site affiche un extrait ; la note entière reste dans data/

const lireJson = (chemin) => (existsSync(chemin) ? JSON.parse(readFileSync(chemin, 'utf-8')) : null);

function etapeDe(fiche) {
  if (!fiche || !fiche.etapes?.length) return 1;
  const etapes = fiche.etapes;
  const aUneEtape = (motif) => etapes.some((e) => motif.test(e.etape ?? ''));
  if (aUneEtape(/Royal Assent/i)) return 5;
  if (aUneEtape(/Third Reading/i)) return 4;
  if (etapes.some((e) => e.comite)) return 3;
  if (aUneEtape(/Second Reading/i)) return 2;
  return 1;
}

// Toutes les notes explicatives s'ouvrent sur le même avertissement de l'Assemblée
// (« cette note ne fait pas partie de la loi »), parfois suivi du chapitre où le projet
// a été édicté. Le répéter sur 139 cartes n'apprend rien : le site l'affiche une fois,
// en haut de la page. On le retire donc de l'extrait — le texte reste entier dans
// data/bill-details.json, et la page du projet sur ola.org reste à un clic.
const AVERTISSEMENTS = [
  /^This Explanatory Note was written as a reader.s aid to Bill [^.]*\.\s*/i,
  /^La note explicative, rédigée à titre de service aux lecteurs du projet de loi [^.]*\.\s*/i,
  /^Bill \d+ has been enacted as Chapter [^.]*\.\s*/i,
  /^Le projet de loi \d+ a été édicté et constitue maintenant le chapitre [^.]*\.\s*/i,
];

function extrait(texte) {
  if (!texte) return null;
  let propre = texte.replace(/\s*\n\s*/g, ' ').trim();
  let change = true;
  while (change) {
    change = false;
    for (const motif of AVERTISSEMENTS) {
      if (motif.test(propre)) {
        propre = propre.replace(motif, '').trim();
        change = true;
      }
    }
  }
  return propre.length > MAX_NOTE ? `${propre.slice(0, MAX_NOTE)}…` : propre || null;
}

/**
 * Le mandat, ramené à ce qui s'y lit.
 *
 * Le texte officiel s'ouvre sur le nom du comité suivi de « Terms of Reference », puis
 * enchaîne les renvois au Règlement sur plusieurs centaines de mots. On retire cette
 * en-tête et on garde les deux premières phrases : de quoi comprendre à quoi sert le
 * comité. Le texte entier reste dans data/comites.json, et la page renvoie à ola.org.
 */
function mandatCourt(texte, nom) {
  if (!texte) return null;
  let t = texte.trim();
  if (nom && t.startsWith(nom)) t = t.slice(nom.length).trim();
  t = t.replace(/^(Terms of Reference|Mandat|Cadre de référence)\s*/i, '').trim();

  const phrases = t.split(/(?<=\.)\s+/);
  let court = '';
  for (const phrase of phrases) {
    if (court && (court + phrase).length > 360) break;
    court += (court ? ' ' : '') + phrase;
  }
  return court.length > 40 ? court : t.slice(0, 360);
}

function main() {
  const bills = lireJson('data/bills.json');
  const details = lireJson('data/bill-details.json');
  const votes = lireJson('data/votes.json');
  const members = lireJson('data/members.json');
  const ministers = lireJson('data/ministers.json');
  const calendrier = lireJson('data/calendrier.json');
  const comites = lireJson('data/comites.json');

  if (!bills) throw new Error('data/bills.json manquant — lancer les scrapers d\'abord.');
  mkdirSync(SORTIE, { recursive: true });

  const fiches = details?.fiches ?? {};

  // ------------------------------------------------------------------ projets
  const projets = bills.projets.map((p) => {
    const f = fiches[p.numero] ?? null;
    return {
      numero: p.numero,
      type: p.type,
      typeProjet: p.typeProjet,
      titreEn: p.titreEn,
      titreFr: p.titreFr,
      parrains: p.parrains.map((x) => x.nom),
      statutEn: f?.statutEn ?? null,
      statutFr: f?.statutFr ?? null,
      statutDerniereEtape: f?.statutDerniereEtape ?? null,
      etape: etapeDe(f),
      premiereLecture: f?.premiereLecture ?? null,
      derniereActivite: f?.derniereActivite ?? null,
      noteEn: extrait(f?.noteEn),
      noteFr: extrait(f?.noteFr),
      votes: f?.votes?.length ?? 0,
      url: p.url,
      urlFr: p.urlFr,
    };
  });
  ecrire('bills', { maj: details?.lus ?? bills.lus, nombre: projets.length, projets });

  // ------------------------------------------------------------------ votes
  let votesSite = [];
  if (votes) {
    votesSite = votes.votes.map((v) => ({
      url: v.url,
      urlFr: v.urlFr,
      date: v.date,
      sujetEn: v.sujetEn,
      sujetFr: v.sujetFr,
      typeEn: v.typeEn,
      typeFr: v.typeFr,
      resultatEn: v.resultatEn,
      resultatFr: v.resultatFr,
      pour: v.pour,
      contre: v.contre,
      projet: v.origine?.projet ?? null,
      // compact : [identifiant, 'pour'|'contre'] — les noms viennent de members.json
      votants: v.votants.map((x) => [x.identifiant, x.vote]),
    }));

    // Des député·e·s ont voté puis quitté l'Assemblée (trois avant les partielles du
    // 3 septembre 2026). Ils ne sont plus dans la liste des 124, mais ils ont bel et
    // bien voté : on garde leur nom, tiré de la page du vote, et on dit qu'ils ne
    // siègent plus. Effacer ces noms reviendrait à réécrire le compte rendu.
    const actuels = new Set((members?.deputes ?? []).map((d) => d.identifiant));
    const anciens = {};
    for (const vote of votes.votes) {
      for (const votant of vote.votants) {
        if (!votant.identifiant || actuels.has(votant.identifiant) || anciens[votant.identifiant]) continue;
        anciens[votant.identifiant] = {
          nom: votant.nom,
          parti: votant.parti,
          partiFr: votant.partiFr,
          circonscription: votant.circonscription,
          circonscriptionFr: votant.circonscriptionFr,
        };
      }
    }

    // Les votes dont l'Assemblée ne publie que le compte (motions d'ajournement) :
    // sans eux, le site afficherait 111 votes là où la Chambre en a tenu 115.
    const sansNoms = lireJson('data/votes-sans-noms.json');
    for (const v of sansNoms?.votes ?? []) {
      votesSite.push({
        url: v.source,
        urlFr: null,
        date: v.date,
        // Pas de sujet recopié : le procès-verbal énonce qui propose et quelle motion,
        // et le site écrit l'étiquette dans la langue du visiteur.
        sujetEn: null,
        sujetFr: null,
        motion: v.motion,
        proposePar: v.proposePar,
        typeEn: null,
        typeFr: null,
        resultatEn: v.resultatEn,
        resultatFr: v.resultatFr,
        pour: v.pour,
        contre: v.contre,
        projet: null,
        sansNoms: true,
        votants: [],
      });
    }
    votesSite.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

    ecrire('votes', { maj: votes.lus, nombre: votesSite.length, anciens, votes: votesSite });
  }

  // ------------------------------------------------------------------ député·e·s
  if (members) {
    ecrire('members', {
      maj: members.lus,
      totalSieges: members.totalSieges,
      etatPartis: members.etatPartis,
      etatPartisFr: members.etatPartisFr,
      avisEn: members.avisEn,
      avisFr: members.avisFr,
      deputes: members.deputes.map((d) => ({
        identifiant: d.identifiant,
        nom: d.nom,
        parti: d.parti,
        partiFr: d.partiFr,
        circonscription: d.circonscription,
        circonscriptionFr: d.circonscriptionFr,
        couleurParti: d.couleurParti,
        courriel: d.courriel,
        url: d.url,
      })),
    });
  }

  // ------------------------------------------------------------------ cabinet
  if (ministers) {
    ecrire('cabinet', {
      maj: ministers.lus,
      ministres: ministers.ministres,
      adjointsParlementaires: ministers.adjointsParlementaires,
      licence: ministers.source?.licence ?? null,
    });
  }

  // ------------------------------------------------------------------ comités
  //
  // L'activité vient des tableaux d'étapes des projets de loi : chaque ligne qui nomme un
  // comité est une journée où ce comité s'est penché sur ce projet. On y joint les
  // transcriptions, qui sont la seule trace publique de ce qui s'y est dit.
  if (comites) {
    const parNom = new Map((members?.deputes ?? []).map((d) => [d.identifiant, d]));

    // L'activité vient des tableaux d'étapes : chaque ligne qui nomme un comité est une
    // journée où ce comité s'est penché sur ce projet. On regroupe PAR PROJET plutôt que
    // de lister chaque ligne : « Projet 105, 4 jours » se lit mieux que quatre lignes
    // identiques à un mot près.
    const activite = new Map();
    for (const projet of projets) {
      for (const etape of fiches[projet.numero]?.etapes ?? []) {
        if (!etape.comite) continue;
        if (!activite.has(etape.comite)) activite.set(etape.comite, new Map());
        const parProjet = activite.get(etape.comite);
        if (!parProjet.has(projet.numero)) {
          parProjet.set(projet.numero, {
            numero: projet.numero,
            titreEn: projet.titreEn,
            titreFr: projet.titreFr,
            jours: new Set(),
            journees: [],
            derniereDate: null,
            dernierEvenementEn: null,
            dernierEvenementFr: null,
          });
        }
        const p = parProjet.get(projet.numero);
        if (etape.date) {
          p.jours.add(etape.date);
          p.journees.push({
            date: etape.date,
            evenementEn: etape.evenement,
            evenementFr: etape.evenementFr,
          });
        }
        if (etape.date && (!p.derniereDate || etape.date > p.derniereDate)) {
          p.derniereDate = etape.date;
          p.dernierEvenementEn = etape.evenement;
          p.dernierEvenementFr = etape.evenementFr;
        }
      }
    }

    ecrire('comites', {
      maj: comites.lus,
      comites: comites.comites.map((c) => {
        // Chaque journée porte, quand elle existe, la transcription de ce jour-là : c'est
        // la seule trace publique de ce qui s'est dit. Une journée sans transcription
        // n'est pas un trou — c'est souvent une décision prise à la Chambre (« renvoyé
        // au comité »), pas une séance du comité.
        const parDate = new Map(c.transcriptions.filter((t) => t.date).map((t) => [t.date, t.url]));

        const projetsDuComite = [...(activite.get(c.nomEn) ?? new Map()).values()]
          .map((p) => ({
            ...p,
            jours: p.jours.size,
            journees: p.journees
              .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
              .map((j) => ({ ...j, transcription: parDate.get(j.date) ?? null })),
          }))
          .sort((a, b) => (b.derniereDate ?? '').localeCompare(a.derniereDate ?? ''));

        return {
          cle: c.cle,
          nomEn: c.nomEn,
          nomFr: c.nomFr,
          url: c.url,
          urlFr: c.urlFr,
          mandatEn: mandatCourt(c.mandatEn, c.nomEn),
          mandatFr: mandatCourt(c.mandatFr, c.nomFr),
          // La couleur du parti vient de la fiche du ou de la député·e, jamais d'ailleurs.
          membres: c.membres.map((m) => {
            const d = parNom.get(m.identifiant);
            return {
              nom: m.nom,
              role: m.role,
              parti: d?.parti ?? null,
              partiFr: d?.partiFr ?? null,
              couleurParti: d?.couleurParti ?? null,
              url: d?.url ?? null,
            };
          }),
          projets: projetsDuComite,
          jours: new Set(projetsDuComite.flatMap((p) => p.derniereDate ?? [])).size,
          transcriptions: c.transcriptions.length,

        };
      }),
    });
  }

  // ------------------------------------------------------------------ aperçu
  const mouvements = [];
  for (const projet of projets) {
    const f = fiches[projet.numero];
    for (const etape of f?.etapes ?? []) {
      if (!etape.date) continue;
      mouvements.push({
        date: etape.date,
        numero: projet.numero,
        titreEn: projet.titreEn,
        titreFr: projet.titreFr,
        evenementEn: [etape.etape, etape.evenement].filter(Boolean).join(' — '),
        evenementFr: [etape.etapeFr, etape.evenementFr].filter(Boolean).join(' — ') || null,
        // Sans le comité, une ligne datée d'août semble contredire la bande « la Chambre
        // ne siège pas » : les comités, eux, siègent pendant l'ajournement.
        comiteEn: etape.comite ?? null,
        comiteFr: etape.comiteFr ?? null,
      });
    }
  }
  mouvements.sort((a, b) => b.date.localeCompare(a.date));

  ecrire('apercu', {
    maj: details?.lus ?? bills.lus,
    legislature: bills.legislature,
    session: bills.session,
    chiffres: {
      projets: projets.filter((p) => p.type === 'public').length,
      // Les projets PRIVÉS (« PR ») reçoivent presque tous la sanction royale : les
      // compter ici gonflerait le chiffre sans rien dire du travail législatif.
      sanctionnes: projets.filter((p) => p.type === 'public' && p.etape === 5).length,
      votes: votesSite.length,
      // Le lexique cite ces deux chiffres dans son explication des comités : ils doivent
      // se rafraîchir avec le reste, sinon l'explication vieillit en silence.
      projetsEnComite: projets.filter((p) => p.type === 'public' && fiches[p.numero]?.etapes?.some((e) => e.comite)).length,
      sieges: members?.totalSieges ?? null,
    },
    derniersMouvements: mouvements.slice(0, 15),
    // De quoi dire honnêtement pourquoi rien ne bouge : la Chambre est en relâche.
    calendrier: calendrier
      ? {
          derniereSeance: calendrier.derniereSeance,
          prochaineSeance: calendrier.prochaineSeance,
          enRelache: calendrier.enRelache,
          joursDepuis: calendrier.joursDepuisDerniereSeance ?? null,
        }
      : null,
  });
}

function ecrire(nom, contenu) {
  const chemin = `${SORTIE}/${nom}.json`;
  writeFileSync(chemin, JSON.stringify(contenu));
  const ko = (readFileSync(chemin).length / 1024).toFixed(1);
  console.log(`${chemin} (${ko} ko)`);
}

main();
