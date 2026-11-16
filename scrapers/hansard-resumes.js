// Résumés des séances de la Chambre (Hansard) — copie du mécanisme de DossierBC
// (scrapers/hansard-resumes.js là-bas, 15 nov. 2026), adaptée à ola.org le 16 nov. 2026.
//
// Source : la page de la session (ola.org/en/legislative-business/house-documents/parliament-44/
// session-1), qui donne un lien par jour de séance ; puis la page Hansard de ce jour, lue avec
// scrapers/ola.js (User-Agent honnête, robots.txt respecté, 2 s entre deux requêtes). Une page =
// une journée entière (vol. A le matin, vol. B l'après-midi).
//
// Version finale ou préliminaire : l'Assemblée ne l'indique nulle part sur la page (Hugette,
// 16 nov. 2026), et l'adresse ne change pas. On résume la page telle qu'elle est publiée, une seule
// fois, et la carte renvoie toujours à la transcription officielle.
//
// Français : le Journal des débats (ola.org/fr/...) a refusé l'accès à un robot (403) le 16 nov.
// 2026. On ne contourne pas : le résumé français est écrit à partir de la transcription anglaise,
// comme sur DossierBC.
//
// Droit d'auteur (ola.org « Copyright and privacy ») : extraits, usage non commercial, mention de
// l'Assemblée. La transcription est lue en mémoire, jamais enregistrée ; seul notre résumé est
// gardé, dans data/site/hansard-resumes.json, clé = date de la séance.
//
// Comme sur DossierBC : pas d'historique. DEPUIS fixe le premier jour résumé ; LIMITE le nombre
// de séances par passage. Sans ANTHROPIC_API_KEY, le script le dit et sort à 0.
//
// Usage : node scrapers/hansard-resumes.js [--estimation]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { lirePage, texte, LEGISLATURE, SESSION } from './ola.js';

const SORTIE = 'data/site/hansard-resumes.json';
const MODELE = 'claude-sonnet-5-5';
const PRIX = { entree: 2 / 1e6, sortie: 10 / 1e6 };
const MAX_SIGNES = 600000;
const LIMITE = Number(process.env.HANSARD_LIMIT || 6);
// Martin, 16 nov. 2026 : la dernière semaine de séance (2 au 5 nov.), puis une par jour de séance.
// Pas d'historique. Les ouvertures du « + » sont comptées (on-hansard-plus) pour juger le coût.
const DEPUIS = process.env.HANSARD_DEPUIS || '2026-11-02';
const ESTIMATION = process.argv.includes('--estimation');
const BASE = `https://www.ola.org/en/legislative-business/house-documents/parliament-${LEGISLATURE}/session-${SESSION}`;

const CONSIGNE = `You summarise one sitting day of the Legislative Assembly of Ontario from its official Hansard transcript, for an independent, non-partisan citizen website. Readers are in a hurry.

Return through the tool:
- "en" and "fr": the SAME summary, English and Québec French, 4 to 7 bullets. Each bullet: one idea, about 30 words at most, everyday words. Cover what the House actually did: bills debated and at which stage (second reading, committee, third reading…), main questions asked in Question Period, motions, votes and their result. For a bill debate, say what the government presented and what the opposition asked or proposed, as the transcript shows it.
- "joueurs": the people who took a significant part, at most 12. "nom" exactly as the transcript names them, "role" as the transcript gives it (minister's title, or riding), "sujet" in a few English words, "sujetFr" the same in French.
- "projets": each bill debated: "numero" (the bill number only, e.g. "140" or "Pr45"), "etape" ("second reading", "committee", "report", "third reading", "first reading", "other").

Rules:
- Only what the transcript says. Never invent, never assume. Neutral: report what each person said or asked, never judge, never characterise a person or a party ("attacked", "failed", "dodged" are forbidden).
- No quotes longer than a few words.
- French: Québec French, simple. Use « député·e » for MPP. Keep Act names in English unless the transcript gives the French title. Never put a comma before « et ».
- If the transcript is purely ceremonial or too short to summarise honestly, set sansContenu to true and return empty lists.`;

const OUTIL = {
  name: 'seance',
  description: 'Returns the summary of the sitting (en, fr), the people who took part (joueurs) and the bills debated (projets).',
  input_schema: {
    type: 'object',
    properties: {
      en: { type: 'array', items: { type: 'string' }, description: 'Bullets IN ENGLISH, 7 at most, no leading dash.' },
      fr: { type: 'array', items: { type: 'string' }, description: 'Les mêmes puces EN FRANÇAIS du Québec, 7 au maximum. Jamais de virgule devant « et ».' },
      joueurs: {
        type: 'array',
        items: {
          type: 'object',
          properties: { nom: { type: 'string' }, role: { type: 'string' }, sujet: { type: 'string' }, sujetFr: { type: 'string' } },
          required: ['nom', 'role', 'sujet', 'sujetFr'], additionalProperties: false,
        },
        description: '12 at most.',
      },
      projets: {
        type: 'array',
        items: {
          type: 'object',
          properties: { numero: { type: 'string' }, etape: { type: 'string', enum: ['first reading', 'second reading', 'committee', 'report', 'third reading', 'other'] } },
          required: ['numero', 'etape'], additionalProperties: false,
        },
      },
      sansContenu: { type: 'boolean' },
    },
    required: ['en', 'fr', 'joueurs', 'projets', 'sansContenu'],
    additionalProperties: false,
  },
  strict: true,
};

const nettoyer = (l) => (l ?? []).map((p) => String(p).trim().replace(/^[-•]\s*/, '')).filter(Boolean);
const sansVirguleEt = (s) => s.replace(/,\s+et\b/g, ' et');

async function main() {
  const liste = await lirePage(BASE);
  const jours = [...new Set(liste.match(new RegExp(`session-${SESSION}/(\\d{4}-\\d{2}-\\d{2})/hansard`, 'g')) ?? [])]
    .map((m) => m.match(/\d{4}-\d{2}-\d{2}/)[0])
    .sort((a, b) => b.localeCompare(a));

  const cache = existsSync(SORTIE) ? JSON.parse(readFileSync(SORTIE, 'utf-8')) : { seances: {} };
  cache.seances ??= {};
  const aFaire = jours.filter((j) => !cache.seances[j] && j >= DEPUIS).slice(0, LIMITE);
  console.log(`${jours.length} journée(s) de Hansard en ${LEGISLATURE}-${SESSION} ; ${aFaire.length} à résumer ce passage (limite ${LIMITE}).`);
  if (!aFaire.length) return;
  if (!ESTIMATION && !process.env.ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY absente : aucun résumé fait (le workflow GitHub a le secret).');
    return;
  }
  const client = ESTIMATION ? null : new (await import('@anthropic-ai/sdk')).default();
  let fait = 0, erreurs = 0, echecs = 0, jE = 0, jS = 0, signes = 0;
  for (const jour of aFaire) {
    const lien = `${BASE}/${jour}/hansard`;
    try {
      let brut = texte(await lirePage(lien));
      const debut = brut.indexOf('The House met');
      if (debut > 0) brut = brut.slice(debut);
      const fin = brut.lastIndexOf('Back to top');
      if (fin > 0) brut = brut.slice(0, fin);
      const tronque = brut.length > MAX_SIGNES;
      const t = brut.slice(0, MAX_SIGNES);
      signes += t.length;
      if (ESTIMATION) { console.log(`  ${jour} : ${t.length} signes`); continue; }
      const rep = await client.messages.create({
        model: MODELE,
        max_tokens: 12000,
        output_config: { effort: 'low' },
        system: CONSIGNE,
        tools: [OUTIL],
        tool_choice: { type: 'auto' },
        messages: [{ role: 'user', content: `Legislative Assembly of Ontario — Hansard, ${jour}\n${tronque ? `[Transcript cut at ${MAX_SIGNES} characters.]\n` : ''}\n<official_transcript>\n${t}\n</official_transcript>\n\nNow call the tool "seance".` }],
      });
      jE += rep.usage.input_tokens; jS += rep.usage.output_tokens;
      const b = rep.content.find((c) => c.type === 'tool_use')?.input;
      if (!b) throw new Error('aucune sortie d’outil');
      const vide = b.sansContenu || !b.en?.length || !b.fr?.length;
      cache.seances[jour] = {
        jour, lien,
        en: vide ? null : nettoyer(b.en), fr: vide ? null : nettoyer(b.fr).map(sansVirguleEt),
        joueurs: vide ? [] : (b.joueurs ?? []).slice(0, 12),
        projets: vide ? [] : (b.projets ?? []),
        faitLe: new Date().toISOString(), tronque, modele: MODELE,
      };
      writeFileSync(SORTIE, JSON.stringify(cache, null, 2) + '\n');
      fait++; echecs = 0;
      console.log(`  ✓ ${jour}${vide ? ' : sans contenu' : ''}`);
    } catch (e) {
      erreurs++;
      console.error(`  ⚠ ${jour} : ${e.message}`);
      if (!fait && ++echecs >= 3) { console.error('  ✖ 3 échecs d’affilée : on arrête.'); break; }
    }
  }
  if (ESTIMATION) {
    const e = signes / 4 + 1500 * aFaire.length, s = 1500 * aFaire.length;
    console.log(`Estimation : ~${(e * PRIX.entree + s * PRIX.sortie).toFixed(2)} $ US pour ${aFaire.length} séance(s) (${MODELE}).`);
    return;
  }
  console.log(`Terminé : ${fait} résumé(s), ${erreurs} erreur(s). Coût : ${(jE * PRIX.entree + jS * PRIX.sortie).toFixed(3)} $ US.`);
}

main().catch((e) => { console.error('hansard-resumes.js :', e); process.exitCode = 1; });
