// Scraper — les avis d'audiences publiques des comités (16 nov. 2026) → data/site/audiences.json.
//
// Source : https://www.ola.org/en/legislative-business/committees/notices-hearings (la liste des avis
// actifs), puis la page de chaque avis. Lu avec le module commun (scrapers/ola.js : User-Agent honnête,
// robots.txt respecté, 2 s entre deux requêtes). Une requête pour la liste, une par avis : 3 ou 4 en tout.
// Sans IA.
//
// On ne garde que des faits courts (comité, sujet, numéro du projet de loi, dates, lieux) et le lien
// vers l'avis officiel : la clause d'ola.org permet des extraits courts, non commerciaux, avec mention.
//
// Lu par commun/audiences.js (encadré de l'accueil et de la fiche du projet de loi).
//
// Usage : node scrapers/audiences.js

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { lirePage, ADRESSE } from './ola.js';

const LISTE = `${ADRESSE.base}/en/legislative-business/committees/notices-hearings`;
const INSCRIPTION = `${ADRESSE.base}/en/apply-committees`;
const MOIS = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };
const DATE = '(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (January|February|March|April|May|June|July|August|September|October|November|December) (\\d{1,2}), (\\d{4})';
const iso = (m, j, a) => `${a}-${String(MOIS[m]).padStart(2, '0')}-${String(j).padStart(2, '0')}`;

const lignes = (html) => html
  .replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
  .replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&')
  .split('\n').map((x) => x.trim()).filter(Boolean);

function lireAvis(html, url, titreListe) {
  const t = lignes(html);
  const debut = t.findIndex((x) => x === 'Associated Committee');
  const fin = t.findIndex((x, i) => i > debut && /^Ces renseignements sont disponibles/.test(x));
  const corps = t.slice(debut, fin > 0 ? fin : undefined);
  const texte = corps.join(' ').replace(/\s+([.,;])/g, '$1');
  const comite = (corps[1] ?? '').replace(/^\[[^\]]*\]\s*/, '');
  const bill = /\[\d+-\d+ Bill (\d+)\]/.exec(corps.join(' '))?.[1] ?? null;

  // Les audiences : « in Toronto on Tuesday, November 17, 2026 » (une ou plusieurs villes).
  // Jusqu'à la dernière année suivie d'un point (« St. Catharines » contient un point).
  const phrase = /intends to hold public hearings ([\s\S]*?\d{4})\.(?:\s|$)/.exec(texte)?.[1] ?? '';
  const audiences = [...phrase.matchAll(new RegExp(`in ([A-Z][\\w .'-]+?) on ${DATE}`, 'g'))].map((m) => ({ lieu: m[1].trim(), date: iso(m[2], m[3], m[4]) }));
  // Sans lieu (« will meet on Monday, … »)
  if (!audiences.length) for (const m of texte.matchAll(new RegExp(`(?:hearings|meet)[^.]*? on ${DATE}`, 'g'))) audiences.push({ lieu: null, date: iso(m[1], m[2], m[3]) });

  // L'inscription pour témoigner : une ou plusieurs échéances (« … for Ajax and Peterborough »).
  const blocInscr = /required to register by:?([\s\S]*?)(?:Those who do not wish|To register)/.exec(texte)?.[1] ?? '';
  const inscriptions = [...blocInscr.matchAll(new RegExp(`(\\d{1,2}:\\d{2} [ap]\\.m\\.)[^,]*? on ${DATE},?(?: for ((?:St\\. |[^;.])+))?`, 'g'))]
    .map((m) => ({ date: iso(m[2], m[3], m[4]), heure: m[1], pour: m[5]?.trim() || null }));
  const mem = new RegExp(`written submission by (\\d{1,2}:\\d{2} [ap]\\.m\\.)[^,]*? on ${DATE}`).exec(texte);
  const memoire = mem ? { date: iso(mem[2], mem[3], mem[4]), heure: mem[1] } : null;

  return {
    id: url,
    titre: titreListe.replace(/,\s*public hearings$/i, '').trim(),
    comite, bill: bill ? Number(bill) : null,
    audiences, inscriptions, memoire,
    url, inscription: INSCRIPTION,
  };
}

const html = await lirePage(LISTE);
const avis = [...new Map([...html.matchAll(/href="([^"]*\/notice-hearings\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
  .map((m) => [new URL(m[1], ADRESSE.base).href, m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()])).entries()];

const items = [];
for (const [url, titre] of avis) {
  try { items.push(lireAvis(await lirePage(url), url, titre)); }
  catch (e) { console.warn(`Avis illisible (${url}) : ${e.message}`); }
}

// Réécrit seulement si les avis ont changé : sinon la date seule ferait un commit (et un déploiement) par jour.
const CHEMIN = 'data/site/audiences.json';
let avant = null;
try { avant = JSON.stringify(JSON.parse(readFileSync(CHEMIN, 'utf8')).items); } catch {}
if (avant === JSON.stringify(items)) { console.log(`Audiences publiques : ${items.length} avis, rien de changé.`); process.exit(0); }
mkdirSync('data/site', { recursive: true });
writeFileSync(CHEMIN, JSON.stringify({ generatedAt: new Date().toISOString(), source: LISTE, items }, null, 1));
console.log(`Audiences publiques : ${items.length} avis actifs.`);
