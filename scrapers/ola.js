// Lecture d'ola.org — le module commun à tous les scrapers de DossierOntario.
//
// Trois règles sont écrites ici une fois pour toutes, plutôt que répétées (et oubliées)
// dans chaque scraper :
//
// 1. User-Agent HONNÊTE. On dit qui on est et on donne l'adresse du site. On ne se fait
//    jamais passer pour un navigateur. Si l'Assemblée veut nous joindre ou nous bloquer,
//    elle doit pouvoir le faire.
//
// 2. Le robots.txt d'ola.org interdit TOUTE adresse contenant « ? » (`Disallow: /*?`)
//    ainsi que `/search*`. Le garde-fou `verifierRobots()` refuse ces adresses dans le
//    code : une erreur de programmation ne peut pas nous faire violer le robots.txt en
//    silence. Concrètement, ça veut dire qu'on n'utilise jamais le moteur « votes-search » ;
//    on suit les liens que les pages nous donnent.
//
// 3. Un délai entre deux requêtes. Le robots.txt d'ola.org ne fixe pas de Crawl-delay,
//    alors on s'en donne un : 2 secondes.
//
// Rappel des conditions d'utilisation d'ola.org (page « Copyright and privacy ») :
// reproduction d'EXTRAITS, usage raisonnable et NON COMMERCIAL, mention de l'Assemblée.
// DossierOntario est gratuit et ne vend rien : on résume, on cite des extraits, et chaque
// page renvoie à la source officielle.

const USER_AGENT =
  'dossierontario-scraper/0.1 (projet citoyen independant, usage non commercial; +https://dossierontario.ca)';

const DELAI_MS = Number(process.env.OLA_DELAI_MS ?? 2000);
const BASE = 'https://www.ola.org';

let dernierAppel = 0;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Refuse ce que le robots.txt d'ola.org interdit. Voir la règle 2 en tête de fichier. */
export function verifierRobots(url) {
  const u = new URL(url, BASE);
  if (u.search) {
    throw new Error(
      `robots.txt d'ola.org : « Disallow: /*? » — adresse avec paramètres refusée : ${u.href}`
    );
  }
  if (/^\/(en|fr)?\/?search/.test(u.pathname) || u.pathname.startsWith('/search')) {
    throw new Error(`robots.txt d'ola.org : « Disallow: /search* » — adresse refusée : ${u.href}`);
  }
  return u.href;
}

/**
 * Va chercher une page d'ola.org. Une seule reprise, et seulement pour une panne
 * passagère (réseau ou 5xx). Un 403 ou un 404 n'est JAMAIS retenté : c'est une réponse,
 * pas un accident, et on ne cherche pas à passer outre.
 */
export async function lirePage(url, { essais = 2 } = {}) {
  const href = verifierRobots(url);

  for (let essai = 1; essai <= essais; essai++) {
    const attente = DELAI_MS - (Date.now() - dernierAppel);
    if (attente > 0) await dormir(attente);
    dernierAppel = Date.now();

    let res;
    try {
      res = await fetch(href, { headers: { 'User-Agent': USER_AGENT } });
    } catch (err) {
      if (essai === essais) throw new Error(`Échec réseau sur ${href} : ${err.message}`);
      await dormir(5000);
      continue;
    }

    if (res.ok) return await res.text();

    if (res.status >= 500 && essai < essais) {
      await dormir(5000);
      continue;
    }
    throw new Error(`HTTP ${res.status} sur ${href}`);
  }
}

/** Même chose, pour un fichier qui n'est pas du HTML (CSV). */
export async function lireFichier(url) {
  const href = verifierRobots(url);
  const attente = DELAI_MS - (Date.now() - dernierAppel);
  if (attente > 0) await dormir(attente);
  dernierAppel = Date.now();
  const res = await fetch(href, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${href}`);
  return await res.text();
}

/** Texte lisible d'un fragment de HTML : les balises sautent, les espaces se rangent. */
export function texte(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#13;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&rsquo;/g, '’')
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Une clé de nom qui tient les quatre façons dont les sources écrivent la même personne :
 *   « Kerzner, Hon. Michael S. » (liste d'ola.org)      -> michael|kerzner
 *   « Michael Shawn Kerzner »   (ONTERM, nom légal)     -> michael|kerzner
 *   « Effie J. » + « Triantafilopoulos » (CSV, 2 champs) -> effie|triantafilopoulos
 *   « Dawn Gallagher Murphy »   (nom de famille double)  -> dawn|murphy
 *
 * On garde le PREMIER prénom et le DERNIER mot du nom de famille : c'est ce que les
 * quatre sources ont toujours en commun. Les initiales et les titres sautent.
 */
export function cleNom(nom) {
  const sansTitre = (nom ?? '').replace(/\b(The Honourable|L[’']honorable|Hon\.)\s*/gi, '').trim();

  let famille, prenoms;
  if (sansTitre.includes(',')) {
    const [avant, apres = ''] = sansTitre.split(',');
    famille = avant;
    prenoms = apres;
  } else {
    const mots = sansTitre.split(/\s+/).filter(Boolean);
    famille = mots.pop() ?? '';
    prenoms = mots.join(' ');
  }

  const utiles = (chaine) =>
    chaine
      .split(/\s+/)
      .map((m) => m.trim())
      .filter((m) => m && !/^[A-Za-zÀ-ÿ]\.$/.test(m)); // « J. », « S. » : on jette

  const normaliser = (s) =>
    (s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z]/g, '');

  const nomFamille = utiles(famille).pop() ?? '';
  const prenom = utiles(prenoms)[0] ?? '';
  return `${normaliser(prenom)}|${normaliser(nomFamille)}`;
}

export const ADRESSE = {
  base: BASE,
  listeProjets: (langue) =>
    langue === 'fr'
      ? `${BASE}/fr/affaires-legislatives/projets-loi/legislature-44/session-1`
      : `${BASE}/en/legislative-business/bills/parliament-44/session-1`,
  projet: (langue, numero) =>
    langue === 'fr'
      ? `${BASE}/fr/affaires-legislatives/projets-loi/legislature-44/session-1/projet-loi-${numero}`
      : `${BASE}/en/legislative-business/bills/parliament-44/session-1/bill-${numero}`,
};

export const LEGISLATURE = 44;
export const SESSION = 1;
export { USER_AGENT, DELAI_MS };
