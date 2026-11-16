// Scraper — « En bref » : une phrase par séance du conseil d'Ottawa et de ses comités
//
// Comme sur DossierQuébec (commun/seances-en-bref.js) : au-dessus de la liste des décisions
// d'une séance, une seule phrase dit de quoi elle a surtout parlé. Rédigée par Haiku à partir
// des titres et des résultats des décisions de la séance, une passe par langue. Rien
// d'inventé, aucun jugement ; cache par séance (empreinte des titres).
//
// Usage : node scrapers/ottawa-en-bref.js [--dry-run]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';

const ENTREE = 'data/ottawa.json';
const SORTIE = 'data/ottawa-en-bref.json';
const MODELE = 'claude-haiku-4-5-20251001';

// Version du cache : 2 = phrase + mots-clés (comme DQ, scripts/resumes-seances.js). Une entrée
// d'une autre version est réécrite.
const VERSION = 2;

const CONSIGNES = {
  en: 'Write in ENGLISH. In ONE sentence of at most 30 words, say what this Ottawa municipal meeting mainly dealt with, based only on the list of decisions supplied. Plain words, no judgement, no numbers you did not read, no introduction. Then give motsCles: 2 or 3 words or short phrases (1 to 3 words) copied EXACTLY from your sentence, naming the concrete SUBJECT of each element (e.g. "zoning", "heritage designation", "snow clearing"). Never an amount, a council name or a verb.',
  fr: 'Écris en FRANÇAIS. En UNE phrase d’au plus 30 mots, dis de quoi cette séance municipale d’Ottawa a surtout traité, d’après la seule liste des décisions fournie. Mots simples, aucun jugement, aucun chiffre que tu n’as pas lu, pas d’introduction. Donne ensuite motsCles : 2 ou 3 mots ou courtes expressions (1 à 3 mots) recopiés TELS QUELS de ta phrase, qui disent le SUJET concret de chaque élément (ex. « zonage », « désignation patrimoniale », « déneigement »). Jamais un montant, un nom de conseil ou un verbe.',
};

const outil = (langue) => ({
  name: 'en_bref',
  description: langue === 'fr' ? 'Enregistre la phrase qui résume la séance et ses mots-clés.' : 'Records the sentence summarizing the meeting and its key words.',
  input_schema: {
    type: 'object',
    properties: {
      phrase: { type: 'string' },
      motsCles: { type: 'array', items: { type: 'string' } },
    },
    required: ['phrase', 'motsCles'],
  },
});

// Ne garde que les mots-clés écrits mot pour mot dans la phrase, sans montant ni mot fait de chiffres.
const garder = (mots, phrase) => (Array.isArray(mots) ? mots : [])
  .map((m) => String(m ?? '').trim())
  .filter((m) => m && phrase.includes(m) && !/\$|\d{3}/.test(m))
  .slice(0, 3);

function chargerCle() {
  if (process.env.ANTHROPIC_API_KEY) return;
  if (!existsSync('api.env')) return;
  for (const ligne of readFileSync('api.env', 'utf-8').split(/\r?\n/)) {
    const m = /^\s*ANTHROPIC_API_KEY\s*=\s*(.+?)\s*$/.exec(ligne);
    if (m) { process.env.ANTHROPIC_API_KEY = m[1].replace(/^["']|["']$/g, ''); return; }
  }
}

async function main() {
  const d = JSON.parse(readFileSync(ENTREE, 'utf-8'));
  const cache = existsSync(SORTIE) ? JSON.parse(readFileSync(SORTIE, 'utf-8')) : { modele: MODELE, enBref: {} };
  const sec = process.argv.includes('--dry-run');
  const travail = [];
  for (const s of d.seances) {
    for (const langue of ['en', 'fr']) {
      const lignes = s.points.filter((p) => p.decision).map((p) => `- ${langue === 'fr' ? p.titreFr ?? p.titreEn : p.titreEn} (${(langue === 'fr' ? p.resultatFr : p.resultatEn) ?? ''})`);
      if (!lignes.length) continue;
      const texte = `${langue === 'fr' ? s.nomFr : s.nomEn}, ${s.date}\n${lignes.join('\n')}`;
      const h = createHash('sha1').update(texte).digest('hex').slice(0, 12);
      const vieux = cache.enBref[s.id]?.[langue];
      if (vieux?.empreinte === h && vieux.version === VERSION) continue;
      travail.push({ id: s.id, langue, texte, h });
    }
  }
  console.log(`${travail.length} phrase(s) à écrire.`);
  if (sec || !travail.length) return;
  chargerCle();
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY absente.');
  const client = new Anthropic();
  let entree = 0, sortie = 0;
  for (const t of travail) {
    const m = await client.messages.create({
      model: MODELE, max_tokens: 200, system: CONSIGNES[t.langue],
      tools: [outil(t.langue)], tool_choice: { type: 'tool', name: 'en_bref' },
      messages: [{ role: 'user', content: t.texte }],
    });
    entree += m.usage.input_tokens; sortie += m.usage.output_tokens;
    const bloc = m.content.find((c) => c.type === 'tool_use')?.input;
    const phrase = typeof bloc?.phrase === 'string' ? bloc.phrase.trim().replace(/\s+/g, ' ') : '';
    if (!phrase) continue;
    cache.enBref[t.id] ??= {};
    cache.enBref[t.id][t.langue] = { phrase, motsCles: garder(bloc.motsCles, phrase), empreinte: t.h, version: VERSION, modele: MODELE, genereLe: new Date().toISOString() };
  }
  cache.maj = new Date().toISOString();
  writeFileSync(SORTIE, JSON.stringify(cache, null, 2));
  console.log(`${travail.length} écrites ; ${entree} jetons d'entrée, ${sortie} de sortie (Haiku : quelques cents).`);
}

main().catch((err) => { console.error('Échec de ottawa-en-bref.js :', err.message); process.exitCode = 1; });
