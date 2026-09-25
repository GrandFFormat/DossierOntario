// Scraper — de quoi parle chaque séance de comité
//
// Une transcription de comité est découpée par des titres <h3> : les points de l'ordre du
// jour (« Intended appointments », « Estimates », « Committee business », le nom d'une loi…),
// mais AUSSI, les jours d'audiences publiques, chaque groupe de témoins (« Greater Sudbury
// Chamber of Commerce Laurentian University… »). Rien dans le balisage ne les distingue.
//
// On garde donc les titres qui se reconnaissent comme un point d'ordre du jour (SUJET
// ci-dessous) et on écarte le reste : le site dit de quoi le comité a parlé, il ne dresse pas
// la liste de qui est passé devant lui. Un jour qui ne s'ouvre que sur des témoins (suite
// d'audiences) n'affiche rien, plutôt qu'une liste d'organismes.
//
// Les titres bilingues séparent l'anglais du français par une balise : on garde les deux.
// Le français ne vient QUE de l'Assemblée — build-site-data.js complète un titre anglais
// seul avec la traduction qu'elle a publiée ailleurs pour le même titre, et sinon le laisse
// en anglais. Rien n'est traduit par nous.
//
// Sans ce fichier, les séances qui ne portent sur aucun projet de loi (nominations, budget
// des dépenses, rapports de la vérificatrice générale) n'étaient qu'une date et un lien.
// Une transcription publiée ne change plus : chaque adresse n'est lue qu'une fois.
//
// Usage : node scrapers/seances.js [--relire]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { lirePage } from './ola.js';

const COMITES = 'data/comites.json';
const SORTIE = 'data/seances.json';
const VERSION = 3; // monte quand l'extraction change : le cache est alors relu
const MAX_SUJETS = 4;

// « committee business » et pas « business » seul : sinon « Canadian Federation of
// Independent Business », un groupe de témoins, passait pour un point d'ordre du jour.
const SUJET =
  /\b(committee business|report|reports|estimates|appointments?|election of|consultations?|briefing|auditor general|ministry|secretariat|cabinet|vice-chairs?|subcommittee)\b|\bAct,? \d{4}\b/i;

// Certains titres bilingues n'ont PAS la balise de séparation : « Intended appointments
// Nominations prévues », « Municipal Accountability Act, 2025 Loi de 2025 sur… ». On coupe
// alors au premier mot qui ouvre la version française de l'Assemblée.
const DEBUT_FR = /\s((?:Loi|Nominations?|Budget des|Travaux|Consultations|Ministère|Rapports?|Élection|Choix|Séance)\b.*)$/;
function separer(en, fr) {
  if (fr) return { en, fr };
  const m = DEBUT_FR.exec(en);
  return m ? { en: en.slice(0, m.index).trim(), fr: m[1].trim() } : { en, fr: null };
}

const propre = (html) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, '’')
    .replace(/&#13;/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function sujetsDe(html) {
  const sujets = [];
  for (const m of html.matchAll(/<h3>([\s\S]*?)<\/h3>/g)) {
    // « <span id="P102_5622"/><span id="para75"/><span id="P102_5655"/>Pre-budget
    //   consultations <span id="P102_5680"/>Consultations prébudgétaires »
    const parts = m[1].split(/<span id="P\d+_\d+"\s*\/>/).map(propre).filter(Boolean);
    if (!parts[0] || parts[0].length > 200 || !SUJET.test(parts[0])) continue;
    const { en, fr } = separer(parts[0], parts[1] && parts[1] !== parts[0] ? parts[1] : null);
    if (!sujets.some((s) => s.en === en)) sujets.push({ en, fr });
  }
  return sujets.slice(0, MAX_SUJETS);
}

async function main() {
  if (!existsSync(COMITES)) throw new Error(`${COMITES} manquant — lancer comites.js d'abord.`);
  const comites = JSON.parse(readFileSync(COMITES, 'utf-8')).comites;
  let cache = existsSync(SORTIE) ? JSON.parse(readFileSync(SORTIE, 'utf-8')) : null;
  if (!cache || cache.version !== VERSION || process.argv.includes('--relire')) cache = { version: VERSION, sujets: {} };

  const aLire = comites.flatMap((c) => c.transcriptions.map((t) => t.url)).filter((u) => u && !(u in cache.sujets));
  console.log(`${aLire.length} transcription(s) à lire (${Object.keys(cache.sujets).length} déjà en cache).`);

  let lues = 0;
  for (const url of aLire) {
    try {
      cache.sujets[url] = sujetsDe(await lirePage(url));
      lues++;
    } catch (err) {
      console.warn(`  ${url.split('/').pop()} : ${err.message}`);
    }
    if (lues % 25 === 0 && lues) console.log(`  ${lues}/${aLire.length}`);
  }

  cache.lus = new Date().toISOString();
  cache.nombre = Object.keys(cache.sujets).length;
  writeFileSync(SORTIE, JSON.stringify(cache, null, 2));
  const vides = Object.values(cache.sujets).filter((s) => !s.length).length;
  console.log(`${lues} lue(s) ; ${cache.nombre} en cache, dont ${vides} sans sujet repérable, dans ${SORTIE}.`);
}

main().catch((err) => {
  console.error('Échec du scraper seances.js :', err.message);
  process.exitCode = 1;
});
