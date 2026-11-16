// Image de partage (og:image) du volet Ottawa, 1200 × 630, le format exact de Facebook —
// le même dessin que scripts/og-villes.js de DossierQuébec, aux couleurs de DossierOntario.
// Usage : node scripts/og-ottawa.js  → ottawa/og-ottawa.png
//
// Playwright n'est pas une dépendance de ce dépôt (le site est statique) : on emprunte
// celui de DossierQuébec, installé à côté, ou celui que PLAYWRIGHT_DIR désigne.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CANDIDATS = [process.env.PLAYWRIGHT_DIR, path.join(RACINE, 'node_modules', 'playwright'), path.join(RACINE, '..', 'dossierquebec', 'node_modules', 'playwright')].filter(Boolean);
const dossier = CANDIDATS.find((d) => existsSync(path.join(d, 'package.json')));
if (!dossier) throw new Error('Playwright introuvable (installer dans DossierQuébec, ou PLAYWRIGHT_DIR).');
const { chromium } = createRequire(path.join(dossier, 'package.json'))(dossier);

const page = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400..900&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#fff;font-family:Archivo,Arial,sans-serif;color:#131313;
  display:flex;flex-direction:column;justify-content:center;padding:0 80px;border-bottom:18px solid #C8102E}
.logo{font-size:84px;font-weight:850;letter-spacing:-.03em;line-height:1}
.logo span{color:#C8102E}
.trait{width:120px;height:8px;background:#131313;margin:40px 0 36px}
.titre{font-size:50px;font-weight:750;line-height:1.15;letter-spacing:-.015em;max-width:1000px}
.pied{margin-top:44px;font-size:24px;font-weight:600;color:#5B6570;letter-spacing:.06em;text-transform:uppercase}
</style></head><body>
<div class="logo">Dossier<span>Ontario</span> · Ottawa</div>
<div class="trait"></div>
<div class="titre">What Ottawa city council decided, in plain words.<br>Ce que le conseil municipal d’Ottawa a décidé, en mots simples.</div>
<div class="pied">Official minutes · Council · Contracts · Budget · Near me · dossierontario.ca</div>
</body></html>`;

const nav = await chromium.launch();
const p = await nav.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(page, { waitUntil: 'networkidle' });
await p.screenshot({ path: path.join(RACINE, 'ottawa', 'og-ottawa.png') });
await nav.close();
console.log('ottawa/og-ottawa.png');
