// Scraper — les données ouvertes de la Ville d'Ottawa (volet de ville)
//
// Tout ce qui, autour des décisions (scrapers/ottawa.js), fait un volet de ville complet :
//   - les élu·e·s et les quartiers (carte), la présence aux séances du conseil ;
//   - les taxes municipales par quartier (2022-2026) et le budget provisoire 2026 ;
//   - les contrats de 25 000 $ et plus attribués par délégation de pouvoir (2025) ;
//   - les travaux à venir, les parcs et les permis de construire 2026 (« Près de chez moi ») ;
//   - les 405 000 points d'adresse, pour trouver son quartier à partir de sa rue.
//
// Les sources : le portail de données ouvertes d'Ottawa (open.ottawa.ca, licence
// « Open Government Licence – City of Ottawa », version 2.0). Le portail lui-même demande
// 60 s entre deux requêtes dans son robots.txt : on ne le lit JAMAIS ici. On lit les services
// ArcGIS derrière (services.arcgis.com, maps.ottawa.ca) et le dépôt des fichiers
// (www.arcgis.com), qui n'imposent rien ; on s'impose 2 s. User-Agent honnête.
//
// Les lectures brutes vont dans data/ottawa-brut/ (hors git : le dump des adresses pèse
// 60 Mo). Si un fichier brut est déjà là, il n'est pas rechargé ; --recharger force tout.
// Le résultat utile au site va dans data/ottawa-ville.json et data/ottawa-adresses.json.
//
// Usage : node scrapers/ottawa-donnees.js [--recharger] [--sans-adresses]

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const BRUT = 'data/ottawa-brut';
const UA = 'dossierontario-scraper/0.1 (projet citoyen independant, usage non commercial; +https://dossierontario.ca; contact@dossierquebec.ca)';
const DELAI_MS = 2000;
const ITEM = (id) => `https://www.arcgis.com/sharing/rest/content/items/${id}`;

// Les jeux de données, tels que publiés par la Ville (identifiants ArcGIS Online).
const SOURCES = {
  elus: { id: 'd099928f2e344b1b909fcf63e5acf3d1', titre: 'Elected Officials 2022-2026', service: 'https://services.arcgis.com/G6F8XLCl5KtAlZ2G/arcgis/rest/services/_Elected_Officials_2022_2026/FeatureServer/0' },
  quartiers: { id: '8973061e1b0c4cd09b4495088c04c310', titre: 'Wards 2022-2026', service: 'https://services.arcgis.com/G6F8XLCl5KtAlZ2G/arcgis/rest/services/Wards_2022_2026/FeatureServer/0', geo: true },
  presences: { id: '0e442133d368423688d9128ecf667ee1', titre: 'City Council Meeting Attendance 2022-2026', service: 'https://services.arcgis.com/G6F8XLCl5KtAlZ2G/arcgis/rest/services/CityCouncilMeeting_Test/FeatureServer/0' },
  taxes: { id: '0d206f9a4bbd4b1b908eb4251086f343', titre: 'Taxes by Ward 2022-2026', service: 'https://services.arcgis.com/G6F8XLCl5KtAlZ2G/arcgis/rest/services/Test123/FeatureServer/0', geo: true },
  contratsH1: { id: '14cca5b087f74d2d9eadc018c261d1b3', titre: '2025 Contracts Awarded greater than 25,000 Jan - Jun', service: 'https://services.arcgis.com/G6F8XLCl5KtAlZ2G/arcgis/rest/services/2025_Contracts_Awarded_greater_than_25000_Jan_-_Jun/FeatureServer/0' },
  contratsH2: { id: '6d5248355ab64d49a3222f512710ebb7', titre: '2025 Contracts Awarded greater than 25,000 Jul - Dec', service: 'https://services.arcgis.com/G6F8XLCl5KtAlZ2G/arcgis/rest/services/Contracts_25000_Awarded_DOA_Jul_Dec_2025/FeatureServer/0' },
  budget2026: { id: 'e88c52d7727e4a9dba6d427c9bd6445c', titre: '2026 Draft Budget Explorer - Datasets', fichier: 'zip' },
  travauxLineaires: { id: 'd2fe8f7e3cf24615b62dfc954b5c26b9', titre: 'Construction — road resurfacing, watermain, sewer, pathways, bike lanes', service: 'https://maps.ottawa.ca/arcgis/rest/services/ConstructionForecastData/MapServer/0', geo: true },
  travauxPoints: { id: 'b2395e56baf148ee88eef9e20c43e12c', titre: 'Upcoming construction — facilities, culverts, parks, bridges', service: 'https://maps.ottawa.ca/arcgis/rest/services/ConstructionForecastData/MapServer/1', geo: true },
  parcs: { id: 'cfb079e407494c33b038e86c7e05288e', titre: 'Parks and Greenspace', service: 'https://maps.ottawa.ca/arcgis/rest/services/Parks_Inventory/MapServer/24' },
  permis2026: { id: 'a8992582cb764c1a9edaebfb0b30e9c7', titre: 'Construction, Demolition, and Pool Permits 2026', fichier: 'xlsx' },
  adresses: { id: '03ba03fdf8e2486ca94fe64ad2c99102', titre: 'Municipal Address Points', service: 'https://maps.ottawa.ca/arcgis/rest/services/Address_Information/MapServer/0', champs: 'ADDRNUM,SUFFIX_EN,FULL_ROADNAME_EN,FULL_ROADNAME_FR,WARD,POSTAL_CODE,MUNICIPALITY' },
};
const LICENCE = { nom: 'Open Government Licence – City of Ottawa, version 2.0', url: 'https://ottawa.ca/en/city-hall/get-know-your-city/open-data#open-data-licence-version-2-0' };

let dernier = 0;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function appeler(url) {
  const att = DELAI_MS - (Date.now() - dernier);
  if (att > 0) await dormir(att);
  dernier = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  return res;
}

const RECHARGER = process.argv.includes('--recharger');
const SANS_ADRESSES = process.argv.includes('--sans-adresses');

/** Une couche ArcGIS entière, page par page (1000 ou 2000 par page selon le serveur). */
async function lireCouche(cle) {
  const s = SOURCES[cle];
  const chemin = `${BRUT}/${cle}.json`;
  if (!RECHARGER && existsSync(chemin)) {
    const j = JSON.parse(readFileSync(chemin, 'utf-8'));
    // Un dump brut d'ArcGIS garde les enveloppes { attributes } : on les retire ici.
    return Array.isArray(j) ? j.map((x) => (x && x.attributes ? x.attributes : x)) : j;
  }
  console.log(`  ${s.titre} : lecture…`);
  let tout = [], offset = 0;
  for (;;) {
    const q = `${s.service}/query?where=1%3D1&outFields=${encodeURIComponent(s.champs ?? '*')}&returnGeometry=${s.geo ? 'true' : 'false'}&outSR=4326&resultOffset=${offset}&resultRecordCount=1000&f=${s.geo ? 'geojson' : 'json'}`;
    const j = await (await appeler(q)).json();
    if (j.error) throw new Error(JSON.stringify(j.error).slice(0, 200));
    const f = j.features ?? [];
    tout = tout.concat(s.geo ? f : f.map((x) => x.attributes));
    offset += f.length;
    if (offset % 20000 === 0) console.log(`    ${offset}…`);
    if (!j.exceededTransferLimit && f.length < 1000) break;
  }
  const sortie = s.geo ? { type: 'FeatureCollection', features: tout } : tout;
  writeFileSync(chemin, JSON.stringify(sortie));
  console.log(`    ${tout.length} enr.`);
  return sortie;
}

/** Un fichier déposé sur ArcGIS Online (zip, xlsx), tel quel. */
async function lireFichier(cle) {
  const s = SOURCES[cle];
  const chemin = `${BRUT}/${cle}.${s.fichier}`;
  if (!RECHARGER && existsSync(chemin)) return readFileSync(chemin);
  console.log(`  ${s.titre} : téléchargement…`);
  const res = await appeler(`${ITEM(s.id)}/data`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(chemin, buf);
  return buf;
}

// ------------------------------------------------------------------ zip, CSV, xlsx (sans dépendance)
/** Les fichiers d'un zip (méthode « stored » ou « deflate »), par nom. */
function dezipper(buf) {
  const fichiers = {};
  let i = 0;
  while (i + 30 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    const methode = buf.readUInt16LE(i + 8);
    const flags = buf.readUInt16LE(i + 6);
    let tailleComp = buf.readUInt32LE(i + 18);
    const nomLen = buf.readUInt16LE(i + 26), extraLen = buf.readUInt16LE(i + 28);
    const nom = buf.toString('utf8', i + 30, i + 30 + nomLen);
    const debut = i + 30 + nomLen + extraLen;
    if (flags & 8) {
      // Tailles dans un descripteur APRÈS les données : on les prend dans le répertoire central.
      const central = buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
      let c = central;
      while (c >= 0 && c + 46 <= buf.length && buf.readUInt32LE(c) === 0x02014b50) {
        const n = buf.toString('utf8', c + 46, c + 46 + buf.readUInt16LE(c + 28));
        if (n === nom) { tailleComp = buf.readUInt32LE(c + 20); break; }
        c += 46 + buf.readUInt16LE(c + 28) + buf.readUInt16LE(c + 30) + buf.readUInt16LE(c + 32);
      }
    }
    const donnees = buf.subarray(debut, debut + tailleComp);
    fichiers[nom] = methode === 8 ? inflateRawSync(donnees) : donnees;
    i = debut + tailleComp + ((flags & 8) ? 16 : 0);
    // Certains descripteurs n'ont pas de signature : on se recale sur l'entrée suivante.
    const prochain = buf.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]), debut + tailleComp);
    if (prochain === -1) break;
    i = prochain;
  }
  return fichiers;
}

/** Un CSV (guillemets, virgules dans les champs) en tableaux de chaînes. */
function lireCsv(texte) {
  const lignes = [];
  let champ = '', ligne = [], guill = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guill) {
      if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') guill = false;
      else champ += c;
    } else if (c === '"') guill = true;
    else if (c === ',') { ligne.push(champ); champ = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texte[i + 1] === '\n') i++;
      ligne.push(champ); lignes.push(ligne); ligne = []; champ = '';
    } else champ += c;
  }
  if (champ || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  return lignes.filter((l) => l.some((x) => x.trim()));
}

/** Les CSV de la Ville sont tantôt en latin-1, tantôt en UTF-8 avec BOM : on devine. */
function decoder(buf) {
  const utf8 = buf.toString('utf8');
  // Windows-1252, pas latin-1 : l'apostrophe courbe de la Ville (0x92) n'existe qu'en 1252.
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(buf) : utf8.replace(/^﻿/, '');
}

/** Les feuilles d'un classeur xlsx : { nom: [[cellules…]…] }, sans dépendance. */
function lireXlsx(buf) {
  const z = dezipper(buf);
  const dec = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
  const partagees = [...(z['xl/sharedStrings.xml']?.toString('utf8') ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    dec([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''))
  );
  const noms = [...(z['xl/workbook.xml']?.toString('utf8') ?? '').matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="rId(\d+)"/g)];
  const feuilles = {};
  for (const [, nom, rid] of noms) {
    const xml = z[`xl/worksheets/sheet${rid}.xml`]?.toString('utf8');
    if (!xml) continue;
    const lignes = [];
    for (const r of xml.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)) {
      const cellules = {};
      for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const col = c[1], attrs = c[2] ?? '', corps = c[3] ?? '';
        const v = /<v>([\s\S]*?)<\/v>/.exec(corps)?.[1];
        if (v == null) { const is = /<t[^>]*>([\s\S]*?)<\/t>/.exec(corps)?.[1]; if (is != null) cellules[col] = dec(is); continue; }
        cellules[col] = /t="s"/.test(attrs) ? partagees[Number(v)] ?? '' : v;
      }
      lignes.push(cellules);
    }
    feuilles[nom] = lignes;
  }
  return feuilles;
}

// ------------------------------------------------------------------ géométrie
/** Point dans polygone (rayon), pour un Polygon ou un MultiPolygon GeoJSON. */
function dansPolygone([x, y], geometrie) {
  const anneaux = geometrie.type === 'Polygon' ? [geometrie.coordinates] : geometrie.coordinates;
  for (const poly of anneaux) {
    let dedans = false;
    for (let r = 0; r < poly.length; r++) {
      const an = poly[r];
      let dans = false;
      for (let i = 0, j = an.length - 1; i < an.length; j = i++) {
        const [xi, yi] = an[i], [xj, yj] = an[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dans = !dans;
      }
      if (r === 0) dedans = dans; else if (dans) dedans = false; // un trou
    }
    if (dedans) return true;
  }
  return false;
}

const arrondir = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;
const simplifierGeo = (g) => ({
  type: g.type,
  coordinates: g.type === 'Polygon'
    ? g.coordinates.map((an) => an.filter((_, i) => i % 2 === 0 || i === an.length - 1).map((p) => p.map((v) => arrondir(v))))
    : g.coordinates.map((poly) => poly.map((an) => an.filter((_, i) => i % 2 === 0 || i === an.length - 1).map((p) => p.map((v) => arrondir(v))))),
});

const nombre = (s) => { const n = Number(String(s ?? '').replace(/[$,\s%]/g, '')); return Number.isFinite(n) ? n : null; };
const cleNom = (s) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

// ------------------------------------------------------------------ main
async function main() {
  mkdirSync(BRUT, { recursive: true });
  const lus = new Date().toISOString();

  // --- Élu·e·s
  console.log('Élu·e·s et quartiers');
  const elusBruts = await lireCouche('elus');
  const elus = elusBruts.map((a) => {
    const periode = /\((.+?)\)/.exec(a.Ward_name ?? '')?.[1] ?? null;
    return {
      quartier: a.Ward_number ? Number(a.Ward_number) : null,
      quartierNom: (a.Ward_name ?? '').replace(/\s*\(.+?\)\s*/, '').trim() || null,
      role: a.Primary_Role,
      prenom: (a.First_name ?? '').trim(),
      nom: (a.Last_name ?? '').trim(),
      courriel: a.Email || null,
      site: a.Website || null,
      telephone: a.Phone || null,
      periode,
      source: a.Source_URL || null,
    };
  });

  // --- Quartiers (carte)
  const quartiersGeo = await lireCouche('quartiers');
  const quartiers = quartiersGeo.features.map((f) => ({
    numero: Number(f.properties.WARD),
    nomEn: f.properties.NAME,
    nomFr: f.properties.NAME_FR,
    secteurEn: f.properties.SECTOR_EN,
    secteurFr: f.properties.SECTOR_FR,
    geometrie: simplifierGeo(f.geometry),
  })).sort((a, b) => a.numero - b.numero);
  const quartierDe = (lon, lat) => quartiersGeo.features.find((f) => dansPolygone([lon, lat], f.geometry))?.properties.WARD;

  // --- Présences aux séances du conseil (depuis le 2 oct. 2024, dit la Ville)
  console.log('Présences');
  const presBrut = await lireCouche('presences');
  const seancesPres = new Map();
  for (const r of presBrut) {
    const d = r.meeting_date_str ?? String(r.meeting_date).slice(0, 10);
    if (!seancesPres.has(d)) seancesPres.set(d, new Set());
    // « Mayor Mark Sutcliffe », « Councillor Matt Luloff » : on garde le NOM DE FAMILLE (Matt / Matthew).
    seancesPres.get(d).add(cleNom((r.attendees_present ?? '').trim().split(/\s+/).pop()));
  }
  const dates = [...seancesPres.keys()].sort();
  const presences = elus.map((e) => {
    const cle = cleNom(e.nom.split(/\s+/).pop());
    // Un·e élu·e n'est compté·e que sur les séances tenues pendant son mandat (Osgoode : deux
    // personnes dans la législature). On borne par la première et la dernière présence connue.
    const datesPresent = dates.filter((d) => seancesPres.get(d).has(cle));
    if (!datesPresent.length) return { nom: `${e.prenom} ${e.nom}`.trim(), presents: 0, seances: 0, taux: null };
    const du = e.periode?.includes('to present') ? datesPresent[0] : dates[0];
    const au = e.periode?.includes('to February') ? datesPresent.at(-1) : dates.at(-1);
    const fenetre = dates.filter((d) => d >= du && d <= au);
    return { nom: `${e.prenom} ${e.nom}`.trim(), presents: datesPresent.length, seances: fenetre.length, taux: Math.round((100 * datesPresent.length) / fenetre.length), du, au };
  });

  // --- Taxes municipales par quartier
  console.log('Taxes par quartier');
  const taxesGeo = await lireCouche('taxes');
  const taxes = taxesGeo.features.map((f) => {
    const p = f.properties;
    const annees = {};
    for (const an of [2022, 2023, 2024, 2025, 2026]) {
      const cva = p[`F_${an}_Current_Value_Assessment__CVA_`], tx = p[`F${an}_Municipal_Taxes`], pct = p[`F${an}_Percent_of_Total`];
      if (cva != null || tx != null) annees[an] = { evaluation: nombre(cva), taxes: nombre(tx), part: nombre(pct) };
    }
    return { quartier: Number(p.WARD), nomEn: p.NAME, nomFr: p.NAME_FR, secteurEn: p.SECTOR_EN, secteurFr: p.SECTOR_FR, annees };
  }).sort((a, b) => a.quartier - b.quartier);

  // --- Budget provisoire 2026 (neuf CSV dans un zip)
  console.log('Budget 2026');
  const zip = dezipper(await lireFichier('budget2026'));
  const csv = (nom) => { const k = Object.keys(zip).find((n) => n.endsWith(nom)); return k ? lireCsv(decoder(zip[k])) : []; };
  const sansTete = (l) => l.slice(1);
  const budget = {
    note: 'Les fichiers de la Ville ne nomment pas l’unité des montants. Leur somme (fonctionnement 2026 : 5 220 570) correspond à un budget d’environ 5,2 milliards de dollars : les montants sont donc en milliers de dollars. C’est une déduction, pas une mention officielle.',
    fonctionnementDepenses: sansTete(csv('1_Operating_overview_expenditure.csv')).map(([en, fr, total, etp, varEtp, annee]) => ({ comiteEn: en, comiteFr: fr, total: nombre(total), etp: nombre(etp), variationEtp: nombre(varEtp), annee: Number(annee) })),
    fonctionnementRevenus: sansTete(csv('1_Operating_overview_revenue.csv')).map(([en, fr, total, annee]) => ({ sourceEn: en, sourceFr: fr, total: nombre(total), annee: Number(annee) })),
    immobilisationsParComite: sansTete(csv('2_Capital_program_by_committee.csv')).map(([en, fr, total, annee]) => ({ comiteEn: en, comiteFr: fr, total: nombre(total), annee: Number(annee) })),
    immobilisationsParFinancement: sansTete(csv('2_Capital_program_by_funding_src.csv')).map(([en, fr, annee, total]) => ({ sourceEn: en, sourceFr: fr, annee: Number(annee), total: nombre(total) })),
    immobilisationsParCategorie: sansTete(csv('2_Capital_program_by_service_category.csv')).map(([en, fr, total, annee]) => ({ categorieEn: en, categorieFr: fr, total: nombre(total), annee: Number(annee) })),
    reserves: sansTete(csv('3_Reserve_fund_Discretionaryreserves.csv')).map(([annee, typeEn, typeFr, nomEn, nomFr, ouverture, fermeture]) => ({ annee: Number(annee), typeEn, typeFr, nomEn, nomFr, ouverture: nombre(ouverture), fermeture: nombre(fermeture) })),
    frais: sansTete(csv('4_Rates_fees_and_charges.csv')).map((c) => ({ serviceEn: c[0], serviceFr: c[1], comiteEn: c[2], comiteFr: c[3], secteurEn: c[4], secteurFr: c[5], descriptionEn: c[6], descriptionFr: c[7], frais2025: c[9], frais2026: c[11], augmentation: c[13], envigueur: c[14] })),
    projetsImmobilisations: sansTete(csv('5_Exp_brkd_by_cttee_OP_CA.csv')).map((c) => ({ serviceEn: c[0], serviceFr: c[1], comiteEn: c[2], comiteFr: c[3], secteurEn: c[4], secteurFr: c[5], projetEn: c[6], projetFr: c[7], total: nombre(c[8]), type: c[9], ges: c[10], gesFr: c[11], resilience: c[13] })),
    comparaison: sansTete(csv('6_How_city_compares.csv')).map(([annee, ville, province, valeur]) => ({ annee: Number(annee), ville, province, hausse: valeur })),
  };

  // --- Contrats 2025 (≥ 25 000 $, attribués par délégation de pouvoir)
  console.log('Contrats 2025');
  const contrats = [];
  for (const [cle, periode] of [['contratsH1', '2025-H1'], ['contratsH2', '2025-H2']]) {
    for (const c of await lireCouche(cle)) {
      contrats.push({
        contrat: c.Contract, service: c.Department, description: c.Description, consultation: c.Professional_Consulting_Services || null,
        type: c.Contract_Approval_Request_Type || null, montant: nombre(c.Amount), fournisseur: c.Vendor, motifNonConcurrentiel: c.Non_Competitive_Rationale || null, periode,
      });
    }
  }

  // --- Travaux à venir (avec le quartier, calculé sur la carte)
  console.log('Travaux, parcs, permis');
  const lin = await lireCouche('travauxLineaires');
  const pts = await lireCouche('travauxPoints');
  const legendes = async (couche) => {
    const j = await (await appeler(`${couche}?f=json`)).json();
    const dom = (nom) => Object.fromEntries((j.fields.find((f) => f.name === nom)?.domain?.codedValues ?? []).map((v) => [v.code, v.name]));
    return { typeEn: dom('FEATURE_TYPE'), typeFr: dom('FEATURE_TYPE_FR'), statutEn: dom('STATUS'), statutFr: dom('STATUS_FR'), departFr: { 'This Year': 'Cette année', '1-2 Years': '1 à 2 ans', '2-3 Years': '2 à 3 ans' } };
  };
  const leg = await legendes(SOURCES.travauxLineaires.service);
  const premierPoint = (g) => (g.type === 'Point' ? g.coordinates : g.type === 'LineString' ? g.coordinates[0] : g.type === 'MultiLineString' ? g.coordinates[0][0] : null);
  const travaux = [...lin.features, ...pts.features].map((f) => {
    const p = f.properties, pt = premierPoint(f.geometry);
    return {
      genre: f.geometry.type === 'Point' ? 'lieu' : 'trace',
      typeEn: leg.typeEn[p.FEATURE_TYPE] ?? p.FEATURE_TYPE, typeFr: leg.typeFr[p.FEATURE_TYPE_FR] ?? p.FEATURE_TYPE_FR,
      statutEn: leg.statutEn[p.STATUS] ?? p.STATUS, statutFr: leg.statutFr[p.STATUS_FR] ?? p.STATUS_FR,
      departEn: p.TARGETED_START, departFr: leg.departFr[p.TARGETED_START] ?? p.TARGETED_START_FR,
      page: p.PROJECTWEBPAGE || null, pageFr: p.PROJECTWEBPAGE_FR || null, circulation: p.TRAFFICIMPACTS || null,
      quartier: pt ? Number(quartierDe(pt[0], pt[1])) || null : null,
      point: pt ? pt.map((v) => arrondir(v, 5)) : null,
    };
  });

  const parcs = (await lireCouche('parcs')).map((p) => ({
    nomEn: p.NAME, nomFr: p.NAME_FR, adresseEn: p.ADDRESS, adresseFr: p.ADDRESS_FR, typeEn: p.PARK_TYPE, typeFr: p.PARK_TYPE_FR,
    quartier: p.WARD != null ? Number(p.WARD) : null, chiens: p.DOG_DESIGNATION, accessible: p.ACCESSIBLE, lat: p.LATITUDE, lon: p.LONGITUDE,
  }));

  // --- Permis de construire 2026 (un onglet par mois dans le classeur de la Ville)
  const feuilles = lireXlsx(await lireFichier('permis2026'));
  const permis = [];
  for (const [mois, lignes] of Object.entries(feuilles)) {
    const tete = lignes.find((l) => Object.values(l).includes('STREET ADDRESS'));
    if (!tete) continue;
    const col = Object.fromEntries(Object.entries(tete).map(([k, v]) => [v, k]));
    for (const l of lignes.slice(lignes.indexOf(tete) + 1)) {
      const adresse = (l[col['STREET ADDRESS']] ?? '').trim();
      if (!adresse || !l[col['PERMIT NUMBER']]) continue;
      const serie = l[col['ISSUED DATE']];
      const date = /^\d+(\.\d+)?$/.test(serie) ? new Date(Date.UTC(1899, 11, 30) + Number(serie) * 86400000).toISOString().slice(0, 10) : serie;
      permis.push({
        adresse, codePostal: l[col['POSTAL CODE']] ?? null, quartier: Number(l[col['WARD']]) || null, date, batiment: l[col['BUILDING TYPE']] ?? null,
        communaute: l[col['COMMUNITY']] ?? null, description: (l[col['DESCRIPTION']] ?? '').trim(), logements: nombre(l[col['D.U.']]),
        valeur: nombre(l[col['VALUE']]), superficie: nombre(l[col['SQUARE METRES']]), numero: l[col['PERMIT NUMBER']], mois,
      });
    }
  }

  writeFileSync('data/ottawa-ville.json', JSON.stringify({
    lus, licence: LICENCE,
    sources: Object.fromEntries(Object.entries(SOURCES).map(([k, s]) => [k, { titre: s.titre, page: `https://open.ottawa.ca/datasets/${s.id}` }])),
    elus, quartiers, presences, presencesNote: { depuis: dates[0], jusqua: dates.at(-1), seances: dates.length },
    taxes, budget, contrats, travaux, parcs, permis,
  }));
  console.log(`data/ottawa-ville.json : ${elus.length} élu·e·s, ${quartiers.length} quartiers, ${contrats.length} contrats, ${travaux.length} travaux, ${parcs.length} parcs, ${permis.length} permis.`);

  // --- Les adresses : 405 000 points → par rue, les plages de numéros par quartier ; et le
  // quartier de chaque code postal. C'est ce qui fait marcher « Près de chez moi » sans rien
  // envoyer au serveur.
  if (SANS_ADRESSES) return;
  console.log('Adresses');
  const adr = await lireCouche('adresses');
  const rues = new Map(), cp = new Map();
  for (const a of adr) {
    const rue = (a.FULL_ROADNAME_EN ?? '').trim(), q = Number(a.WARD), n = Number(a.ADDRNUM);
    if (!rue || !q) continue;
    if (!rues.has(rue)) rues.set(rue, { fr: (a.FULL_ROADNAME_FR ?? '').trim(), plages: new Map() });
    const r = rues.get(rue);
    if (!r.plages.has(q)) r.plages.set(q, [n, n, 0]);
    const p = r.plages.get(q);
    if (Number.isFinite(n)) { p[0] = Math.min(p[0], n); p[1] = Math.max(p[1], n); }
    p[2]++;
    const code = (a.POSTAL_CODE ?? '').replace(/\s+/g, '').toUpperCase();
    if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(code)) {
      if (!cp.has(code)) cp.set(code, new Map());
      cp.get(code).set(q, (cp.get(code).get(q) ?? 0) + 1);
    }
  }
  const sortieRues = {};
  for (const [nom, r] of rues) sortieRues[nom] = [r.fr, [...r.plages].map(([q, [de, a, n]]) => [de, a, q, n]).sort((x, y) => x[0] - y[0])];
  const sortieCp = {};
  for (const [code, comptes] of cp) sortieCp[code] = [...comptes].sort((x, y) => y[1] - x[1])[0][0];
  writeFileSync('data/ottawa-adresses.json', JSON.stringify({ lus, nombrePoints: adr.length, rues: sortieRues, codesPostaux: sortieCp }));
  console.log(`data/ottawa-adresses.json : ${rues.size} rues, ${cp.size} codes postaux (${adr.length} points).`);
}

main().catch((err) => {
  console.error('Échec du scraper ottawa-donnees.js :', err.message);
  process.exitCode = 1;
});
