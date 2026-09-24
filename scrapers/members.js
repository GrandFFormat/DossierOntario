// Scraper — les 124 député·e·s (MPP) et l'état des partis
//
// Sources, toutes officielles :
//   - /en/members/current et /fr/deputes/actuels : la liste, avec le parti, la
//     circonscription et l'état des partis (« Current party standings ») ;
//   - /sites/default/files/node-files/office_csvs/offices-all.csv : le fichier de
//     coordonnées publié par l'Assemblée (courriels, bureaux, numéro de membre).
//
// Trois pièges, tous vus en vrai :
//   1. Des sièges peuvent être VACANTS. Le 19 septembre 2026 il y en avait trois, en
//      attendant que les partielles du 3 septembre soient déclarées officielles ; le
//      23 septembre, elles l'étaient et la Chambre était de nouveau complète (79 PC,
//      27 NPD, 14 libéraux, 2 verts, 2 indépendants). Le compte est donc TOUJOURS relu,
//      jamais codé en dur, et l'avis publié par l'Assemblée est repris tel quel dans
//      `avisEn`/`avisFr` : on affiche son explication, on n'en écrit pas une.
//   2. Le CSV contient des lignes « Vacant seat » qui portent l'adresse du bureau d'un
//      autre député. On ne les garde pas.
//   3. Les noms ne s'écrivent pas pareil d'une source à l'autre (« Effie J. » dans le
//      CSV, « Effie J. Triantafilopoulos » dans la liste, « Hardeep Singh Grewal » avec
//      un deuxième prénom). D'où la clé commune `cleNom()` de ola.js.
//
// Wikipédia ne sert à rien ici : ola.org est la source, et la seule.

import { writeFileSync, mkdirSync } from 'node:fs';
import * as cheerio from 'cheerio';
import { parse } from 'csv-parse/sync';
import { lirePage, lireFichier, texte, cleNom, ADRESSE, LEGISLATURE, SESSION } from './ola.js';

const URL_EN = `${ADRESSE.base}/en/members/current`;
const URL_FR = `${ADRESSE.base}/fr/deputes/actuels`;
const URL_CSV = `${ADRESSE.base}/sites/default/files/node-files/office_csvs/offices-all.csv`;
const OUT_PATH = 'data/members.json';

function lireListe(html) {
  const $ = cheerio.load(html);

  const deputes = [];
  $('a.mpp-card-link').each((_, a) => {
    const $a = $(a);
    const href = $a.attr('href');
    const nom = texte($a.find('h3').first().html() ?? '');
    const parti = texte($a.find('.current-members-party').first().html() ?? '');
    // La circonscription est le paragraphe qui suit celui du parti.
    const paragraphes = $a
      .find('p')
      .map((_, p) => texte($(p).html() ?? ''))
      .get()
      .filter(Boolean);
    const circonscription = paragraphes.find((t) => t !== parti) ?? null;
    // La couleur du parti est celle qu'ola.org peint sur la carte.
    const couleur = /#([0-9a-f]{6})/i.exec($a.find('[style*="linear-gradient"]').attr('style') ?? '');

    if (!href || !nom) return;
    deputes.push({
      identifiant: href.split('/').pop(),
      nom,
      parti: parti || null,
      circonscription,
      couleurParti: couleur ? `#${couleur[1].toUpperCase()}` : null,
      url: new URL(href, ADRESSE.base).href,
    });
  });

  // Un bloc .party-standings par parti (et un pour les sièges vacants, quand il y en a :
  // le 19 septembre 2026 il y en avait trois, en attendant que les partielles du
  // 3 septembre soient déclarées officielles ; le 23, il n'y en avait plus).
  const etatPartis = [];
  $('.party-standings').each((_, bloc) => {
    const $bloc = $(bloc);
    const sieges = Number(texte($bloc.find('.colour-square-count').first().html() ?? ''));
    const parti = texte($bloc.find('.party-text').first().html() ?? '');
    if (parti && Number.isFinite(sieges)) etatPartis.push({ parti, sieges });
  });

  const totalTexte = texte($('.total-seats').first().html() ?? '');
  const total = Number(/(\d+)/.exec(totalTexte)?.[1] ?? 0) || null;

  // L'avis de l'Assemblée sur les partielles, affiché avant la liste.
  const avis = texte($('.view-header, .region-content .lao-alert, .messages').first().html() ?? '')
    .replace(/^\s*Results:\s*\d+\s*/i, '')
    .trim();

  return { deputes, etatPartis, total, avis: avis || null };
}

function lireCsv(csv) {
  const lignes = parse(csv, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true });
  const parMembre = new Map();

  for (const ligne of lignes) {
    const prenom = (ligne['First name'] ?? '').trim();
    const nom = (ligne['Last name'] ?? '').trim();
    const id = (ligne['Member ID'] ?? '').trim();
    // Piège n° 2 : les lignes « Vacant seat » portent l'adresse d'un autre bureau.
    if (!id || /^vacant$/i.test(prenom)) continue;

    if (!parMembre.has(id)) {
      parMembre.set(id, {
        numeroMembre: id,
        prenom,
        nom,
        circonscription: (ligne['Riding name'] ?? '').trim() || null,
        parti: (ligne.Party ?? '').trim() || null,
        courriel: (ligne.Email ?? '').trim() || null,
        bureaux: [],
      });
    }
    const membre = parMembre.get(id);
    const type = (ligne['Office type'] ?? '').trim();
    membre.bureaux.push({
      type: type || null,
      adresse: (ligne.Address ?? '').replace(/\s*\n\s*/g, ', ').trim() || null,
      ville: (ligne.City ?? '').trim() || null,
      codePostal: (ligne['Postal code'] ?? '').trim() || null,
      telephone: (ligne.Telephone ?? '').trim() || null,
      courriel: (ligne['Office email'] ?? '').trim() || null,
    });
  }
  return parMembre;
}

/** Nom + circonscription : deux personnes peuvent porter le même nom, jamais dans la même circonscription. */
function cle(nom, circonscription) {
  const lieu = (circonscription ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
  return `${cleNom(nom)}|${lieu}`;
}

async function main() {
  const en = lireListe(await lirePage(URL_EN));
  const fr = lireListe(await lirePage(URL_FR));
  const csv = lireCsv(await lireFichier(URL_CSV));

  if (en.deputes.length === 0) throw new Error('Aucune fiche de député·e lue — la page a changé de forme ?');

  const parCleFr = new Map(fr.deputes.map((d) => [d.identifiant, d]));
  const parCleCsv = new Map(
    [...csv.values()].map((m) => [cle(`${m.prenom} ${m.nom}`, m.circonscription), m])
  );

  const deputes = en.deputes.map((d) => {
    const jumeauFr = parCleFr.get(d.identifiant) ?? null;
    const fiche = parCleCsv.get(cle(d.nom, d.circonscription)) ?? null;
    return {
      ...d,
      partiFr: jumeauFr?.parti ?? null,
      circonscriptionFr: jumeauFr?.circonscription ?? null,
      urlFr: jumeauFr?.url ?? null,
      numeroMembre: fiche?.numeroMembre ?? null,
      courriel: fiche?.courriel ?? null,
      bureaux: fiche?.bureaux ?? [],
    };
  });

  const sansFiche = deputes.filter((d) => !d.numeroMembre).length;

  mkdirSync('data', { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        source: { liste: URL_EN, listeFr: URL_FR, coordonnees: URL_CSV },
        legislature: LEGISLATURE,
        session: SESSION,
        lus: new Date().toISOString(),
        totalSieges: en.total,
        etatPartis: en.etatPartis,
        etatPartisFr: fr.etatPartis,
        avisEn: en.avis,
        avisFr: fr.avis,
        nombre: deputes.length,
        deputes,
      },
      null,
      2
    )
  );

  const sieges = en.etatPartis.reduce((somme, p) => somme + p.sieges, 0);
  console.log(
    `${deputes.length} député·e·s écrits dans ${OUT_PATH} (${sieges} sièges répartis sur ${en.total}).\n` +
      `  ${en.etatPartis.map((p) => `${p.sieges} ${p.parti}`).join(', ')}\n` +
      `  sans fiche de coordonnées : ${sansFiche}`
  );
}

main().catch((err) => {
  console.error('Échec du scraper members.js :', err.message);
  process.exitCode = 1;
});
