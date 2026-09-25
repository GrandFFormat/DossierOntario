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
import { cleNom } from '../scrapers/ola.js';

const SORTIE = 'data/site';

const lireJson = (chemin) => (existsSync(chemin) ? JSON.parse(readFileSync(chemin, 'utf-8')) : null);

/** Les puces d'un projet dans une langue, ou null s'il n'y en a pas (ou pas d'utiles). */
const puces = (resumes, numero, langue) => {
  const r = resumes?.resumes?.[numero]?.[langue];
  return r && !r.sansContenu && r.puces?.length ? r.puces : null;
};

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

function main() {
  const bills = lireJson('data/bills.json');
  const details = lireJson('data/bill-details.json');
  const votes = lireJson('data/votes.json');
  const members = lireJson('data/members.json');
  const ministers = lireJson('data/ministers.json');
  const calendrier = lireJson('data/calendrier.json');
  const comites = lireJson('data/comites.json');
  const resumes = lireJson('data/resumes.json');

  // De quoi parle chaque séance de comité (scrapers/seances.js). Le français d'un sujet ne
  // vient que de l'Assemblée : quand une transcription donne un titre en anglais seulement
  // (« Estimates »), on reprend la traduction qu'elle a publiée ailleurs pour le même titre
  // (« Budget des dépenses ») ; sinon le titre reste en anglais. Rien n'est traduit par nous.
  const seancesLues = lireJson('data/seances.json')?.sujets ?? {};
  const frPublie = new Map();
  for (const liste of Object.values(seancesLues)) for (const s of liste) if (s.fr) frPublie.set(s.en, s.fr);
  const sujetsDe = (url) => (seancesLues[url] ?? []).map((s) => ({ en: s.en, fr: s.fr ?? frPublie.get(s.en) ?? null }));

  if (!bills) throw new Error('data/bills.json manquant — lancer les scrapers d\'abord.');
  mkdirSync(SORTIE, { recursive: true });

  const fiches = details?.fiches ?? {};

  // Le parti du parrain, résolu ICI plutôt que dans le navigateur : la page des projets ne
  // charge pas la liste des député·e·s, et ce serait 40 ko pour une pastille. cleNom() fait
  // le rapprochement entre « Flack, Hon. Rob » (fiche du projet) et « Rob Flack » (liste des
  // membres) — le même utilitaire qui avait fait passer les votes de 117 à 124 sur 124.
  const membreParNom = new Map((members?.deputes ?? []).map((d) => [cleNom(d.nom), d]));
  const partiDuParrain = (noms) => {
    for (const n of noms) {
      const d = membreParNom.get(cleNom(n));
      if (d) return d;
    }
    return null;   // un projet privé peut être parrainé par quelqu'un qui ne siège plus
  };

  // ------------------------------------------------------------------ projets
  const projets = bills.projets.map((p) => {
    const f = fiches[p.numero] ?? null;
    const parrain = partiDuParrain(p.parrains.map((x) => x.nom));
    return {
      numero: p.numero,
      type: p.type,
      typeProjet: p.typeProjet,
      titreEn: p.titreEn,
      titreFr: p.titreFr,
      parrains: p.parrains.map((x) => x.nom),
      parrainParti: parrain?.parti ?? null,
      parrainPartiFr: parrain?.partiFr ?? null,
      parrainCouleur: parrain?.couleurParti ?? null,
      statutEn: f?.statutEn ?? null,
      statutFr: f?.statutFr ?? null,
      statutDerniereEtape: f?.statutDerniereEtape ?? null,
      etape: etapeDe(f),
      premiereLecture: f?.premiereLecture ?? null,
      derniereActivite: f?.derniereActivite ?? null,
      votes: f?.votes?.length ?? 0,
      url: p.url,
      urlFr: p.urlFr,
    };
  });
  ecrire('bills', { maj: details?.lus ?? bills.lus, nombre: projets.length, projets });

  // Les résumés en langage clair (scrapers/resumes.js), À PART des projets : dans bills.json
  // ils faisaient passer la page de 86 à 157 ko compressés, pour du texte qui ne s'affiche
  // qu'une fois un pli ouvert. Un fichier par langue, que commun/on.js va chercher au premier
  // dépliement — le même arrangement que les résumés de DossierQuébec.
  //   p : les puces. Un résumé « sansContenu » n'est pas écrit : mieux vaut « pas encore de
  //       résumé » et le lien vers le texte officiel qu'une phrase creuse.
  //   t : le texte dépassait 60 000 signes et le résumé n'en couvre que le début — la carte
  //       doit le dire, sinon il passe pour le résumé du projet entier.
  for (const langue of ['en', 'fr']) {
    const parNumero = {};
    for (const p of projets) {
      const liste = puces(resumes, p.numero, langue);
      if (liste) parNumero[p.numero] = { p: liste, ...(resumes.resumes[p.numero][langue].tronque ? { t: true } : {}) };
    }
    ecrire(`resumes-${langue}`, parNumero);
  }

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

        // Une séance qui ne tombe sur aucune date du parcours officiel d'un projet peut quand
        // même porter sur lui : son sujet (scrapers/seances.js) est alors le TITRE du projet.
        // Le 3 juin 2025, le comité de l'Intérieur a siégé sur le projet 5, mais la séance
        // s'affichait sous « autres séances — sur autre chose qu'un projet de loi ». On la
        // rattache à son projet, sous un libellé qui dit seulement ce qu'elle est : une séance.
        const dejaRattachees = new Set(projetsDuComite.flatMap((p) => p.journees.map((j) => j.transcription).filter(Boolean)));
        for (const t of c.transcriptions) {
          if (!t.url || dejaRattachees.has(t.url)) continue;
          const titres = new Set(sujetsDe(t.url).map((s) => s.en));
          const projet = projetsDuComite.find((p) => titres.has(p.titreEn));
          if (!projet) continue;
          projet.journees.push({
            date: t.date ?? null,
            evenementEn: 'Committee sitting on the bill',
            evenementFr: 'Séance du comité sur le projet',
            transcription: t.url,
          });
          projet.journees.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
          if ((t.date ?? '') > (projet.derniereDate ?? '')) projet.derniereDate = t.date;
          dejaRattachees.add(t.url);
        }

        return {
          cle: c.cle,
          nomEn: c.nomEn,
          nomFr: c.nomFr,
          url: c.url,
          urlFr: c.urlFr,
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
          // Les séances qui ne se rattachent à AUCUN projet de loi étudié. Sans elles, la
          // carte annonçait « 11 transcriptions » sans en montrer une seule : les comités de
          // surveillance (Comptes publics, Règlement…) ne reçoivent pas de projets, et leurs
          // transcriptions n'étaient affichées nulle part. Les plus récentes d'abord.
          seances: (() => {
            const dejaMontrees = new Set(
              projetsDuComite.flatMap((p) => p.journees.map((j) => j.transcription).filter(Boolean))
            );
            return c.transcriptions
              .filter((t) => t.url && !dejaMontrees.has(t.url))
              .map((t) => ({ date: t.date ?? null, url: t.url, sujets: sujetsDe(t.url) }))
              .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
          })(),
        };
      }),
    });
  }

  // ------------------------------------------------------------------ aperçu
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
