// /llms.txt — le site expliqué aux assistants (ChatGPT, Claude, Perplexity…), au format proposé par
// llmstxt.org : un titre, un résumé, puis des listes de liens. Martin, 6 oct. 2026 : « il nous
// faut des llms.txt sur tous les dossiers ». Même principe que sur DossierQuébec.
//
// Ce n'est pas une norme et rien ne garantit qu'un assistant le lise. Son intérêt : quand il est
// lu, le site est décrit avec NOS mots (non officiel, sources officielles seulement, rien
// d'inventé, le texte officiel fait foi) plutôt que deviné. Le contenu reprend la page /rules
// (textes dans commun/on.js, « regles.* ») ; si une règle change là-bas, elle change ici.
//
// Fabriqué à chaque build (scripts/build-pages.js, à la fin), pour que les nombres suivent les
// données. Aucune date dedans : le fichier ne change que si le site change. En anglais, la langue
// par défaut du site, avec un court passage en français à la fin.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SITE = 'https://dossierontario.ca';
const lire = (chemin) => JSON.parse(readFileSync(chemin, 'utf8'));

export function construireLlms() {
  const projets = lire('data/site/bills.json').projets;
  const votes = lire('data/site/votes.json').votes;
  const deputes = lire('data/site/members.json').deputes;
  const comites = lire('data/site/comites.json').comites;
  const lexique = lire('contenu/lexique.json').groupes;

  const publics = projets.filter((p) => p.type === 'public').length;
  const prives = projets.filter((p) => p.type === 'prive').length;
  const sansNoms = votes.filter((v) => v.sansNoms).length;
  const ministres = deputes.filter((d) => d.ministreEn).length;
  const adjoints = deputes.filter((d) => d.adjointEn).length;
  const termes = lexique.reduce((n, g) => n + g.entrees.length, 0);

  // La législature et la session se lisent dans les adresses d'ola.org, jamais écrites à la main.
  // Si un projet n'en a pas, ou s'il y en a plus d'une, on ne dit rien plutôt que d'en choisir une.
  const sessions = [...new Set(projets.map((p) => (p.url ?? '').match(/parliament-(\d+)\/session-(\d+)/)?.slice(1).join('-') ?? ''))];
  const [legislature, session] = sessions.length === 1 && sessions[0] ? sessions[0].split('-') : [];
  const ou = legislature ? ` of Parliament ${legislature}, session ${session}` : '';
  // Le détail public / privé n'est écrit que s'il fait le compte.
  const detail = publics + prives === projets.length ? ` (${publics} public, ${prives} private)` : '';

  // Un lien n'est écrit que si sa page existe dans le dépôt : rien d'annoncé qui ne soit servi.
  const lien = (chemin, nom, texte) =>
    existsSync(chemin === '' ? 'index.html' : `${chemin}.html`) ? [`- [${nom}](${SITE}/${chemin}): ${texte}`] : [];

  const slug = (numero) => String(numero).toLowerCase();
  const avecPage = (p) => p && existsSync(`bill/${slug(p.numero)}.html`);
  const exemple = [projets.find((p) => p.numero === '109'), projets.find((p) => p.type === 'public')].find(avecPage);
  const exemplePrive = projets.filter((p) => p.type === 'prive').find(avecPage);

  const lignes = [
    '# DossierOntario',
    '',
    '> Independent, UNOFFICIAL citizen website that makes the work of the Legislative Assembly of Ontario readable in plain language: bills, recorded votes, committees, MPPs and cabinet. Free, with no advertising and no subscription. English by default, with a full French version.',
    '',
    'What to know before citing this site:',
    '',
    '- It is not an official source and has no link with the Legislative Assembly of Ontario or the Government of Ontario. Every item links back to its official page, and the official text always prevails. Cite the official source (ola.org) together with DossierOntario, not DossierOntario alone.',
    '- Official sources only: the Legislative Assembly of Ontario (ola.org) for bills, their stages and official texts, recorded votes, MPPs, committees and petitions; the Ontario Data Catalogue (data.ontario.ca) for ministers and their official titles. Nothing is taken from the news media or from any other website.',
    '- No invented data: when a piece of information is missing, the field stays empty or the site says it is unknown.',
    '- Plain-language bill summaries are written by AI from the official text published on ola.org, and each one is marked as such. They do not replace the text of the bill. When a text is too thin to be summarised honestly, no summary is shown.',
    "- What is deduced is said: ola.org does not say whether a bill comes from the government, so the \"Government\" filter is worked out from the sponsor, a minister. Ministers' official titles come from the Ontario government's own bilingual list; the site does not translate a title itself.",
    "- The vote count is checked: at every refresh, the site counts the recorded votes announced in the Assembly's official minutes, sitting day by sitting day, and compares that number with its own.",
    '- What is missing is explained: divisions published with their totals only, without the names; absences, which the Assembly does not publish; committee votes, which are not listed on the site yet; bills with no French text, whose summary is shown in English with a note. Ontario has no electronic petitions, and Hansard is not translated.',
    "- Free and non-commercial: the Assembly's terms of use allow extracts to be reproduced for reasonable, fair and non-commercial use. The site reproduces short extracts, names its sources and links back to the official page.",
    `- The full rules: ${SITE}/rules`,
    '',
    '## Legislative Assembly of Ontario',
    '',
    ...lien('', 'Home', 'who sits, where bills stand, the latest recorded votes and the latest activity at the Legislature.'),
    ...lien('bills', 'Bills', `the ${projets.length} bills${ou}${detail}: stage reached, sponsor and a plain-language summary, with a link to the official text.`),
    ...lien('votes', 'Recorded votes', `${votes.length} recorded divisions, with how each MPP voted${sansNoms ? ` (for ${sansNoms} of them the Assembly published the totals only, not the names)` : ''}. Absent MPPs are not listed: the Assembly does not publish absences.`),
    ...lien('committees', 'Committees', `the ${comites.length} standing committees: which bills they studied, when they sat, and their transcripts.`),
    ...lien('mpps', 'MPPs and cabinet', `the ${deputes.length} members of provincial parliament, including ${ministres} ministers and ${adjoints} parliamentary assistants, with their official titles, party, riding and contact details.`),
    ...lien('glossary', 'Lexicon', `${termes} words of the Ontario Legislature explained in plain language. These explanations are the site's own, not the Assembly's.`),
    '',
    '## One page per bill',
    '',
    'Every bill has its own address: `/bill/NUMBER`, for example `/bill/109`. Private bills carry the prefix `pr`, in lower case: `/bill/pr1`.',
    '',
    ...(exemple ? [`- [Example: Bill ${exemple.numero}](${SITE}/bill/${slug(exemple.numero)}): ${exemple.titreEn}`] : []),
    ...(exemplePrive ? [`- [Example: Bill ${exemplePrive.numero}](${SITE}/bill/${slug(exemplePrive.numero)}): ${exemplePrive.titreEn}`] : []),
    ...(existsSync('sitemap.xml') ? [`- [Sitemap](${SITE}/sitemap.xml): the list of every page, including the page of each bill.`] : []),
    '',
    '## About the site',
    '',
    ...lien('rules', 'The rules', 'where the data comes from, what the site refuses to do, and what it says when something is missing.'),
    ...lien('sources', 'Sources', 'the official page each kind of data is read from, and what this site does not do.'),
    ...lien('about', 'Why this site exists', 'who is behind DossierOntario, and every update made to the site.'),
    '',
    '## Optional',
    '',
    '- [Source code](https://github.com/GrandFFormat/DossierOntario): the public repository of the site.',
    '',
    '## En français',
    '',
    "DossierOntario est un site citoyen indépendant et NON OFFICIEL qui rend lisibles, en langage clair, les travaux de l'Assemblée législative de l'Ontario : projets de loi, votes nominatifs, comités, député·e·s et Conseil des ministres. Il ne publie que ce que l'Assemblée (ola.org) et le gouvernement de l'Ontario (data.ontario.ca) ont eux-mêmes publié, avec un lien vers l'original ; rien n'est inventé, rien ne vient des médias, et les résumés des projets de loi sont rédigés par une IA à partir du texte officiel, qui fait toujours foi. Pour le citer, citez aussi la source officielle. La version française s'obtient avec le bouton « Français » dans l'en-tête de chaque page ; le choix est gardé dans le navigateur. Il n'y a pas d'adresse distincte pour le français : chaque page a une seule adresse, servie en anglais par défaut.",
    '',
  ];
  const contenu = lignes.join('\n');
  if (!existsSync('llms.txt') || readFileSync('llms.txt', 'utf8') !== contenu) writeFileSync('llms.txt', contenu, 'utf8');
  console.log(`llms.txt : ${lignes.filter((l) => l.startsWith('- [')).length} liens, ${Buffer.byteLength(contenu)} octets.`);
}
