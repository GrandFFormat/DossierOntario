// Les points d'adresse de la Ville d'Ottawa, AVEC leur position (15 nov. 2026), pour la carte de
// « Près de chez moi » (même mécanisme que le volet Vancouver de DossierBC).
//
//   node scrapers/ottawa-adresses-points.js
//
// Même service ArcGIS que scrapers/ottawa-donnees.js (Municipal Address Points, maps.ottawa.ca),
// même User-Agent, 2 s entre deux requêtes. Jamais open.ottawa.ca, hub.arcgis.com ni ottawa.ca.
// Écrit data/ottawa-brut/adresses-points.json : [numéro, suffixe, rue EN, rue FR, quartier, lon, lat].
import { writeFileSync } from 'node:fs';

const UA = 'dossierontario-scraper/0.1 (projet citoyen independant, usage non commercial; +https://dossierontario.ca; contact@dossierquebec.ca)';
const SERVICE = 'https://maps.ottawa.ca/arcgis/rest/services/Address_Information/MapServer/0';
const CHAMPS = 'ADDRNUM,SUFFIX_EN,FULL_ROADNAME_EN,FULL_ROADNAME_FR,WARD';
const DELAI_MS = 2000;
let dernier = 0;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function appeler(url) {
  const att = DELAI_MS - (Date.now() - dernier);
  if (att > 0) await dormir(att);
  dernier = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
const r5 = (v) => Math.round(v * 1e5) / 1e5;
const tout = [];
for (let offset = 0; ; ) {
  const j = await appeler(`${SERVICE}/query?where=1%3D1&outFields=${CHAMPS}&returnGeometry=true&outSR=4326&orderByFields=OBJECTID&resultOffset=${offset}&resultRecordCount=1000&f=json`);
  if (j.error) throw new Error(JSON.stringify(j.error).slice(0, 200));
  const f = j.features ?? [];
  for (const { attributes: a, geometry: g } of f) {
    if (!g || g.x == null) continue;
    tout.push([a.ADDRNUM, a.SUFFIX_EN ?? null, a.FULL_ROADNAME_EN, a.FULL_ROADNAME_FR, a.WARD, r5(g.x), r5(g.y)]);
  }
  offset += f.length;
  if (offset % 20000 < 1000) console.log(`${offset}…`);
  if (!f.length || (!j.exceededTransferLimit && f.length < 1000)) break;
}
writeFileSync('data/ottawa-brut/adresses-points.json', JSON.stringify(tout));
console.log(`${tout.length} points d'adresse avec position.`);
