// Scraper — les résumés en langage clair
//
// Ce que fait ce script : pour chaque projet de loi, il lit le TEXTE OFFICIEL publié sur
// ola.org (l'onglet « Bill » de la fiche, celui que bill-details.js ne fait que mesurer) et
// demande à Claude d'en tirer trois à sept puces en langage courant. Une fois par langue, à
// partir du texte officiel DE CETTE LANGUE — jamais une traduction de l'autre : l'Ontario
// publie ses lois en anglais et en français, autant s'en servir.
//
// Ce que le résumé n'est PAS : une donnée officielle. Il est marqué, daté, et la carte le dit
// à côté. La consigne interdit explicitement d'ajouter quoi que ce soit d'absent du texte, de
// juger, et de meubler un projet purement procédural — dans ce cas le modèle lève un drapeau
// (« sansContenu ») et on n'affiche rien plutôt qu'une phrase creuse.
//
// L'argent : rien n'est jamais repayé. Un résumé déjà en cache n'est refait que si la
// DERNIÈRE ACTIVITÉ du projet a changé — c'est-à-dire si le texte a pu bouger. `--dry-run`
// chiffre le travail restant sans dépenser un sou, et `--batch` passe par l'API Batches, à
// moitié prix, pour les gros lots.
//
// Clé : ANTHROPIC_API_KEY, prise dans l'environnement ou dans api.env (jamais dans le dépôt —
// api.env est ignoré par git).
//
// Usage :
//   node scrapers/resumes.js --dry-run          ce que ça coûterait, sans rien dépenser
//   node scrapers/resumes.js --limit 10         un petit lot tout de suite (plein tarif)
//   node scrapers/resumes.js --batch            tout ce qui manque, à moitié prix
//   node scrapers/resumes.js --langue en        une seule langue
//   node scrapers/resumes.js --omnibus          relit tout, refait les lois omnibus annexe par annexe

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';
import { lirePage, texte } from './ola.js';

const DETAILS = 'data/bill-details.json';
const SORTIE = 'data/resumes.json';

const MODELE = 'claude-sonnet-5';
// Au-delà, on tronque et on le DIT au modèle : quelques projets omnibus dépassent 600 000
// signes, et les envoyer entiers coûterait plus cher que tout le reste réuni.
const MAX_SIGNES = 60000;
const MAX_PUCES = 7;
const MAX_JETONS_SORTIE = 700;
// Les lois OMNIBUS (plusieurs annexes, chacune modifiant ou créant une loi différente) : le
// titre n'en dit qu'une partie, et le texte dépasse souvent MAX_SIGNES. Pour elles on résume
// la NOTE EXPLICATIVE officielle, entière — elle couvre toutes les annexes en quelques pages —
// avec quelques puces par annexe. Voir lireTexte().
const MAX_ANNEXES = 30;
const MAX_PUCES_ANNEXE = 4;
const MAX_JETONS_OMNIBUS = 4000;

// Tarif du modèle, en dollars US par million de jetons — au 24 septembre 2026. Il ne sert
// qu'à afficher une estimation AVANT de dépenser ; le coût réel imprimé à la fin vient des
// jetons que l'API déclare. À revérifier sur la page des tarifs si l'estimation dérive.
const TARIF = { entree: 3, sortie: 15 };
const RABAIS_BATCH = 0.5;

// ⚠️ La langue de sortie s'ÉCRIT. Sans la première ligne ci-dessous, les quatre premiers
// résumés anglais sont revenus en français : la consigne était bien en anglais, mais le
// schéma de l'outil — le dernier mot que le modèle lit avant de répondre — était en français
// des deux côtés. D'où aussi `outil(langue)` plus bas, décrit dans la langue demandée.
const CONSIGNES = {
  en: `Write every bullet in ENGLISH, whatever language this instruction reaches you in.

You write plain-language summaries of Ontario bills for an independent citizen website, for readers in a hurry or who struggle with long blocks of text.

Format:
- Between 3 and ${MAX_PUCES} bullets. Never more than ${MAX_PUCES}, however complex the bill: keep the ones that matter most to the public and drop the rest.
- One concrete idea per bullet, ordinary words, about fifteen words maximum.
- No introduction, no conclusion, no heading — bullets only.

Substance:
- Summarise ONLY what the supplied text actually says. Never invent, never infer, never add context from your own knowledge.
- Stay neutral: no value judgement (good/bad, welcome/controversial), no opinion, no verdict on anyone.
- Do not describe the legislative process (readings, committee, assent) — the site already shows that elsewhere. Say what the bill DOES.
- Prefer concrete changes that reach people — amounts, obligations, prohibitions, new bodies, dates — over legal machinery.
- Never recompute or round a figure: copy it as the text gives it.
- If the text is procedural, too short or too technical to summarise honestly, set sansContenu to true and return no bullets. That is a valid answer, and a better one than padding.`,
  fr: `Rédige chaque puce en FRANÇAIS, quelle que soit la langue du texte fourni.

Tu rédiges des résumés en langage clair de projets de loi de l'Ontario pour un site citoyen indépendant, destinés à des lecteurs pressés ou qui ont de la difficulté avec les longs blocs de texte.

Format :
- Entre 3 et ${MAX_PUCES} puces. Jamais plus de ${MAX_PUCES}, même pour un projet complexe : garde celles qui comptent le plus pour le public et laisse tomber le reste.
- Une seule idée concrète par puce, des mots ordinaires, une quinzaine de mots au maximum.
- Pas d'introduction, pas de conclusion, pas de titre — seulement les puces.

Sur le fond :
- Résume UNIQUEMENT ce que le texte fourni dit vraiment. N'invente rien, ne déduis rien, n'ajoute rien qui vienne de tes connaissances.
- Reste neutre : aucun jugement de valeur (bon/mauvais, attendu/controversé), aucune opinion, aucun verdict sur quiconque.
- Ne décris pas le processus législatif (lectures, comité, sanction) — le site le montre déjà ailleurs. Dis ce que le projet FAIT.
- Privilégie les changements concrets qui touchent les gens — montants, obligations, interdictions, nouveaux organismes, dates — plutôt que la mécanique juridique.
- Ne recalcule et n'arrondis jamais un chiffre : recopie-le tel que le texte le donne.
- Si le texte est procédural, trop court ou trop technique pour être résumé honnêtement, mets sansContenu à vrai et ne renvoie aucune puce. C'est une réponse valable, et meilleure qu'un remplissage.`,
};

const CONSIGNES_OMNIBUS = {
  en: `Write everything in ENGLISH, whatever language this instruction reaches you in.

You write plain-language summaries of Ontario bills for an independent citizen website. This bill is an OMNIBUS bill: it is made of several schedules, each amending or enacting a different Act. You receive its official Explanatory Note, which covers every schedule.

Format:
- apercu: 1 or 2 bullets saying, in ordinary words, what the bill as a whole does.
- annexes: one entry per schedule, in the order of the note. numero = the schedule number; titre = the Act's name exactly as the note gives it (normal capitalisation, not all caps); puces = 1 to ${MAX_PUCES_ANNEXE} bullets, one concrete idea each, about fifteen words maximum.
- A schedule with only technical or housekeeping changes gets a single bullet saying so.

Substance:
- Summarise ONLY what the note says. Never invent, never infer, never add context from your own knowledge.
- Stay neutral: no value judgement, no opinion.
- Prefer concrete changes that reach people — amounts, obligations, prohibitions, new bodies, dates.
- Never recompute or round a figure: copy it as the text gives it.`,
  fr: `Rédige tout en FRANÇAIS, quelle que soit la langue du texte fourni.

Tu rédiges des résumés en langage clair de projets de loi de l'Ontario pour un site citoyen indépendant. Ce projet est un projet de loi OMNIBUS : il est fait de plusieurs annexes, chacune modifiant ou édictant une loi différente. Tu reçois sa note explicative officielle, qui couvre toutes les annexes.

Format :
- apercu : 1 ou 2 puces qui disent, en mots ordinaires, ce que fait le projet dans son ensemble.
- annexes : une entrée par annexe, dans l'ordre de la note. numero = le numéro de l'annexe ; titre = le nom de la loi tel que la note le donne (capitalisation normale, pas tout en majuscules) ; puces = 1 à ${MAX_PUCES_ANNEXE} puces, une idée concrète chacune, une quinzaine de mots au maximum.
- Une annexe qui ne fait que des changements techniques ou d'ordre administratif reçoit une seule puce qui le dit.

Sur le fond :
- Résume UNIQUEMENT ce que dit la note. N'invente rien, ne déduis rien, n'ajoute rien qui vienne de tes connaissances.
- Reste neutre : aucun jugement de valeur, aucune opinion.
- Privilégie les changements concrets qui touchent les gens — montants, obligations, interdictions, nouveaux organismes, dates.
- Ne recalcule et n'arrondis jamais un chiffre : recopie-le tel que le texte le donne.`,
};

const outilOmnibus = (langue) => {
  const fr = langue === 'fr';
  return {
    name: 'resume',
    description: fr ? 'Rend le résumé du projet omnibus, annexe par annexe, rédigé en français.' : 'Returns the summary of the omnibus bill, schedule by schedule, written in English.',
    input_schema: {
      type: 'object',
      properties: {
        apercu: { type: 'array', items: { type: 'string' }, maxItems: 2, description: fr ? 'Une ou deux puces sur l’ensemble, EN FRANÇAIS.' : 'One or two bullets on the whole bill, IN ENGLISH.' },
        annexes: {
          type: 'array',
          maxItems: MAX_ANNEXES,
          items: {
            type: 'object',
            properties: {
              numero: { type: 'integer' },
              titre: { type: 'string', description: fr ? 'Nom de la loi, EN FRANÇAIS, tel que la note le donne.' : 'Name of the Act, IN ENGLISH, as the note gives it.' },
              puces: { type: 'array', items: { type: 'string' }, maxItems: MAX_PUCES_ANNEXE, description: fr ? 'Les puces, EN FRANÇAIS.' : 'The bullets, IN ENGLISH.' },
            },
            required: ['numero', 'titre', 'puces'],
          },
        },
      },
      required: ['apercu', 'annexes'],
    },
  };
};

const outil = (langue) => ({
  name: 'resume',
  description:
    langue === 'fr'
      ? 'Rend le résumé en puces du projet de loi, rédigé en français.'
      : 'Returns the bullet-point summary of the bill, written in English.',
  input_schema: {
    type: 'object',
    properties: {
      puces: {
        type: 'array',
        items: { type: 'string' },
        maxItems: MAX_PUCES,
        description:
          langue === 'fr'
            ? 'Les puces, EN FRANÇAIS, sans tiret ni puce en début de ligne.'
            : 'The bullets, IN ENGLISH, with no leading dash or bullet character.',
      },
      sansContenu: {
        type: 'boolean',
        description:
          langue === 'fr'
            ? 'Vrai si le texte ne permet pas un résumé honnête (procédural, trop court, tronqué).'
            : 'True if the text does not allow an honest summary (procedural, too short, truncated).',
      },
    },
    required: ['puces'],
  },
});

function argument(nom, defaut = null) {
  const i = process.argv.indexOf(`--${nom}`);
  if (i === -1) return defaut;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

/** La clé, sans jamais la faire passer ailleurs que dans le client. */
function chargerCle() {
  if (process.env.ANTHROPIC_API_KEY) return;
  if (!existsSync('api.env')) return;
  for (const ligne of readFileSync('api.env', 'utf-8').split(/\r?\n/)) {
    const m = /^\s*ANTHROPIC_API_KEY\s*=\s*(.+?)\s*$/.exec(ligne);
    if (m) { process.env.ANTHROPIC_API_KEY = m[1].replace(/^["']|["']$/g, ''); return; }
  }
}

// --omnibus : relit chaque texte déjà résumé pour repérer les lois omnibus d'avant ce
// découpage ; seules celles-là repartent vers l'API, les autres gardent leur résumé.
const REFAIRE_OMNIBUS = process.argv.includes('--omnibus');

const lireCache = () =>
  existsSync(SORTIE) ? JSON.parse(readFileSync(SORTIE, 'utf-8')) : { modele: MODELE, resumes: {} };

/**
 * Le texte officiel d'un projet, dans une langue. C'est l'onglet « Bill » de la fiche
 * ola.org — le même bloc que bill-details.js mesure sans le garder.
 */
async function lireTexte(url) {
  const $ = cheerio.load(await lirePage(url));
  const brut = texte($('.bill-view-bill-tab').html() ?? '');
  // La note explicative : de son titre jusqu'à la formule d'édiction (« His Majesty, by and
  // with the advice… »), qui ouvre le texte de loi lui-même.
  const debut = brut.search(/EXPLANATORY NOTE|NOTE EXPLICATIVE/i);   // « note explicative » en minuscules côté français
  let note = null;
  if (debut >= 0) {
    const reste = brut.slice(debut);
    const fin = reste.search(/(His|Her) Majesty, by and with the advice|Sa Majesté, sur l[’']avis et avec le consentement/);
    note = fin > 0 ? reste.slice(0, fin) : null;
  }
  const annexes = note ? new Set([...note.matchAll(/\b(?:SCHEDULE|ANNEXE) (\d+)\b/g)].map((m) => m[1])).size : 0;
  if (annexes >= 2 && note.length <= MAX_SIGNES) return { texte: note, tronque: false, omnibus: annexes };
  return brut.length > MAX_SIGNES ? { texte: brut.slice(0, MAX_SIGNES), tronque: true } : { texte: brut, tronque: false };
}

function messageUtilisateur(fiche, langue, t) {
  if (t.omnibus) {
    return langue === 'fr'
      ? `Projet de loi ${fiche.numero} — omnibus, ${t.omnibus} annexes. Note explicative officielle :\n\n${t.texte}`
      : `Bill ${fiche.numero} — omnibus, ${t.omnibus} schedules. Official Explanatory Note:\n\n${t.texte}`;
  }
  const entete = langue === 'fr'
    ? `Projet de loi ${fiche.numero}${t.tronque ? `\n\n[Texte tronqué aux ${MAX_SIGNES} premiers signes — le projet est plus long que ça]` : ''}`
    : `Bill ${fiche.numero}${t.tronque ? `\n\n[Text truncated to the first ${MAX_SIGNES} characters — the bill is longer than that]` : ''}`;
  return `${entete}\n\n${t.texte}`;
}

/** Ce qui reste à faire : un résumé manquant, ou un projet qui a bougé depuis. */
function travailAFaire(fiches, cache, langues) {
  const liste = [];
  for (const fiche of fiches) {
    for (const langue of langues) {
      const longueur = langue === 'fr' ? fiche.longueurTexteFr : fiche.longueurTexteEn;
      const url = langue === 'fr' ? fiche.urlFr : fiche.url;
      if (!longueur || !url) continue;   // l'Ontario ne publie pas tout en français
      const dejaLa = cache.resumes?.[fiche.numero]?.[langue];
      if (dejaLa && dejaLa.derniereActivite === (fiche.derniereActivite ?? null) && !(REFAIRE_OMNIBUS && !dejaLa.annexes)) continue;
      liste.push({ numero: fiche.numero, langue, url, longueur: Math.min(longueur, MAX_SIGNES), fiche });
    }
  }
  return liste;
}

function estimer(liste, batch) {
  // Quatre signes par jeton : l'ordre de grandeur habituel pour de la prose juridique. Le
  // compte exact est celui que l'API déclare à la fin.
  const entree = liste.reduce((n, x) => n + Math.ceil(x.longueur / 4) + 400, 0);
  const sortie = liste.length * 250;
  const rabais = batch ? RABAIS_BATCH : 1;
  const cout = ((entree / 1e6) * TARIF.entree + (sortie / 1e6) * TARIF.sortie) * rabais;
  return { entree, sortie, cout };
}

const parametres = (item) => ({
  model: MODELE,
  max_tokens: item.omnibus ? MAX_JETONS_OMNIBUS : MAX_JETONS_SORTIE,
  system: (item.omnibus ? CONSIGNES_OMNIBUS : CONSIGNES)[item.langue],
  tools: [(item.omnibus ? outilOmnibus : outil)(item.langue)],
  tool_choice: { type: 'tool', name: 'resume' },
  messages: [{ role: 'user', content: item.message }],
});

function rangerResume(cache, item, reponse, usage) {
  const bloc = reponse?.content?.find((c) => c.type === 'tool_use')?.input ?? null;
  if (!bloc) return false;
  cache.resumes[item.numero] ??= {};
  if (item.omnibus) {
    const annexes = (bloc.annexes ?? [])
      .filter((a) => a?.puces?.length)
      .map((a) => ({ numero: a.numero, titre: a.titre, puces: a.puces.slice(0, MAX_PUCES_ANNEXE) }));
    if (!annexes.length) return false;
    cache.resumes[item.numero][item.langue] = {
      puces: (bloc.apercu ?? []).slice(0, 2),
      annexes,
      omnibus: item.omnibus,
      sansContenu: false,
      tronque: false,
      source: 'note-explicative',
      derniereActivite: item.fiche.derniereActivite ?? null,
      modele: MODELE,
      genereLe: new Date().toISOString(),
      jetons: usage ? { entree: usage.input_tokens, sortie: usage.output_tokens } : null,
    };
    return true;
  }
  cache.resumes[item.numero][item.langue] = {
    puces: bloc.sansContenu ? [] : (bloc.puces ?? []).slice(0, MAX_PUCES),
    sansContenu: !!bloc.sansContenu,
    tronque: !!item.tronque,
    derniereActivite: item.fiche.derniereActivite ?? null,
    modele: MODELE,
    genereLe: new Date().toISOString(),
    jetons: usage ? { entree: usage.input_tokens, sortie: usage.output_tokens } : null,
  };
  return true;
}

async function main() {
  if (!existsSync(DETAILS)) throw new Error(`${DETAILS} manquant — lancer bill-details.js d'abord.`);
  const details = JSON.parse(readFileSync(DETAILS, 'utf-8'));
  const fiches = Object.values(details.fiches ?? {});
  const cache = lireCache();
  cache.resumes ??= {};

  const langueDemandee = argument('langue');
  const langues = langueDemandee === 'en' || langueDemandee === 'fr' ? [langueDemandee] : ['en', 'fr'];
  const batch = process.argv.includes('--batch');
  const sec = process.argv.includes('--dry-run');
  const limite = Number(argument('limit', 0)) || Infinity;

  let liste = travailAFaire(fiches, cache, langues);
  const total = liste.length;
  if (liste.length > limite) liste = liste.slice(0, limite);

  const est = estimer(liste, batch);
  console.log(`${total} résumé(s) à faire${liste.length < total ? ` — on en prend ${liste.length}` : ''}.`);
  console.log(
    `  estimation : ~${est.entree.toLocaleString('fr-CA')} jetons d'entrée, ~${est.sortie.toLocaleString('fr-CA')} de sortie` +
      ` → ~${est.cout.toFixed(2)} $ US${batch ? ' (API Batches, moitié prix)' : ''}`
  );
  if (sec) { console.log('--dry-run : rien n\'a été dépensé.'); return; }
  if (!liste.length) { console.log('Rien à faire.'); return; }

  chargerCle();
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY absente — la mettre dans l\'environnement ou dans api.env (jamais dans le dépôt).');
  }
  const client = new Anthropic();

  // Les textes d'abord : ola.org impose 2 s entre deux lectures, on ne veut pas payer l'API
  // pour découvrir ensuite qu'une page ne répond pas.
  console.log('Lecture des textes officiels sur ola.org…');
  const prets = [];
  for (const [i, item] of liste.entries()) {
    try {
      const t = await lireTexte(item.url);
      if (!t.texte || t.texte.length < 200) { console.warn(`  ${item.numero} (${item.langue}) : texte trop court, sauté`); continue; }
      const dejaLa = cache.resumes?.[item.numero]?.[item.langue];
      if (REFAIRE_OMNIBUS && !t.omnibus && dejaLa && dejaLa.derniereActivite === (item.fiche.derniereActivite ?? null)) continue;
      prets.push({ ...item, tronque: t.tronque, omnibus: t.omnibus ?? 0, message: messageUtilisateur(item.fiche, item.langue, t) });
    } catch (err) {
      console.warn(`  ${item.numero} (${item.langue}) : ${err.message}`);
    }
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${liste.length}`);
  }
  console.log(`${prets.length} texte(s) lus.`);
  if (!prets.length) return;

  let jetonsEntree = 0, jetonsSortie = 0, ecrits = 0;

  if (batch) {
    const requetes = prets.map((item) => ({ custom_id: `${item.numero}__${item.langue}`, params: parametres(item) }));
    console.log(`Envoi d'un lot de ${requetes.length} demandes à l'API Batches…`);
    const lot = await client.messages.batches.create({ requests: requetes });
    console.log(`  lot ${lot.id} — on attend (ça peut prendre de quelques minutes à quelques heures).`);
    let etat = lot;
    while (etat.processing_status !== 'ended') {
      await new Promise((r) => setTimeout(r, 30000));
      etat = await client.messages.batches.retrieve(lot.id);
      const c = etat.request_counts;
      process.stdout.write(`\r  ${c.succeeded} réussies, ${c.errored} en erreur, ${c.processing} en cours…   `);
    }
    process.stdout.write('\n');
    const parId = new Map(prets.map((x) => [`${x.numero}__${x.langue}`, x]));
    for await (const res of await client.messages.batches.results(lot.id)) {
      const item = parId.get(res.custom_id);
      if (!item || res.result.type !== 'succeeded') { console.warn(`  ${res.custom_id} : ${res.result.type}`); continue; }
      const m = res.result.message;
      jetonsEntree += m.usage.input_tokens; jetonsSortie += m.usage.output_tokens;
      if (rangerResume(cache, item, m, m.usage)) ecrits++;
    }
  } else {
    for (const [i, item] of prets.entries()) {
      try {
        const m = await client.messages.create(parametres(item));
        jetonsEntree += m.usage.input_tokens; jetonsSortie += m.usage.output_tokens;
        if (rangerResume(cache, item, m, m.usage)) ecrits++;
      } catch (err) {
        console.warn(`  ${item.numero} (${item.langue}) : ${err.message}`);
      }
      if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${prets.length}`);
    }
  }

  const rabais = batch ? RABAIS_BATCH : 1;
  const cout = ((jetonsEntree / 1e6) * TARIF.entree + (jetonsSortie / 1e6) * TARIF.sortie) * rabais;
  cache.modele = MODELE;
  cache.avertissementEn =
    'Written by AI from the official text published on ola.org, not from the law as amended since. Not an official document.';
  cache.avertissementFr =
    'Rédigé par une IA à partir du texte officiel publié sur ola.org, et non de la loi telle qu’amendée depuis. Ce n’est pas un document officiel.';
  cache.maj = new Date().toISOString();
  cache.nombre = Object.keys(cache.resumes).length;
  cache.coutCumule = Number(((cache.coutCumule ?? 0) + cout).toFixed(4));
  writeFileSync(SORTIE, JSON.stringify(cache, null, 2));

  console.log(
    `${ecrits} résumé(s) écrits dans ${SORTIE}. ` +
      `${jetonsEntree.toLocaleString('fr-CA')} jetons d'entrée, ${jetonsSortie.toLocaleString('fr-CA')} de sortie ` +
      `→ ${cout.toFixed(2)} $ US cette fois, ${cache.coutCumule.toFixed(2)} $ en tout.`
  );
}

main().catch((err) => {
  console.error('Échec du scraper resumes.js :', err.message);
  process.exitCode = 1;
});
