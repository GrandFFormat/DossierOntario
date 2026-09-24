// DossierOntario — le code du site.
//
// Anglais par défaut, français complet : chaque libellé existe dans les deux langues.
// Le thème sombre est un CHOIX du visiteur (jamais le réglage du système), comme dans
// toute la famille Dossier. Les clés de rangement suivent la convention de la famille,
// avec les mêmes valeurs (« dark »/« light », « en »/« fr »).
//
// Aucune donnée n'est écrite ici : tout vient des fichiers de data/site/, eux-mêmes
// produits par les scrapers. Un champ absent s'affiche comme absent, jamais deviné.

(function () {
  'use strict';

  const CLE_THEME = 'dossier:theme';
  const CLE_LANGUE = 'dossier:langue';

  const ranger = (cle, valeur) => { try { localStorage.setItem(cle, valeur); } catch (e) {} };
  const lire = (cle) => { try { return localStorage.getItem(cle); } catch (e) { return null; } };

  // ---------------------------------------------------------------- les mots
  const MOTS = {
    en: {
      'nav.accueil': 'Home', 'nav.projets': 'Bills', 'nav.votes': 'Votes',
      'nav.deputes': 'MPPs', 'nav.cabinet': 'Cabinet', 'nav.sources': 'Sources',
      'nav.lexique': 'Lexicon', 'nav.comites': 'Committees',
      'comites.titre': 'Standing committees',
      'comites.intro': 'A bill sent to committee is gone over line by line, witnesses are heard, and it can be amended. Committees also sit while the House is adjourned — which is why a bill can move in August with the Legislature away.',
      'comites.votes': 'Committees hold recorded votes too — about three times as many as the House, on amendments. The Assembly publishes them only inside the transcripts, in running prose, and only when a member asks for one: roughly one committee decision in seven. They are not listed on this site yet.',
      'comites.projets': (n) => `${n} bill${n > 1 ? 's' : ''}`,
      'comites.jours': (n) => `${n} sitting day${n > 1 ? 's' : ''}`,
      'comites.transcriptions': (n) => `${n} transcript${n > 1 ? 's' : ''}`,
      'comites.transcription': 'Transcript →',
      'comites.sansTranscription': 'no committee transcript (decided in the House)',
      'comites.activite': 'Latest work on bills',
      'comites.aucune': 'No bill has been referred to this committee this session.',
      'comites.page': 'The committee on ola.org →',
      'comites.etudies': 'Bills it studied', 'comites.composition': 'Who sits on it',
      'comites.legislatifs': 'Committees that studied bills',
      'comites.surveillance': 'Oversight committees',
      'lexique.titre': 'Plain-language lexicon',
      'lexique.intro': 'Parliamentary words, explained in ordinary ones. These explanations are ours, not the Assembly’s: we write them to be understood, not to be precise in the legal sense. For the formal definitions, the Assembly publishes its own glossary.',
      'lexique.officiel': 'The Assembly’s glossary of procedural terms →',
      'entete.erable': 'Go to the federal site — DossierCanada',
      'entete.langue': 'Français', 'entete.theme': 'Theme', 'entete.plus': 'A+', 'entete.moins': 'A−',
      'pied.nonOfficiel': 'Unofficial site — not affiliated with the Legislative Assembly of Ontario',
      'pied.sources': 'Public data from the Legislative Assembly of Ontario (ola.org) and the Ontario Data Catalogue',
      'pied.gratuit': 'Free, no subscription, no advertising.',
      'pied.maj': 'Data read on',
      'chiffre.projets': 'public bills', 'chiffre.sanctionnes': 'became law',
      'chiffre.votes': 'recorded votes', 'chiffre.deputes': 'seats',
      'relache.titre': 'The House is not sitting',
      'relache.texte': (fin, retour) =>
        `The last sitting day was ${fin}. Nothing moves until the House returns on ${retour} — the numbers below are not stale, the Legislature is simply away.`,
      'relache.texteSansRetour': (fin) =>
        `The last sitting day was ${fin}, and no next sitting has been announced yet. The numbers below are not stale, the Legislature is simply away.`,
      'mission.surTitre': 'Our mission',
      'mission.enonce': 'The Assembly’s own site is the most reliable source there is. This one just makes it <span class="surlignage">easier to follow.</span>',
      'mission.euxTitre': 'What ola.org does',
      'mission.eux': '<li>Organises everything by official document — bills, minutes, Hansard</li><li>The legal, complete and authoritative source</li><li>Neutral: it never summarises and never compares</li>',
      'mission.nousTitre': 'What this site tries to do',
      'mission.nous': '<li>Organises everything by bill: one card, its whole path</li><li>Translates the jargon into ordinary words (see the Lexicon)</li><li>Says what is missing and why, and links back to the source on every item</li>',
      'pied.code': 'Source code',
      'mission.titre': 'Read the record, not the press release',
      'mission.texte': "Every bill, every recorded vote and every member, taken from the Assembly's own record and linked back to it. Free, bilingual, and not official.",
      'projets.titre': 'Bills', 'projets.recherche': 'Search by number or title',
      'projets.tous': 'All', 'projets.gouvernement': 'Government', 'projets.depute': "Members'",
      'projets.prive': 'Private', 'projets.sanctionne': 'Became law', 'projets.encours': 'In progress',
      'projets.aucun': 'No bill matches.',
      'projets.compte': (n) => `${n} bill${n > 1 ? 's' : ''}`,
      'etape.1': '1st reading', 'etape.2': '2nd reading', 'etape.3': 'Committee',
      'etape.4': '3rd reading', 'etape.5': 'Royal assent',
      'groupe.5': 'Became law', 'groupe.4': 'At third reading', 'groupe.3': 'In committee',
      'groupe.2': 'At second reading', 'groupe.1': 'Tabled, nothing since',
      'projet.parraine': 'Sponsored by', 'projet.note': 'Explanatory note (official)',
      'projet.ouvrir': 'What this bill does',
      'projet.resume': 'In plain words',
      'projet.resumeIA': 'Written by AI from the official text published on ola.org. Not an official document, and not the law as amended since.',
      'projet.sansNote': 'The Assembly published no explanatory note for this bill. The official text says what it does.',
      'projet.source': 'Read the bill on ola.org', 'projet.votes': 'recorded votes',
      'projet.compteVotes': (n) => `${n} recorded vote${n > 1 ? 's' : ''}`,
      'projet.avertissement': 'Open a bill to read a plain-language summary, written by AI from the official text and marked as such, then the Assembly’s own explanatory note — which the Assembly writes as a reader’s aid, and which is not part of the law.',
      'projet.derniere': 'Last activity',
      'votes.titre': 'Recorded votes', 'votes.pour': 'Ayes', 'votes.contre': 'Nays',
      'votes.resultat': 'Outcome', 'votes.date': 'Date', 'votes.sujet': 'Question',
      'votes.detail': 'Who voted how', 'votes.fermer': 'Close',
      'votes.ancien': 'no longer an MPP',
      'votes.sansNoms': 'For this division the Assembly published the totals only, not the names. The minutes are the source.',
      'votes.pv': 'Minutes of the day →',
      'votes.compte': (n) => `${n} division${n > 1 ? 's' : ''}`,
      'votes.nominatif': 'Recorded division',
      'votes.page': 'Full vote on ola.org →',
      'votes.absences': 'Ontario records only the members who voted: there is no abstention and no absence list. The party breakdown is counted from the names, not published as such.',
      'votes.ajournement-chambre': 'Motion to adjourn the House',
      'votes.ajournement-debat': 'Motion to adjourn the debate',
      'votes.proposePar': 'moved by',
      'deputes.titre': 'Members of Provincial Parliament', 'deputes.recherche': 'Search by name or riding',
      'deputes.circo': 'Riding', 'deputes.parti': 'Party', 'deputes.courriel': 'Email',
      'cabinet.titre': 'Cabinet', 'cabinet.adjoints': 'Parliamentary assistants',
      'cabinet.titreOfficiel': 'Official title',
      'accueil.chapo': "Ontario's 124 MPPs pass the laws that shape schools, housing, health care and mining. DossierOntario follows every bill, every recorded vote and every member — from the official record, with a link back to it on each item.",
      'accueil.mouvements': 'Latest activity',
      'porte.projets': 'What is being proposed', 'porte.votes': 'Who voted how',
      'porte.deputes': 'Who represents you', 'porte.cabinet': 'Who runs what',
      'porte.lexique': 'What the words mean',
      'accueil.titre1': 'WHAT THE', 'accueil.titre2': 'LEGISLATURE', 'accueil.titre3': 'IS DOING',
      'intro.projets': '<b>44th Parliament, 1st session.</b> A bill goes through first reading, second reading, committee, third reading and royal assent. Most bills introduced by members never leave first reading — that is not a failure of this site, it is what the record shows.',
      'intro.votes': 'A recorded division happens when five or more MPPs stand to ask for one. Only then are individual names recorded. MPPs who were absent are not listed — the Assembly does not publish absences, so neither do we.',
      'intro.deduction': 'ola.org does not say whether a bill comes from the government: we work it out from the sponsor — a minister, with a portfolio in brackets. Everything else on this page is taken from the record word for word.',
      'intro.cabinet': "Official titles come from the Ontario government's own bilingual reference list (ONTERM), published in the Ontario Data Catalogue. We do not translate a title ourselves.",
      'sources.intro': '<b>This site is not official.</b> It has no link with the Legislative Assembly of Ontario or the Government of Ontario. It is free: no subscription, no advertising. It reproduces short extracts and links back to the source, as the Assembly’s terms of use allow for reasonable, fair and non-commercial use.',
      'sources.doù': 'Where the data comes from',
      'sources.quoi': 'Data', 'sources.source': 'Source',
      'sources.pasTitre': 'What this site does not do',
      'sources.pas': 'It never invents a missing value: an unknown field is shown as unknown. It never gets around a site’s protections — our reader identifies itself honestly and follows ola.org’s robots.txt, which is why we follow links instead of using the Assembly’s own search engine. Ontario has no electronic petitions, and Hansard is not translated, so neither appears here.',
      'sources.l1': 'Bills, stages, explanatory notes, official texts (the source of the plain-language summaries)',
      'sources.l2': 'Recorded votes',
      'sources.l3': 'MPPs, party standings, contact details', 'sources.l4': 'Ministers, official French titles',
    },
    fr: {
      'nav.accueil': 'Accueil', 'nav.projets': 'Projets de loi', 'nav.votes': 'Votes',
      'nav.deputes': 'Député·e·s', 'nav.cabinet': 'Conseil des ministres', 'nav.sources': 'Sources',
      'nav.lexique': 'Lexique', 'nav.comites': 'Comités',
      'comites.titre': 'Les comités permanents',
      'comites.intro': 'Un projet de loi renvoyé en comité y est étudié article par article ; des témoins sont entendus et le texte peut être amendé. Les comités siègent aussi pendant l’ajournement de la Chambre — c’est pourquoi un projet peut avancer en août, l’Assemblée absente.',
      'comites.votes': 'Les comités tiennent eux aussi des votes nominatifs — environ trois fois plus que la Chambre, sur des amendements. L’Assemblée ne les publie qu’à l’intérieur des transcriptions, au fil du texte, et seulement quand un·e député·e le demande : à peu près une décision de comité sur sept. Ils ne sont pas encore recensés sur ce site.',
      'comites.projets': (n) => `${n} projet${n > 1 ? 's' : ''} de loi`,
      'comites.jours': (n) => `${n} jour${n > 1 ? 's' : ''} de séance`,
      'comites.transcriptions': (n) => `${n} transcription${n > 1 ? 's' : ''}`,
      'comites.transcription': 'Transcription →',
      'comites.sansTranscription': 'pas de transcription de comité (décidé à la Chambre)',
      'comites.activite': 'Derniers travaux sur des projets de loi',
      'comites.aucune': 'Aucun projet de loi ne lui a été renvoyé cette session.',
      'comites.page': 'Le comité sur ola.org →',
      'comites.etudies': 'Projets de loi étudiés', 'comites.composition': 'Qui y siège',
      'comites.legislatifs': 'Comités qui ont étudié des projets de loi',
      'comites.surveillance': 'Comités de surveillance',
      'lexique.titre': 'Le lexique en langage clair',
      'lexique.intro': 'Les mots du Parlement, expliqués avec des mots de tous les jours. Ces explications sont les nôtres, pas celles de l’Assemblée : elles cherchent à être comprises, pas à être exactes au sens juridique. Pour les définitions formelles, l’Assemblée publie son propre glossaire.',
      'lexique.officiel': 'Le glossaire des termes de procédure de l’Assemblée →',
      'entete.erable': 'Aller au site fédéral — DossierCanada',
      'entete.langue': 'English', 'entete.theme': 'Thème', 'entete.plus': 'A+', 'entete.moins': 'A−',
      'pied.nonOfficiel': "Site non officiel — sans lien avec l'Assemblée législative de l'Ontario",
      'pied.sources': "Données publiques de l'Assemblée législative de l'Ontario (ola.org) et du Catalogue de données de l'Ontario",
      'pied.gratuit': 'Gratuit, sans abonnement et sans publicité.',
      'pied.maj': 'Données lues le',
      'chiffre.projets': 'projets de loi publics', 'chiffre.sanctionnes': 'devenus lois',
      'chiffre.votes': 'votes nominatifs', 'chiffre.deputes': 'sièges',
      'relache.titre': 'La Chambre ne siège pas',
      'relache.texte': (fin, retour) =>
        `La dernière séance remonte au ${fin}. Rien ne bougera avant le retour de la Chambre, le ${retour} — les chiffres ci-dessous ne sont pas périmés, l'Assemblée est simplement absente.`,
      'relache.texteSansRetour': (fin) =>
        `La dernière séance remonte au ${fin}, et aucune prochaine séance n'est encore annoncée. Les chiffres ci-dessous ne sont pas périmés, l'Assemblée est simplement absente.`,
      'mission.surTitre': 'Notre mission',
      'mission.enonce': 'Le site de l’Assemblée est la source la plus fiable qui existe. Celui-ci la rend juste <span class="surlignage">plus facile à suivre.</span>',
      'mission.euxTitre': 'Ce que fait ola.org',
      'mission.eux': '<li>Organise tout par document officiel — projets, procès-verbaux, Journal des débats</li><li>La source légale, complète et qui fait foi</li><li>Neutre : il ne résume jamais et ne compare jamais</li>',
      'mission.nousTitre': 'Ce que ce site essaie de faire',
      'mission.nous': '<li>Organise tout par projet de loi : une carte, tout son parcours</li><li>Traduit le jargon en mots de tous les jours (voir le Lexique)</li><li>Dit ce qui manque et pourquoi, et renvoie à la source sur chaque élément</li>',
      'pied.code': 'Code source',
      'mission.titre': 'Lire le compte rendu, pas le communiqué',
      'mission.texte': "Chaque projet de loi, chaque vote nominatif et chaque élu·e, pris dans le compte rendu de l'Assemblée et reliés à lui. Gratuit, bilingue, et non officiel.",
      'projets.titre': 'Projets de loi', 'projets.recherche': 'Chercher par numéro ou par titre',
      'projets.tous': 'Tous', 'projets.gouvernement': 'Du gouvernement', 'projets.depute': 'De député·e·s',
      'projets.prive': "D'intérêt privé", 'projets.sanctionne': 'Devenu loi', 'projets.encours': 'En cours',
      'projets.aucun': 'Aucun projet ne correspond.',
      'projets.compte': (n) => `${n} projet${n > 1 ? 's' : ''} de loi`,
      'etape.1': '1re lecture', 'etape.2': '2e lecture', 'etape.3': 'Comité',
      'etape.4': '3e lecture', 'etape.5': 'Sanction royale',
      'groupe.5': 'Devenus lois', 'groupe.4': 'En troisième lecture', 'groupe.3': 'En comité',
      'groupe.2': 'En deuxième lecture', 'groupe.1': 'Déposés, rien depuis',
      'projet.parraine': 'Parrainé par', 'projet.note': 'Note explicative (officielle)',
      'projet.ouvrir': 'Ce que fait ce projet',
      'projet.resume': 'En clair',
      'projet.resumeIA': 'Rédigé par une IA à partir du texte officiel publié sur ola.org. Ce n’est pas un document officiel, ni la loi telle qu’amendée depuis.',
      'projet.sansNote': 'L’Assemblée n’a publié aucune note explicative pour ce projet. Le texte officiel dit ce qu’il fait.',
      'projet.source': 'Lire le projet sur ola.org', 'projet.votes': 'votes nominatifs',
      'projet.compteVotes': (n) => `${n} vote${n > 1 ? 's' : ''} nominati${n > 1 ? 'fs' : 'f'}`,
      'projet.avertissement': 'Ouvrez un projet pour lire un résumé en langage clair, rédigé par une IA à partir du texte officiel et signalé comme tel, puis la note explicative de l’Assemblée — qu’elle écrit à titre de service aux lecteurs et qui ne fait pas partie de la loi.',
      'projet.derniere': 'Dernière activité',
      'votes.titre': 'Votes nominatifs', 'votes.pour': 'Pour', 'votes.contre': 'Contre',
      'votes.resultat': 'Résultat', 'votes.date': 'Date', 'votes.sujet': 'Question',
      'votes.detail': 'Qui a voté quoi', 'votes.fermer': 'Fermer',
      'votes.ancien': 'ne siège plus',
      'votes.sansNoms': 'Pour ce vote, l’Assemblée n’a publié que les totaux, sans les noms. Le procès-verbal fait foi.',
      'votes.pv': 'Procès-verbal du jour →',
      'votes.compte': (n) => `${n} vote${n > 1 ? 's' : ''}`,
      'votes.nominatif': 'Vote nominatif',
      'votes.page': 'Le vote complet sur ola.org →',
      'votes.absences': 'L’Ontario ne consigne que les député·e·s qui ont voté : il n’y a ni abstention ni liste d’absences. La répartition par parti est comptée à partir des noms, elle n’est pas publiée telle quelle.',
      'votes.ajournement-chambre': 'Motion d’ajournement de l’Assemblée',
      'votes.ajournement-debat': 'Motion d’ajournement du débat',
      'votes.proposePar': 'proposée par',
      'deputes.titre': 'Député·e·s', 'deputes.recherche': 'Chercher par nom ou circonscription',
      'deputes.circo': 'Circonscription', 'deputes.parti': 'Parti', 'deputes.courriel': 'Courriel',
      'cabinet.titre': 'Conseil des ministres', 'cabinet.adjoints': 'Adjoint·e·s parlementaires',
      'cabinet.titreOfficiel': 'Titre officiel',
      'accueil.chapo': "Les 124 député·e·s de l'Ontario adoptent les lois qui touchent les écoles, le logement, les soins et les mines. DossierOntario suit chaque projet de loi, chaque vote nominatif et chaque élu·e — à partir du compte rendu officiel, avec un lien vers lui sur chaque élément.",
      'accueil.mouvements': 'Derniers mouvements',
      'porte.projets': 'Ce qui est proposé', 'porte.votes': 'Qui a voté quoi',
      'porte.deputes': 'Qui vous représente', 'porte.cabinet': 'Qui dirige quoi',
      'porte.lexique': 'Ce que les mots veulent dire',
      'accueil.titre1': 'CE QUE', 'accueil.titre2': 'L’ASSEMBLÉE', 'accueil.titre3': 'FAIT',
      'intro.projets': '<b>44e législature, 1re session.</b> Un projet de loi passe par la première lecture, la deuxième lecture, le comité, la troisième lecture et la sanction royale. La plupart des projets déposés par des député·e·s ne dépassent jamais la première lecture — ce n’est pas un trou dans ce site, c’est ce que dit le compte rendu.',
      'intro.votes': 'Il y a vote nominatif quand cinq député·e·s ou plus se lèvent pour le demander. Les noms ne sont consignés qu’à ce moment-là. Les absent·e·s n’apparaissent pas : l’Assemblée ne publie pas les absences, et nous n’en déduisons rien.',
      'intro.deduction': 'ola.org n’écrit nulle part qu’un projet vient du gouvernement : on le déduit du parrain — un ministre, avec son portefeuille entre parenthèses. Tout le reste de cette page est repris du compte rendu, mot pour mot.',
      'intro.cabinet': 'Les titres officiels viennent de la liste bilingue du gouvernement de l’Ontario (ONTERM), publiée dans le Catalogue de données. Nous ne traduisons jamais un titre nous-mêmes.',
      'sources.intro': '<b>Ce site n’est pas officiel.</b> Il n’a aucun lien avec l’Assemblée législative de l’Ontario ni avec le gouvernement de l’Ontario. Il est gratuit : aucun abonnement, aucune publicité. Il reprend de courts extraits et renvoie à la source, comme les conditions d’utilisation de l’Assemblée le permettent pour un usage raisonnable, équitable et non commercial.',
      'sources.doù': 'D’où viennent les données',
      'sources.quoi': 'Donnée', 'sources.source': 'Source',
      'sources.pasTitre': 'Ce que ce site ne fait pas',
      'sources.pas': 'Il n’invente jamais une donnée manquante : un champ inconnu est affiché comme inconnu. Il ne contourne aucune protection — notre lecteur s’identifie honnêtement et respecte le robots.txt d’ola.org, ce qui explique qu’on suive les liens au lieu d’utiliser le moteur de recherche de l’Assemblée. L’Ontario n’a pas de pétitions électroniques, et le Journal des débats n’est pas traduit : ni l’un ni l’autre n’apparaît ici.',
      'sources.l1': 'Projets de loi, étapes, notes explicatives, textes officiels (la source des résumés en clair)',
      'sources.l2': 'Votes nominatifs',
      'sources.l3': 'Député·e·s, état des partis, coordonnées', 'sources.l4': 'Ministres, titres officiels français',
    },
  };

  let langue = lire(CLE_LANGUE) === 'fr' ? 'fr' : 'en';
  const mot = (cle, ...args) => {
    const v = MOTS[langue][cle] ?? MOTS.en[cle] ?? cle;
    return typeof v === 'function' ? v(...args) : v;
  };
  /** Choisit la version française si elle existe ET si on est en français. */
  const selonLangue = (en, fr) => (langue === 'fr' && fr ? fr : en);

  const date = (iso) => {
    if (!iso) return null;
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString(langue === 'fr' ? 'fr-CA' : 'en-CA', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const echapper = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Le sigle d'un parti, pour la pastille d'une carte : « Progressive Conservative Party of
  // Ontario » ne tient pas sur une ligne de carte, et l'écrire au long trois fois par carte
  // noie le reste. Ce sont les formes que tout le monde emploie en Ontario, pas des
  // abréviations inventées — et le nom officiel entier reste dans l'infobulle, sur la page
  // des député·e·s et dans les données. Un parti inconnu de cette table s'écrit au long
  // plutôt que de disparaître.
  const SIGLES = {
    'Progressive Conservative Party of Ontario': 'PC',
    'New Democratic Party of Ontario': 'NDP',
    'Ontario Liberal Party': 'Liberal',
    'Green Party of Ontario': 'Green',
    'Parti progressiste-conservateur de l’Ontario': 'PC',
    "Parti progressiste-conservateur de l'Ontario": 'PC',
    'Nouveau Parti démocratique de l’Ontario': 'NPD',
    "Nouveau Parti démocratique de l'Ontario": 'NPD',
    'Parti libéral de l’Ontario': 'Libéral',
    "Parti libéral de l'Ontario": 'Libéral',
    'Parti vert de l’Ontario': 'Vert',
    "Parti vert de l'Ontario": 'Vert',
  };
  const sigleParti = (nom) => SIGLES[nom] ?? nom;

  // Noir ou blanc sur la couleur du parti, selon sa luminance : l'orange du NPD et le gris
  // d'une personne indépendante sont trop clairs pour du texte blanc.
  const texteSurParti = (hex) => {
    const m = /^#([0-9a-f]{6})$/i.exec(String(hex ?? ''));
    if (!m) return '#FFFFFF';
    const n = parseInt(m[1], 16);
    const luminance = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    return luminance > 160 ? '#111111' : '#FFFFFF';
  };

  // ---------------------------------------------------------------- en-tête
  function appliquerLangue() {
    document.documentElement.lang = langue;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = mot(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      el.innerHTML = mot(el.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.title = mot(el.getAttribute('data-i18n-title'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = mot(el.getAttribute('data-i18n-placeholder'));
    });
  }

  function poserEntete() {
    const theme = lire(CLE_THEME) === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);

    document.querySelector('[data-action="theme"]')?.addEventListener('click', () => {
      const nouveau = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nouveau);
      ranger(CLE_THEME, nouveau);
    });

    document.querySelector('[data-action="langue"]')?.addEventListener('click', () => {
      langue = langue === 'fr' ? 'en' : 'fr';
      ranger(CLE_LANGUE, langue);
      appliquerLangue();
      rendre();
    });

    let zoom = Number(lire('dossier:zoom')) || 100;
    const appliquerZoom = () => {
      document.documentElement.style.fontSize = `${zoom}%`;
      ranger('dossier:zoom', String(zoom));
    };
    document.querySelector('[data-action="plus"]')?.addEventListener('click', () => {
      zoom = Math.min(160, zoom + 10); appliquerZoom();
    });
    document.querySelector('[data-action="moins"]')?.addEventListener('click', () => {
      zoom = Math.max(80, zoom - 10); appliquerZoom();
    });
    if (zoom !== 100) appliquerZoom();

    const erable = document.querySelector('.erable');
    if (erable && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInterval(() => erable.classList.toggle('est-rouge'), 20000);
    }
  }

  // ---------------------------------------------------------------- données
  const DONNEES = {};

  async function charger() {
    const voulus = (document.body.dataset.donnees || '').split(/\s+/).filter(Boolean);
    await Promise.all(
      voulus.map(async (nom) => {
        try {
          // « contenu:x » = un fichier ÉCRIT (le lexique) ; sinon, une donnée RÉCOLTÉE.
          const chemin = nom.startsWith('contenu:') ? `contenu/${nom.slice(8)}.json` : `data/site/${nom}.json`;
          const res = await fetch(chemin, { cache: 'no-cache' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          DONNEES[nom.replace('contenu:', '')] = await res.json();
        } catch (err) {
          console.error(`Données « ${nom} » indisponibles :`, err.message);
          DONNEES[nom.replace('contenu:', '')] = null;
        }
      })
    );
  }

  // ---------------------------------------------------------------- rendus
  const VUES = {};

  VUES.accueil = () => {
    const a = DONNEES.apercu;
    const cible = document.querySelector('section[data-vue="accueil"]');
    if (!cible || !a) return;

    const chiffres = [
      [a.chiffres.projets, 'chiffre.projets'],
      [a.chiffres.sanctionnes, 'chiffre.sanctionnes'],
      [a.chiffres.votes, 'chiffre.votes'],
      [a.chiffres.sieges, 'chiffre.deputes'],
    ]
      .map(([n, cle]) => `<div class="chiffre"><b>${n}</b><span>${mot(cle)}</span></div>`)
      .join('');

    const mouvements = (a.derniersMouvements ?? [])
      .map(
        (m) => `<tr>
          <td>${date(m.date) ?? ''}</td>
          <td><span class="numero">${echapper(m.numero)}</span></td>
          <td>${echapper(selonLangue(m.titreEn, m.titreFr))}</td>
          <td>${echapper(selonLangue(m.evenementEn, m.evenementFr) ?? '')}${
            m.comiteEn ? `<span class="legende"> · ${echapper(selonLangue(m.comiteEn, m.comiteFr))}</span>` : ''
          }</td>
        </tr>`
      )
      .join('');

    const portes = [
      ['/bills', 'nav.projets', 'porte.projets'],
      ['/votes', 'nav.votes', 'porte.votes'],
      ['/mpps', 'nav.deputes', 'porte.deputes'],
      ['/cabinet', 'nav.cabinet', 'porte.cabinet'],
      ['/glossary', 'nav.lexique', 'porte.lexique'],
    ]
      .map(([lien, titre, sous]) => `<a class="porte" href="${lien}"><b>${mot(titre)}</b><span>${mot(sous)}</span></a>`)
      .join('');

    cible.innerHTML = `
      <div class="chiffres">${chiffres}</div>
      <div class="portes">${portes}</div>
      <h2 class="titre-groupe">${mot('accueil.mouvements')}</h2>
      <table class="tableau"><tbody>${mouvements}</tbody></table>`;
  };

  VUES.projets = () => {
    const cible = document.querySelector('section[data-vue="projets"]');
    const projets = DONNEES.bills?.projets;
    if (!cible || !projets) return;

    let filtre = 'tous';
    let recherche = '';

    const carte = (p) => {
      const titre = selonLangue(p.titreEn, p.titreFr);
      // Sur la pastille, du langage clair (la charte l'exige) ; l'état officiel, mot
      // pour mot, reste affiché juste en dessous.
      const statut = selonLangue(p.statutEn, p.statutFr) ?? p.statutDerniereEtape;
      const etiquette =
        p.etape === 5 ? mot('projets.sanctionne') : p.etape === 1 ? mot('etape.1') : mot('projets.encours');
      const pastille =
        p.etape === 5 ? 'pastille-sanctionne' : p.etape >= 2 ? 'pastille-encours' : '';
      const etapes = [1, 2, 3, 4, 5]
        .map((n) => `<div class="etape ${p.etape >= n ? 'franchie' : ''}">${mot(`etape.${n}`)}</div>`)
        .join('');
      const note = selonLangue(p.noteEn, p.noteFr);
      // Le résumé en clair arrive AVANT la note officielle : c'est ce qu'on vient chercher.
      // La note reste dessous, mot pour mot — le résumé ne la remplace pas, il y mène.
      const resume = selonLangue(p.resumeEn, p.resumeFr);
      const lien = selonLangue(p.url, p.urlFr);
      const parti = selonLangue(p.parrainParti, p.parrainPartiFr);
      const pastilleParti = parti
        ? `<span class="pastille pastille-parti" style="background:${echapper(p.parrainCouleur ?? '#8B8578')};
             border-color:${echapper(p.parrainCouleur ?? '#8B8578')}; color:${texteSurParti(p.parrainCouleur)}"
             title="${echapper(parti)}">${echapper(sigleParti(parti))}</span>`
        : '';
      // La note explicative reste PLIÉE. Dépliée sur chaque carte, elle donnait 191 pavés de
      // prose juridique à la file : la liste ne se parcourait plus, et l'extrait coupé à 260
      // signes s'arrêtait au milieu d'une phrase. Pliée, la liste se lit ; dépliée, la note
      // est entière et le texte officiel est à un clic.
      return `<article class="carte">
        <div><span class="numero">${echapper(p.numero)}</span>
          <span class="pastille ${pastille}">${echapper(etiquette)}</span>
          ${p.type === 'prive' ? `<span class="pastille">${mot('projets.prive')}</span>` : ''}
          ${pastilleParti}</div>
        <h3 class="carte-titre">${echapper(titre)}</h3>
        ${statut ? `<p class="legende">${echapper(statut)}</p>` : ''}
        <p class="legende">${mot('projet.parraine')} ${echapper(p.parrains.join(', '))}</p>
        <div class="etapes">${etapes}</div>
        <p class="legende">${p.derniereActivite ? `${mot('projet.derniere')} : ${date(p.derniereActivite)}` : ''}
          ${p.votes ? ` · ${mot('projet.compteVotes', p.votes)}` : ''}</p>
        <details class="projet-detail">
          <summary>${mot('projet.ouvrir')}</summary>
          <div class="projet-detail-corps">
            ${
              resume
                ? `<h4 class="sous-titre">${mot('projet.resume')}</h4>
                   <ul class="resume">${resume.map((x) => `<li>${echapper(x)}</li>`).join('')}</ul>
                   <p class="legende avis-ia">${mot('projet.resumeIA')}</p>`
                : ''
            }
            ${
              note
                ? `<h4 class="sous-titre">${mot('projet.note')}</h4><p class="courant">${echapper(note)}</p>`
                : `<p class="legende">${mot('projet.sansNote')}</p>`
            }
            <a class="bouton-source" href="${echapper(lien)}" target="_blank" rel="noopener">${mot('projet.source')} →</a>
          </div>
        </details>
      </article>`;
    };

    const retenu = (p, f) =>
      f === 'tous' || (f === 'sanctionne' ? p.etape === 5 : f === 'encours' ? p.etape < 5 : p.typeProjet === f);

    const dessiner = () => {
      const visibles = projets.filter((p) => {
        const texte = `${p.numero} ${p.titreEn} ${p.titreFr ?? ''}`.toLowerCase();
        return retenu(p, filtre) && (!recherche || texte.includes(recherche));
      });
      cible.querySelector('[data-role="compte"]').textContent = mot('projets.compte', visibles.length);

      // Rangés par étape franchie, de la sanction royale au simple dépôt : sans ces
      // têtes de groupe, 191 cartes se suivent sans que l'œil ait où se poser.
      const groupes = [5, 4, 3, 2, 1]
        .map((etape) => ({
          etape,
          projets: visibles
            .filter((p) => p.etape === etape)
            .sort((a, b) => (b.derniereActivite ?? '').localeCompare(a.derniereActivite ?? '')),
        }))
        .filter((g) => g.projets.length);

      cible.querySelector('[data-role="liste"]').innerHTML = groupes.length
        ? groupes
            .map(
              (g) => `<h2 class="titre-groupe">${mot(`groupe.${g.etape}`)}
                  <span class="compte">${mot('projets.compte', g.projets.length)}</span></h2>
                <div class="grille">${g.projets.map(carte).join('')}</div>`
            )
            .join('')
        : `<p class="courant">${mot('projets.aucun')}</p>`;
    };

    // Chaque filtre annonce combien de projets il montrera : on ne clique pas à l'aveugle.
    const filtres = ['tous', 'gouvernement', 'depute', 'prive', 'sanctionne', 'encours']
      .map((f) => {
        const n = projets.filter((p) => retenu(p, f)).length;
        return `<button class="filtre ${f === 'tous' ? 'actif' : ''}" data-filtre="${f}">${mot(
          `projets.${f}`
        )} <span class="compte">${n}</span></button>`;
      })
      .join('');

    cible.innerHTML = `
      <div class="barre-filtres">
        <input class="champ" type="search" data-role="recherche" placeholder="${mot('projets.recherche')}" aria-label="${mot('projets.recherche')}">
        ${filtres}
      </div>
      <p class="legende" data-role="compte"></p>
      <div data-role="liste"></div>`;

    cible.querySelectorAll('[data-filtre]').forEach((b) =>
      b.addEventListener('click', () => {
        cible.querySelectorAll('[data-filtre]').forEach((x) => x.classList.remove('actif'));
        b.classList.add('actif');
        filtre = b.dataset.filtre;
        dessiner();
      })
    );
    cible.querySelector('[data-role="recherche"]').addEventListener('input', (e) => {
      recherche = e.target.value.trim().toLowerCase();
      dessiner();
    });
    dessiner();
  };

  VUES.votes = () => {
    const cible = document.querySelector('section[data-vue="votes"]');
    const votes = DONNEES.votes?.votes;
    const deputes = DONNEES.members?.deputes ?? [];
    if (!cible || !votes) return;
    const parIdentifiant = new Map(deputes.map((d) => [d.identifiant, d]));
    // Les personnes qui ont voté puis quitté l'Assemblée gardent leur nom, avec la
    // mention qu'elles n'y siègent plus.
    const anciens = new Map(Object.entries(DONNEES.votes?.anciens ?? {}));

    // Le titre d'un vote : le sujet officiel quand il existe, sinon l'étiquette composée
    // à partir de ce que le procès-verbal énonce (quelle motion, proposée par qui).
    const sujet = (v) => {
      const officiel = selonLangue(v.sujetEn, v.sujetFr);
      if (officiel) return officiel;
      if (!v.motion) return mot('votes.titre');
      return v.proposePar
        ? `${mot('votes.' + v.motion)} — ${mot('votes.proposePar')} ${v.proposePar}`
        : mot('votes.' + v.motion);
    };

    /** Qui a voté : la fiche du ou de la député·e, même s'il ou elle ne siège plus. */
    const fiche = (identifiant) => parIdentifiant.get(identifiant) ?? anciens.get(identifiant) ?? null;

    /** Le compte par parti, calculé à partir des noms — l'Assemblée ne le publie pas. */
    const parPartis = (v) => {
      const partis = new Map();
      for (const [identifiant, camp] of v.votants) {
        const d = fiche(identifiant);
        const nom = d ? selonLangue(d.parti, d.partiFr) ?? '—' : '—';
        if (!partis.has(nom)) {
          partis.set(nom, { nom, couleur: d?.couleurParti ?? '#8B8578', pour: 0, contre: 0 });
        }
        partis.get(nom)[camp]++;
      }
      return [...partis.values()].sort((a, b) => b.pour + b.contre - (a.pour + a.contre));
    };

    const colonne = (v, camp) => {
      const noms = v.votants
        .filter((x) => x[1] === camp)
        .map((x) => {
          const d = fiche(x[0]);
          const ancien = !parIdentifiant.has(x[0]) && anciens.has(x[0]);
          return `<li><span class="puce-parti" style="background:${echapper(
            d?.couleurParti ?? '#8B8578'
          )}" aria-hidden="true"></span>${echapper(d ? d.nom : x[0])}${
            ancien ? ` <span class="legende">· ${mot('votes.ancien')}</span>` : ''
          }</li>`;
        })
        .join('');
      const total = camp === 'pour' ? v.pour : v.contre;
      return `<div class="colonne-votants">
        <h4 class="tete-${camp}">${mot(`votes.${camp}`)} — ${total}</h4>
        <ul>${noms}</ul>
      </div>`;
    };

    const detail = (v) => {
      const partis = parPartis(v)
        .map(
          (p) => `<div class="parti-boite">
            <h4 style="background:${echapper(p.couleur)}">${echapper(p.nom)}</h4>
            <dl>
              <dt>${mot('votes.pour')}</dt><dd class="pour">${p.pour}</dd>
              <dt>${mot('votes.contre')}</dt><dd class="contre">${p.contre}</dd>
            </dl>
          </div>`
        )
        .join('');

      return `<div class="partis">${partis}</div>
        <div class="colonnes-votants">${colonne(v, 'pour')}${colonne(v, 'contre')}</div>`;
    };

    /** La barre de proportion : verte pour les pour, rouge pour les contre. */
    const barre = (v) => {
      const total = (v.pour ?? 0) + (v.contre ?? 0);
      if (!total) return '';
      const part = (n) => `${((n / total) * 100).toFixed(1)}%`;
      return `<div class="barre-proportion" role="img"
        aria-label="${mot('votes.pour')} ${v.pour}, ${mot('votes.contre')} ${v.contre}">
        <span class="part-pour" style="width:${part(v.pour)}"></span>
        <span class="part-contre" style="width:${part(v.contre)}"></span>
      </div>`;
    };

    // Un vote n'arrive jamais seul : la Chambre en tient plusieurs le même jour. On les
    // range donc par jour de séance, du plus récent au plus ancien.
    const parJour = new Map();
    for (const v of votes) {
      const jour = v.date ?? '—';
      if (!parJour.has(jour)) parJour.set(jour, []);
      parJour.get(jour).push(v);
    }

    const carteVote = (v) => {
      const adopte = /^Carried|^Adopt/i.test(v.resultatEn ?? v.resultatFr ?? '');
      const meta = [
        date(v.date),
        mot('votes.nominatif'),
        selonLangue(v.typeEn, v.typeFr),
      ].filter(Boolean);

      return `<details class="carte">
        <summary class="vote-entete">
          <span class="pastille ${adopte ? 'pastille-adopte' : 'pastille-rejete'}">${echapper(
            selonLangue(v.resultatEn, v.resultatFr) ?? ''
          )}</span>
          <h3 class="carte-titre">${echapper(sujet(v))}</h3>
          <span class="vote-comptes"><b class="pour">${v.pour}</b> ${mot('votes.pour')}
            <b class="contre">${v.contre}</b> ${mot('votes.contre')}</span>
        </summary>
        <p class="legende">${echapper(meta.join(' · '))}</p>
        ${barre(v)}
        ${v.sansNoms ? `<p class="courant">${mot('votes.sansNoms')}</p>` : detail(v)}
        <p class="legende note-vote">${mot('votes.absences')}</p>
        <a class="bouton bouton-jaune" href="${echapper(selonLangue(v.url, v.urlFr))}"
           target="_blank" rel="noopener">${v.sansNoms ? mot('votes.pv') : mot('votes.page')}</a>
      </details>`;
    };

    cible.innerHTML = [...parJour.entries()]
      .map(
        ([jour, duJour]) => `<h2 class="titre-groupe">${date(jour) ?? jour}
            <span class="compte">${mot('votes.compte', duJour.length)}</span></h2>
          ${duJour.map(carteVote).join('')}`
      )
      .join('');
  };

  VUES.comites = () => {
    const cible = document.querySelector('section[data-vue="comites"]');
    const donnees = DONNEES.comites;
    if (!cible || !donnees) return;

    const membre = (m) => `<li>
      <span class="puce-parti" style="background:${echapper(m.couleurParti ?? '#8B8578')}" aria-hidden="true"></span>
      ${m.url ? `<a href="${echapper(m.url)}" target="_blank" rel="noopener">${echapper(m.nom)}</a>` : echapper(m.nom)}
      ${m.role && !/^members?$/i.test(m.role) ? `<span class="legende">${echapper(m.role)}</span>` : ''}
    </li>`;

    // Un projet de loi se déplie sur ses journées de comité, et chaque journée mène à la
    // transcription de ce jour-là. Les transcriptions appartiennent au projet dont elles
    // parlent : en colonne séparée, elles n'étaient qu'une liste de dates orphelines.
    const projet = (p) => {
      const journees = p.journees
        .map(
          (j) => `<li>
            <span class="legende">${date(j.date) ?? ''}</span>
            ${echapper(selonLangue(j.evenementEn, j.evenementFr) ?? '')}
            ${
              j.transcription
                ? `<a class="lien-source" href="${echapper(j.transcription)}" target="_blank"
                     rel="noopener">${mot('comites.transcription')}</a>`
                : `<span class="legende">${mot('comites.sansTranscription')}</span>`
            }
          </li>`
        )
        .join('');

      return `<details class="projet-comite">
        <summary>
          <span class="numero">${echapper(p.numero)}</span>
          <span class="projet-titre">${echapper(selonLangue(p.titreEn, p.titreFr))}</span>
          <span class="legende">${mot('comites.jours', p.jours)} · ${date(p.derniereDate) ?? ''}</span>
        </summary>
        <ul class="liste-sobre journees">${journees}</ul>
      </details>`;
    };

    const carte = (c) => {
      const mandat = selonLangue(c.mandatEn, c.mandatFr);
      const chiffres = [
        c.projets.length ? mot('comites.projets', c.projets.length) : null,
        c.transcriptions ? mot('comites.transcriptions', c.transcriptions) : null,
      ].filter(Boolean);

      return `<article class="comite">
        <div class="comite-entete">
          <h2 class="comite-nom">${echapper(selonLangue(c.nomEn, c.nomFr))}</h2>
          <p class="legende">${chiffres.join(' · ')}</p>
        </div>
        ${mandat ? `<p class="comite-mandat">${echapper(mandat)}</p>` : ''}
        <div class="comite-colonnes">
          <section>
            <h3 class="comite-soustitre">${mot('comites.etudies')}</h3>
            ${c.projets.length
              ? `<ul class="liste-sobre">${c.projets.map(projet).join('')}</ul>`
              : `<p class="courant">${mot('comites.aucune')}</p>`}
          </section>
          <section>
            <h3 class="comite-soustitre">${mot('comites.composition')}</h3>
            <ul class="liste-membres">${c.membres.map(membre).join('')}</ul>
            <a class="lien-source" href="${echapper(selonLangue(c.url, c.urlFr))}"
               target="_blank" rel="noopener">${mot('comites.page')}</a>
          </section>
        </div>
      </article>`;
    };

    // Ceux qui ont reçu des projets de loi d'abord : c'est là que se fait le travail
    // législatif. Les comités de surveillance suivent, sous leur propre titre.
    const avecProjets = donnees.comites.filter((c) => c.projets.length);
    const surveillance = donnees.comites.filter((c) => !c.projets.length);

    cible.innerHTML =
      `<h2 class="titre-groupe">${mot('comites.legislatifs')}
        <span class="compte">${avecProjets.length}</span></h2>` +
      avecProjets.map(carte).join('') +
      (surveillance.length
        ? `<h2 class="titre-groupe">${mot('comites.surveillance')}
            <span class="compte">${surveillance.length}</span></h2>` + surveillance.map(carte).join('')
        : '');
  };

  VUES.lexique = () => {
    const cible = document.querySelector('section[data-vue="lexique"]');
    const lex = DONNEES.lexique;
    if (!cible || !lex) return;

    const entree = (e) => `<article class="carte">
      <h3 class="carte-titre">${echapper(selonLangue(e.terme.en, e.terme.fr))}</h3>
      <p class="courant">${echapper(selonLangue(e.texte.en, e.texte.fr))}</p>
    </article>`;

    const ancre = (i) => `groupe-${i + 1}`;

    /**
     * Le bloc d'explication d'un groupe : plus long qu'une fiche, parce que certaines
     * choses ne s'expliquent pas en trois lignes — le rôle d'un comité, par exemple.
     *
     * Les {accolades} sont remplies par les chiffres du jour (data/site/apercu.json) :
     * un nombre écrit à la main dans un texte finit toujours par mentir. Les **gras** et
     * les *italiques* sont les seules mises en forme permises, et le texte est échappé
     * AVANT d'être balisé — le contenu reste du texte, jamais du HTML.
     */
    const explication = (g) => {
      if (!g.intro) return '';
      const chiffres = DONNEES.apercu?.chiffres ?? {};
      const valeurs = { enComite: chiffres.projetsEnComite, publics: chiffres.projets };

      const rendre = (p) =>
        echapper(p.replace(/\{(\w+)\}/g, (tel, cle) => (valeurs[cle] != null ? valeurs[cle] : tel)))
          .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
          .replace(/\*([^*]+)\*/g, '<i>$1</i>');

      const paragraphes = selonLangue(g.intro.en, g.intro.fr).map((p) => `<p>${rendre(p)}</p>`).join('');
      const note = g.note ? `<p class="legende">${echapper(selonLangue(g.note.en, g.note.fr))}</p>` : '';
      return `<div class="explication">${paragraphes}${note}</div>`;
    };

    cible.innerHTML =
      // Cinq groupes et vingt-quatre termes : des raccourcis évitent de tout faire défiler.
      `<nav class="raccourcis" aria-label="${mot('lexique.titre')}">${lex.groupes
        .map((g, i) => `<a href="#${ancre(i)}">${echapper(selonLangue(g.titre.en, g.titre.fr))}</a>`)
        .join('')}</nav>` +
      lex.groupes
        .map(
          (g, i) => `<h2 class="titre-groupe" id="${ancre(i)}">${echapper(selonLangue(g.titre.en, g.titre.fr))}
              <span class="compte">${g.entrees.length}</span></h2>
            ${explication(g)}
            <div class="grille">${g.entrees.map(entree).join('')}</div>`
        )
        .join('') +
      `<p class="legende" style="margin-top:22px">
        <a class="lien-source" href="${echapper(langue === 'fr' ? lex.source.fr : lex.source.en)}"
           target="_blank" rel="noopener">${mot('lexique.officiel')}</a></p>`;
  };

  VUES.deputes = () => {
    const cible = document.querySelector('section[data-vue="deputes"]');
    const d = DONNEES.members;
    if (!cible || !d) return;

    const etat = (d.etatPartis ?? [])
      .map((p, i) => {
        const nom = langue === 'fr' && d.etatPartisFr?.[i] ? d.etatPartisFr[i].parti : p.parti;
        return `<div class="chiffre"><b>${p.sieges}</b><span>${echapper(nom)}</span></div>`;
      })
      .join('');

    const carte = (m) => `<article class="carte">
      <h3 class="carte-titre"><a href="${echapper(m.url)}" target="_blank" rel="noopener">${echapper(m.nom)}</a></h3>
      <p><span class="pastille pastille-parti" style="background:${echapper(m.couleurParti ?? '#8B8578')}">${echapper(
        selonLangue(m.parti, m.partiFr) ?? ''
      )}</span></p>
      <p class="courant">${echapper(selonLangue(m.circonscription, m.circonscriptionFr) ?? '')}</p>
      ${m.courriel ? `<p class="legende"><a class="lien-source" href="mailto:${echapper(m.courriel)}">${echapper(m.courriel)}</a></p>` : ''}
    </article>`;

    cible.innerHTML = `
      <div class="chiffres">${etat}</div>
      ${d.avis ? `<div class="encadre">${echapper(selonLangue(d.avisEn, d.avisFr))}</div>` : ''}
      <div class="barre-filtres">
        <input class="champ" type="search" data-role="recherche" placeholder="${mot('deputes.recherche')}" aria-label="${mot('deputes.recherche')}">
      </div>
      <div class="grille" data-role="liste">${d.deputes.map(carte).join('')}</div>`;

    cible.querySelector('[data-role="recherche"]').addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const visibles = d.deputes.filter((m) =>
        `${m.nom} ${m.circonscription} ${m.circonscriptionFr ?? ''} ${m.parti}`.toLowerCase().includes(q)
      );
      cible.querySelector('[data-role="liste"]').innerHTML = visibles.map(carte).join('');
    });
  };

  VUES.cabinet = () => {
    const cible = document.querySelector('section[data-vue="cabinet"]');
    const c = DONNEES.cabinet;
    if (!cible || !c) return;

    const carte = (m) => `<article class="carte">
      <h3 class="carte-titre">${echapper(m.nom)}</h3>
      <p class="courant">${echapper(selonLangue(m.titreEn, m.titreFr) ?? '')}</p>
      ${m.url ? `<a class="lien-source" href="${echapper(m.url)}" target="_blank" rel="noopener">ola.org →</a>` : ''}
    </article>`;

    cible.innerHTML = `
      <div class="grille">${c.ministres.map(carte).join('')}</div>
      <h2 class="titre-vue">${mot('cabinet.adjoints')}</h2>
      <div class="grille">${(c.adjointsParlementaires ?? []).map(carte).join('')}</div>`;
  };

  /** La bande jaune ne s'affiche que s'il y a vraiment relâche, et dit jusqu'à quand. */
  function poserRelache() {
    const bande = document.querySelector('[data-role="relache"]');
    const cal = DONNEES.apercu?.calendrier;
    if (!bande) return;
    if (!cal?.enRelache || !cal.derniereSeance) {
      bande.hidden = true;
      return;
    }
    bande.hidden = false;
    bande.querySelector('[data-role="relache-titre"]').textContent = mot('relache.titre');
    bande.querySelector('[data-role="relache-texte"]').textContent = cal.prochaineSeance
      ? mot('relache.texte', date(cal.derniereSeance), date(cal.prochaineSeance))
      : mot('relache.texteSansRetour', date(cal.derniereSeance));
  }

  function rendre() {
    appliquerLangue();
    const vue = document.body.dataset.vue;
    if (VUES[vue]) VUES[vue]();
    poserRelache();
    const maj = DONNEES.apercu?.maj ?? DONNEES.bills?.maj ?? null;
    const pied = document.querySelector('[data-role="maj"]');
    if (pied && maj) pied.textContent = `${mot('pied.maj')} ${date(maj.slice(0, 10))}`;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    poserEntete();
    appliquerLangue();
    await charger();
    rendre();
  });
})();
