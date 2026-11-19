// Photos officielles des député·e·s (19 nov. 2026, décision de Martin).
//
// Source : la fiche de chaque député·e sur ola.org (members.json → url), où l'Assemblée publie
// un portrait (/sites/default/files/member/profile-photo/…). Lu avec scrapers/ola.js :
// User-Agent honnête, robots.txt respecté, 2 s entre deux requêtes. Un 403 ou un 404 = pas de photo.
//
// Droit d'auteur (ola.org « Copyright and privacy ») : usage non commercial avec mention de
// l'Assemblée. DossierOntario ne vend rien ; chaque photo porte le crédit
// « Legislative Assembly of Ontario » / « Assemblée législative de l'Ontario ».
//
// Sortie : photos/<identifiant>.<ext> et data/site/photos.json (identifiant → fichier, source).
// Une photo déjà téléchargée n'est pas refaite (sauf --tout).
//
// Usage : node scrapers/photos.js [--tout]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { lirePage, verifierRobots, USER_AGENT, DELAI_MS } from './ola.js';

const SORTIE = 'data/site/photos.json';
const TOUT = process.argv.includes('--tout');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const deputes = JSON.parse(readFileSync('data/site/members.json', 'utf-8')).deputes ?? [];
const cache = existsSync(SORTIE) ? JSON.parse(readFileSync(SORTIE, 'utf-8')) : {};
mkdirSync('photos', { recursive: true });

let faits = 0, sans = 0;
for (const d of deputes) {
  if (!TOUT && cache[d.identifiant] && existsSync(cache[d.identifiant].fichier)) continue;
  try {
    const html = await lirePage(d.url);
    const m = html.match(/<img[^>]+src="(\/sites\/default\/files\/member\/profile-photo\/[^"]+)"/);
    if (!m) { sans++; console.log(`  – ${d.identifiant} : pas de portrait sur la fiche`); continue; }
    const href = verifierRobots(new URL(m[1], 'https://www.ola.org').href);
    await dormir(DELAI_MS);
    const res = await fetch(href, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) { sans++; console.log(`  – ${d.identifiant} : HTTP ${res.status}`); continue; }
    const ext = (href.match(/\.(jpe?g|png|webp)$/i)?.[1] ?? 'jpg').toLowerCase().replace('jpeg', 'jpg');
    const fichier = `photos/${d.identifiant}.${ext}`;
    writeFileSync(fichier, Buffer.from(await res.arrayBuffer()));
    cache[d.identifiant] = { fichier, source: href, lu: new Date().toISOString().slice(0, 10) };
    writeFileSync(SORTIE, JSON.stringify(cache, null, 2) + '\n');
    faits++;
    console.log(`  ✓ ${d.identifiant}`);
  } catch (e) {
    sans++;
    console.log(`  ⚠ ${d.identifiant} : ${e.message}`);
  }
}
console.log(`Terminé : ${faits} photo(s), ${sans} sans photo.`);
