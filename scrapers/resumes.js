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

const lireCache = () =>
  existsSync(SORTIE) ? JSON.parse(readFileSync(SORTIE, 'utf-8')) : { modele: MODELE, resumes: {} };

/**
 * Le texte officiel d'un projet, dans une langue. C'est l'onglet « Bill » de la fiche
 * ola.org — le même bloc que bill-details.js mesure sans le garder.
 */
async function lireTexte(url) {
  const $ = cheerio.load(await lirePage(url));
  const brut = texte($('.bill-view-bill-tab').html() ?? '');
  return brut.length > MAX_SIGNES ? { texte: brut.slice(0, MAX_SIGNES), tronque: true } : { texte: brut, tronque: false };
}

function messageUtilisateur(fiche, langue, t) {
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
      if (dejaLa && dejaLa.derniereActivite === (fiche.derniereActivite ?? null)) continue;
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

function rangerResume(cache, item, reponse, usage) {
  const bloc = reponse?.content?.find((c) => c.type === 'tool_use')?.input ?? null;
  if (!bloc) return false;
  cache.resumes[item.numero] ??= {};
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
      prets.push({ ...item, tronque: t.tronque, message: messageUtilisateur(item.fiche, item.langue, t) });
    } catch (err) {
      console.warn(`  ${item.numero} (${item.langue}) : ${err.message}`);
    }
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${liste.length}`);
  }
  console.log(`${prets.length} texte(s) lus.`);
  if (!prets.length) return;

  let jetonsEntree = 0, jetonsSortie = 0, ecrits = 0;

  if (batch) {
    const requetes = prets.map((item) => ({
      custom_id: `${item.numero}__${item.langue}`,
      params: {
        model: MODELE,
        max_tokens: MAX_JETONS_SORTIE,
        system: CONSIGNES[item.langue],
        tools: [outil(item.langue)],
        tool_choice: { type: 'tool', name: 'resume' },
        messages: [{ role: 'user', content: item.message }],
      },
    }));
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
        const m = await client.messages.create({
          model: MODELE,
          max_tokens: MAX_JETONS_SORTIE,
          system: CONSIGNES[item.langue],
          tools: [outil(item.langue)],
          tool_choice: { type: 'tool', name: 'resume' },
          messages: [{ role: 'user', content: item.message }],
        });
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
