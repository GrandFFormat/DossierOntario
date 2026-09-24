// Scraper — la liste des projets de loi (44e législature, 1re session)
//
// Source : les deux versions de la même page sur ola.org, l'anglaise et la française.
//   EN : /en/legislative-business/bills/parliament-44/session-1
//   FR : /fr/affaires-legislatives/projets-loi/legislature-44/session-1
// Tout tient sur une seule page : il n'y a pas de pagination, donc pas d'adresse avec
// « ? » à demander (ce que le robots.txt interdirait de toute façon).
//
// Deux familles de numéros, à ne jamais mélanger :
//   - les projets PUBLICS, numérotés 1, 2, 3… (139 au 23 septembre 2026) ;
//   - les projets PRIVÉS, numérotés PR1, PR2… (52), qui font presque toujours revivre
//     une société dissoute. Ils n'ont qu'un titre anglais, même sur la page française.
//
// Ce que ce scraper NE fait PAS : deviner. Le type « projet du gouvernement » n'est
// écrit nulle part sur le site ; on le déduit du parrain (un ministre, donc « Hon. »
// suivi d'un titre entre parenthèses) et on marque cette déduction avec
// `typeSource: 'deduit-du-parrain'` pour que le site puisse le dire honnêtement.

import { writeFileSync, mkdirSync } from 'node:fs';
import * as cheerio from 'cheerio';
import { lirePage, ADRESSE, LEGISLATURE, SESSION, texte } from './ola.js';

const OUT_PATH = 'data/bills.json';

/** Lit le tableau de la liste et rend une entrée par projet de loi. */
function lireListe(html, langue) {
  const $ = cheerio.load(html);
  const projets = new Map();

  $('table tbody tr').each((_, tr) => {
    const $tr = $(tr);
    const numero = texte($tr.find('td').eq(0).html() ?? '');
    const $lien = $tr.find('td').eq(1).find('a').first();
    const titre = texte($lien.html() ?? '');
    const href = $lien.attr('href');
    if (!numero || !titre || !href) return;

    const parrains = [];
    $tr
      .find('td')
      .eq(2)
      .find('article')
      .each((_, art) => {
        const $art = $(art);
        const nom = texte($art.find('.field--name-field-full-name-by-last-name').html() ?? '');
        const role = texte($art.find('.field--name-field-sponsor-role').html() ?? '').replace(/^\(|\)$/g, '');
        if (nom) parrains.push({ nom, role: role || null });
      });

    projets.set(numero.toUpperCase(), { numero: numero.toUpperCase(), titre, href, parrains, langue });
  });

  return projets;
}

/**
 * Projet du gouvernement ? Un ministre le parraine : son nom porte « Hon. » ET un rôle
 * entre parenthèses (« Minister of Health », « Premier »…). Un projet de député·e n'a
 * pas de rôle. La présidente de la Chambre et les secrétaires parlementaires ne
 * parrainent pas de projets du gouvernement.
 */
function estDuGouvernement(parrains) {
  return parrains.some((p) => /\bHon\./.test(p.nom) && p.role);
}

async function main() {
  const htmlEn = await lirePage(ADRESSE.listeProjets('en'));
  const htmlFr = await lirePage(ADRESSE.listeProjets('fr'));

  const en = lireListe(htmlEn, 'en');
  const fr = lireListe(htmlFr, 'fr');

  if (en.size === 0) throw new Error('Aucun projet de loi lu sur la page anglaise — la page a changé de forme ?');

  const manquantsEnFr = [...en.keys()].filter((num) => !fr.has(num));
  if (manquantsEnFr.length) {
    console.warn(
      `${manquantsEnFr.length} projet(s) absent(s) de la page française : ${manquantsEnFr.slice(0, 5).join(', ')}…`
    );
  }

  const projets = [];
  for (const [numero, e] of en) {
    const f = fr.get(numero);
    const prive = numero.startsWith('PR');
    const numeroTri = Number(numero.replace(/^PR/, ''));

    projets.push({
      numero,
      numeroTri,
      type: prive ? 'prive' : 'public',
      // Le titre français des projets PRIVÉS n'existe pas : la page française répète
      // le titre anglais. On met null plutôt que de recopier l'anglais en le faisant
      // passer pour du français.
      titreEn: e.titre,
      titreFr: prive || !f || f.titre === e.titre ? null : f.titre,
      parrains: e.parrains,
      typeProjet: prive ? 'prive' : estDuGouvernement(e.parrains) ? 'gouvernement' : 'depute',
      typeProjetSource: prive ? 'numero-pr' : 'deduit-du-parrain',
      url: new URL(e.href, ADRESSE.base).href,
      urlFr: f ? new URL(f.href, ADRESSE.base).href : null,
    });
  }

  projets.sort((a, b) => (a.type === b.type ? a.numeroTri - b.numeroTri : a.type === 'public' ? -1 : 1));

  const publics = projets.filter((p) => p.type === 'public');
  const prives = projets.filter((p) => p.type === 'prive');

  // Garde-fou : les projets publics sont numérotés sans trou, de 1 au dernier déposé.
  // Un trou veut dire qu'on a mal lu la page, pas que le numéro n'existe pas.
  const attendus = publics.length ? publics[publics.length - 1].numeroTri : 0;
  if (publics.length !== attendus) {
    throw new Error(
      `Numérotation incohérente : ${publics.length} projets publics lus, mais le dernier porte le n° ${attendus}.`
    );
  }

  mkdirSync('data', { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        source: { en: ADRESSE.listeProjets('en'), fr: ADRESSE.listeProjets('fr') },
        legislature: LEGISLATURE,
        session: SESSION,
        lus: new Date().toISOString(),
        nombre: { total: projets.length, publics: publics.length, prives: prives.length },
        projets,
      },
      null,
      2
    )
  );

  const parType = publics.reduce((acc, p) => ((acc[p.typeProjet] = (acc[p.typeProjet] ?? 0) + 1), acc), {});
  console.log(
    `${projets.length} projets écrits dans ${OUT_PATH} : ${publics.length} publics (${JSON.stringify(parType)}), ${prives.length} privés.`
  );
  console.log(`Titres français : ${publics.filter((p) => p.titreFr).length}/${publics.length} projets publics.`);
}

main().catch((err) => {
  console.error('Échec du scraper bills.js :', err.message);
  process.exitCode = 1;
});
