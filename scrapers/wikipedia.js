// La page Wikipédia de chaque député·e, pour le bouton « W » des cartes (30 oct. 2026, comme
// sur DossierCanada). Par lots de 50 titres (API publique de Wikipédia en anglais) : le nom nu,
// puis les titres d'homonymie usuels. Une page n'est retenue que si sa description parle d'une
// personne politique ontarienne ou canadienne ; la page française vient du lien interlangue.
// Écrit data/wikipedia.json { identifiant: { en, fr } }.
//
// Se relance à la main après une élection (node scrapers/wikipedia.js, puis npm run build).
// Ne fait PAS partie du rafraîchissement quotidien.
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'DossierOntario/1.0 (https://dossierontario.ca)';
const OUT = 'data/wikipedia.json';
const SUFFIXES = ['', ' (politician)', ' (Ontario politician)', ' (Canadian politician)'];
const CANADA = /Canadian|Canada|Ontario/i;
const POLITIQUE = /politi|MPP|legislat|minister|premier/i;

// « Hon. Peter Bethlenfalvy » → « Peter Bethlenfalvy »
const nomNu = (n) => String(n).replace(/^Hon\.\s+/i, '').trim();
// Seconde forme : sans initiales ni surnom entre parenthèses (« Teresa J. Armstrong » → « Teresa Armstrong »).
const nomCourt = (n) => nomNu(n).replace(/\s*\([^)]*\)/g, '').replace(/\s+[A-Z]\.(?=\s)/g, '').replace(/\s+/g, ' ').trim();
// Chaque essai : une forme du nom suivie d'un suffixe d'homonymie.
const ESSAIS = [nomNu, nomCourt].flatMap((f) => SUFFIXES.map((s) => (d) => f(d.nom) + s));

async function lot(titres) {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', redirects: '1', prop: 'description|pageprops|langlinks|info',
    inprop: 'url', lllang: 'fr', lllimit: 'max', ppprop: 'disambiguation', titles: titres.join('|'), formatversion: '2',
  });
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`Wikipédia : HTTP ${r.status}`);
  const j = await r.json();
  // Titre demandé → titre final (normalisation et redirections), puis page.
  const vers = new Map();
  for (const n of j.query?.normalized ?? []) vers.set(n.from, n.to);
  for (const n of j.query?.redirects ?? []) vers.set(n.from, n.to);
  const pages = new Map((j.query?.pages ?? []).map((p) => [p.title, p]));
  const final = (t) => { let x = t; for (let i = 0; i < 3 && vers.has(x); i++) x = vers.get(x); return x; };
  return (t) => pages.get(final(t));
}

async function main() {
  const liste = JSON.parse(readFileSync('data/members.json', 'utf-8')).deputes;
  const liens = {};
  let restants = liste.slice();
  for (const titre of ESSAIS) {
    const suivants = [];
    for (let i = 0; i < restants.length; i += 50) {
      const groupe = restants.slice(i, i + 50);
      const trouver = await lot(groupe.map(titre));
      for (const d of groupe) {
        const p = trouver(titre(d));
        const desc = p?.description ?? '';
        const bon = p && !p.missing && !p.pageprops?.disambiguation && CANADA.test(desc) && POLITIQUE.test(desc);
        if (bon) {
          const fr = p.langlinks?.[0]?.title;
          liens[d.identifiant] = { en: p.fullurl, fr: fr ? `https://fr.wikipedia.org/wiki/${encodeURIComponent(fr.replace(/ /g, '_'))}` : null };
        } else suivants.push(d);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    restants = suivants;
    if (!restants.length) break;
  }
  writeFileSync(OUT, JSON.stringify({ source: 'en.wikipedia.org (API publique)', lu: new Date().toISOString().slice(0, 10), liens }, null, 2) + '\n');
  const avecFr = Object.values(liens).filter((l) => l.fr).length;
  console.log(`${Object.keys(liens).length} pages trouvées sur ${liste.length} (${avecFr} avec une page française)`);
  if (restants.length) console.log(`  sans page sûre (${restants.length}) : ${restants.map((d) => nomNu(d.nom)).join(', ')}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
