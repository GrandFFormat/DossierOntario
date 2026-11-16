// Scraper — les résumés en langage clair des décisions du conseil d'Ottawa
//
// Pour chaque DÉCISION lue par scrapers/ottawa.js (jamais un point de procédure), Claude tire
// une à trois puces en langage courant, une passe par langue, à partir du texte officiel DE
// CETTE LANGUE (la Ville publie ses procès-verbaux en anglais et en français). Même règles que
// scrapers/resumes.js : rien d'inventé, aucun jugement, les chiffres recopiés tels quels, et un
// drapeau « sansContenu » plutôt qu'une phrase creuse.
//
// L'argent : un résumé déjà en cache n'est refait que si le texte de la décision a changé
// (empreinte). Les textes sont courts (une recommandation de comité fait quelques lignes) :
// les deux mois d'Ottawa coûtent quelques dizaines de cents.
//
// Clé : ANTHROPIC_API_KEY, dans l'environnement ou dans api.env (jamais dans le dépôt).
//
// Usage : node scrapers/ottawa-resumes.js --dry-run
//         node scrapers/ottawa-resumes.js [--limit 20] [--langue fr]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';

const ENTREE = 'data/ottawa.json';
const SORTIE = 'data/ottawa-resumes.json';
const MODELE = 'claude-sonnet-5';
const MAX_PUCES = 3;
const TARIF = { entree: 3, sortie: 15 }; // $ US par million de jetons, 24 sept. 2026
const PARALLELE = 4;

const CONSIGNES = {
  en: `Write every bullet in ENGLISH, whatever language this instruction reaches you in.

You write plain-language summaries of Ottawa City Council and committee decisions for an independent citizen website, for residents in a hurry.

Format:
- 1 to ${MAX_PUCES} bullets, one concrete idea each, ordinary words, about fifteen words maximum.
- No introduction, no heading — bullets only.

Substance:
- Say what was decided and what it changes for residents: amounts, places, dates, obligations, who is affected. Name the ward or street when the text gives it.
- Summarise ONLY what the supplied text says. Never invent, never infer, never add context from your own knowledge.
- Stay neutral: no value judgement, no opinion, no verdict on anyone.
- Do not describe the meeting mechanics (moved by, seconded by, received, carried): the site shows the result separately.
- Never recompute or round a figure: copy it as the text gives it.
- If the text is purely procedural or too thin to summarise honestly, set sansContenu to true and return no bullets.`,
  fr: `Rédige chaque puce en FRANÇAIS, quelle que soit la langue du texte fourni.

Tu rédiges des résumés en langage clair des décisions du conseil municipal d'Ottawa et de ses comités, pour un site citoyen indépendant, pour des gens pressés.

Format :
- 1 à ${MAX_PUCES} puces, une seule idée concrète par puce, des mots ordinaires, une quinzaine de mots au maximum.
- Pas d'introduction, pas de titre — seulement les puces.

Sur le fond :
- Dis ce qui a été décidé et ce que ça change pour les gens : montants, lieux, dates, obligations, qui est touché. Nomme le quartier ou la rue quand le texte le donne.
- Résume UNIQUEMENT ce que le texte fourni dit. N'invente rien, ne déduis rien, n'ajoute rien qui vienne de tes connaissances.
- Reste neutre : aucun jugement de valeur, aucune opinion, aucun verdict sur quiconque.
- Ne décris pas la mécanique de la séance (proposée par, appuyée par, reçu, adopté) : le site affiche le résultat à part.
- Ne recalcule et n'arrondis jamais un chiffre : recopie-le tel que le texte le donne.
- Si le texte est purement procédural ou trop mince pour un résumé honnête, mets sansContenu à vrai et ne renvoie aucune puce.`,
};

const outil = (langue) => ({
  name: 'resume',
  description: langue === 'fr' ? 'Rend le résumé en puces de la décision, rédigé en français.' : 'Returns the bullet-point summary of the decision, written in English.',
  input_schema: {
    type: 'object',
    properties: {
      puces: { type: 'array', items: { type: 'string' }, maxItems: MAX_PUCES, description: langue === 'fr' ? 'Les puces, EN FRANÇAIS, sans tiret en début de ligne.' : 'The bullets, IN ENGLISH, with no leading dash.' },
      sansContenu: { type: 'boolean', description: langue === 'fr' ? 'Vrai si le texte ne permet pas un résumé honnête.' : 'True if the text does not allow an honest summary.' },
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

function chargerCle() {
  if (process.env.ANTHROPIC_API_KEY) return;
  if (!existsSync('api.env')) return;
  for (const ligne of readFileSync('api.env', 'utf-8').split(/\r?\n/)) {
    const m = /^\s*ANTHROPIC_API_KEY\s*=\s*(.+?)\s*$/.exec(ligne);
    if (m) { process.env.ANTHROPIC_API_KEY = m[1].replace(/^["']|["']$/g, ''); return; }
  }
}

/** Le texte officiel d'une décision, dans une langue : titre, quartier, recommandation, suites. */
function texteDe(seance, p, langue) {
  const fr = langue === 'fr';
  const parts = [
    fr ? `Séance : ${seance.nomFr}, ${seance.date}` : `Meeting: ${seance.nomEn}, ${seance.date}`,
    fr ? `Point ${p.numero} — ${p.titreFr ?? p.titreEn}` : `Item ${p.numero} — ${p.titreEn}`,
    fr ? p.descriptionFr : p.descriptionEn,
    fr ? p.texteFr ?? p.texteEn : p.texteEn,
    fr ? p.compteRenduFr : p.compteRenduEn,
    (fr ? 'Résultat : ' : 'Result: ') + ((fr ? p.resultatFr : p.resultatEn) ?? ''),
  ].filter(Boolean);
  return parts.join('\n\n').slice(0, 12000);
}

const empreinte = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);

async function main() {
  if (!existsSync(ENTREE)) throw new Error(`${ENTREE} manquant — lancer scrapers/ottawa.js d'abord.`);
  const donnees = JSON.parse(readFileSync(ENTREE, 'utf-8'));
  const cache = existsSync(SORTIE) ? JSON.parse(readFileSync(SORTIE, 'utf-8')) : { modele: MODELE, resumes: {} };
  cache.resumes ??= {};

  const langueDemandee = argument('langue');
  const langues = langueDemandee === 'en' || langueDemandee === 'fr' ? [langueDemandee] : ['en', 'fr'];
  const sec = process.argv.includes('--dry-run');
  const limite = Number(argument('limit', 0)) || Infinity;

  // Ce qui reste à faire : une décision sans résumé, ou dont le texte a changé.
  let liste = [];
  for (const s of donnees.seances) {
    for (const p of s.points) {
      if (!p.decision) continue;
      for (const langue of langues) {
        const texte = texteDe(s, p, langue);
        if ((p.texteEn ?? '').length + (p.compteRenduEn ?? '').length < 30) continue; // rien à résumer
        const cle = `${s.id}|${p.numero}`;
        const h = empreinte(texte);
        if (cache.resumes[cle]?.[langue]?.empreinte === h) continue;
        liste.push({ cle, langue, texte, h });
      }
    }
  }
  const total = liste.length;
  if (liste.length > limite) liste = liste.slice(0, limite);
  const jetonsEstimes = liste.reduce((n, x) => n + Math.ceil(x.texte.length / 4) + 450, 0);
  const cout = (jetonsEstimes / 1e6) * TARIF.entree + ((liste.length * 120) / 1e6) * TARIF.sortie;
  console.log(`${total} résumé(s) à faire${liste.length < total ? ` — on en prend ${liste.length}` : ''} ; estimation ~${cout.toFixed(2)} $ US.`);
  if (sec) { console.log('--dry-run : rien n\'a été dépensé.'); return; }
  if (!liste.length) { console.log('Rien à faire.'); return; }

  chargerCle();
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY absente — la mettre dans l\'environnement ou dans api.env.');
  const client = new Anthropic();

  let entree = 0, sortie = 0, ecrits = 0, i = 0;
  const travailleur = async () => {
    while (i < liste.length) {
      const item = liste[i++];
      try {
        const m = await client.messages.create({
          model: MODELE,
          max_tokens: 400,
          system: CONSIGNES[item.langue],
          tools: [outil(item.langue)],
          tool_choice: { type: 'tool', name: 'resume' },
          messages: [{ role: 'user', content: item.texte }],
        });
        entree += m.usage.input_tokens; sortie += m.usage.output_tokens;
        const bloc = m.content.find((c) => c.type === 'tool_use')?.input;
        if (!bloc) continue;
        cache.resumes[item.cle] ??= {};
        cache.resumes[item.cle][item.langue] = {
          // Le modèle renvoie parfois une chaîne au lieu d'une liste (leçon de Montréal) : on la range.
          puces: bloc.sansContenu ? [] : (Array.isArray(bloc.puces) ? bloc.puces : typeof bloc.puces === 'string' ? [bloc.puces] : []).filter((x) => typeof x === 'string' && x.trim()).slice(0, MAX_PUCES),
          sansContenu: !!bloc.sansContenu,
          empreinte: item.h,
          modele: MODELE,
          genereLe: new Date().toISOString(),
        };
        ecrits++;
      } catch (err) {
        console.warn(`  ${item.cle} (${item.langue}) : ${err.message}`);
      }
      if (ecrits % 20 === 0) process.stdout.write(`  ${ecrits}/${liste.length}\r`);
    }
  };
  await Promise.all(Array.from({ length: PARALLELE }, travailleur));

  const coutReel = (entree / 1e6) * TARIF.entree + (sortie / 1e6) * TARIF.sortie;
  cache.modele = MODELE;
  cache.avertissementEn = 'Written by AI from the official minutes published by the City of Ottawa. Not an official document.';
  cache.avertissementFr = 'Rédigé par une IA à partir du procès-verbal officiel publié par la Ville d’Ottawa. Ce n’est pas un document officiel.';
  cache.maj = new Date().toISOString();
  cache.coutCumule = Number(((cache.coutCumule ?? 0) + coutReel).toFixed(4));
  writeFileSync(SORTIE, JSON.stringify(cache, null, 2));
  console.log(`\n${ecrits} résumé(s) écrits dans ${SORTIE}. ${entree.toLocaleString('fr-CA')} jetons d'entrée, ${sortie.toLocaleString('fr-CA')} de sortie → ${coutReel.toFixed(2)} $ US cette fois, ${cache.coutCumule.toFixed(2)} $ en tout.`);
}

main().catch((err) => {
  console.error('Échec du scraper ottawa-resumes.js :', err.message);
  process.exitCode = 1;
});
