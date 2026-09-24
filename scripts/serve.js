// Petit serveur de développement — sert le dossier du site, rien de plus.
// Aucune dépendance : le site est du HTML, du CSS, du JS et des JSON.
//
// Usage : node scripts/serve.js [port]   (port 4173 par défaut)

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.argv[2] ?? 4173);
const RACINE = process.cwd();

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let chemin = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    if (chemin === '' || chemin.endsWith('/')) chemin += 'index.html';
    if (chemin.includes('..')) {
      res.writeHead(403).end('Hors du dossier du site');
      return;
    }

    // Adresses propres, comme sur Vercel : /bills sert bills.html.
    let complet = join(RACINE, chemin);
    let infos = await stat(complet).catch(() => null);
    if (!infos && !extname(complet)) {
      complet = `${complet}.html`;
      infos = await stat(complet).catch(() => null);
    }
    if (!infos) throw new Error('introuvable');
    if (infos.isDirectory()) {
      res.writeHead(302, { Location: `/${chemin}/index.html` }).end();
      return;
    }

    const contenu = await readFile(complet);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(complet).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(contenu);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Page introuvable');
  }
}).listen(PORT, () => console.log(`DossierOntario sur http://localhost:${PORT}`));
