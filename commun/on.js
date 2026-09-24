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
      'entete.langue': 'Français', 'entete.theme': 'Theme', 'entete.plus': 'A+', 'entete.moins': 'A−',
      'pied.nonOfficiel': 'Unofficial site — not affiliated with the Legislative Assembly of Ontario',
      'pied.sources': 'Public data from the Legislative Assembly of Ontario (ola.org) and the Ontario Data Catalogue',
      'pied.gratuit': 'Free, no subscription, no advertising.',
      'pied.maj': 'Data read on',
      'chiffre.projets': 'public bills', 'chiffre.sanctionnes': 'became law',
      'chiffre.votes': 'recorded votes', 'chiffre.deputes': 'seats',
      'relache.titre': 'The House is not sitting',
      'projets.titre': 'Bills', 'projets.recherche': 'Search by number or title',
      'projets.tous': 'All', 'projets.gouvernement': 'Government', 'projets.depute': "Members'",
      'projets.prive': 'Private', 'projets.sanctionne': 'Became law', 'projets.encours': 'In progress',
      'projets.aucun': 'No bill matches.',
      'projets.compte': (n) => `${n} bill${n > 1 ? 's' : ''}`,
      'etape.1': '1st reading', 'etape.2': '2nd reading', 'etape.3': 'Committee',
      'etape.4': '3rd reading', 'etape.5': 'Royal assent',
      'projet.parraine': 'Sponsored by', 'projet.note': 'Explanatory note (official)',
      'projet.source': 'Read the bill on ola.org', 'projet.votes': 'recorded votes',
      'projet.compteVotes': (n) => `${n} recorded vote${n > 1 ? 's' : ''}`,
      'projet.avertissement': 'The explanatory note is written by the Assembly as a reader’s aid and is not part of the law.',
      'projet.derniere': 'Last activity',
      'votes.titre': 'Recorded votes', 'votes.pour': 'Ayes', 'votes.contre': 'Nays',
      'votes.resultat': 'Outcome', 'votes.date': 'Date', 'votes.sujet': 'Question',
      'votes.detail': 'Who voted how', 'votes.fermer': 'Close',
      'votes.ancien': 'no longer an MPP',
      'votes.sansNoms': 'For this division the Assembly published the totals only, not the names. The minutes are the source.',
      'votes.pv': 'Minutes of the day →',
      'votes.ajournement-chambre': 'Motion to adjourn the House',
      'votes.ajournement-debat': 'Motion to adjourn the debate',
      'votes.proposePar': 'moved by',
      'deputes.titre': 'Members of Provincial Parliament', 'deputes.recherche': 'Search by name or riding',
      'deputes.circo': 'Riding', 'deputes.parti': 'Party', 'deputes.courriel': 'Email',
      'cabinet.titre': 'Cabinet', 'cabinet.adjoints': 'Parliamentary assistants',
      'cabinet.titreOfficiel': 'Official title',
      'accueil.chapo': "Ontario's 124 MPPs pass the laws that shape schools, housing, health care and mining. DossierOntario follows every bill, every recorded vote and every member — from the official record, with a link back to it on each item.",
      'accueil.mouvements': 'Latest activity',
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
      'sources.l1': 'Bills, stages, explanatory notes', 'sources.l2': 'Recorded votes',
      'sources.l3': 'MPPs, party standings, contact details', 'sources.l4': 'Ministers, official French titles',
    },
    fr: {
      'nav.accueil': 'Accueil', 'nav.projets': 'Projets de loi', 'nav.votes': 'Votes',
      'nav.deputes': 'Député·e·s', 'nav.cabinet': 'Conseil des ministres', 'nav.sources': 'Sources',
      'entete.langue': 'English', 'entete.theme': 'Thème', 'entete.plus': 'A+', 'entete.moins': 'A−',
      'pied.nonOfficiel': "Site non officiel — sans lien avec l'Assemblée législative de l'Ontario",
      'pied.sources': "Données publiques de l'Assemblée législative de l'Ontario (ola.org) et du Catalogue de données de l'Ontario",
      'pied.gratuit': 'Gratuit, sans abonnement et sans publicité.',
      'pied.maj': 'Données lues le',
      'chiffre.projets': 'projets de loi publics', 'chiffre.sanctionnes': 'devenus lois',
      'chiffre.votes': 'votes nominatifs', 'chiffre.deputes': 'sièges',
      'relache.titre': 'La Chambre ne siège pas',
      'projets.titre': 'Projets de loi', 'projets.recherche': 'Chercher par numéro ou par titre',
      'projets.tous': 'Tous', 'projets.gouvernement': 'Du gouvernement', 'projets.depute': 'De député·e·s',
      'projets.prive': "D'intérêt privé", 'projets.sanctionne': 'Devenu loi', 'projets.encours': 'En cours',
      'projets.aucun': 'Aucun projet ne correspond.',
      'projets.compte': (n) => `${n} projet${n > 1 ? 's' : ''} de loi`,
      'etape.1': '1re lecture', 'etape.2': '2e lecture', 'etape.3': 'Comité',
      'etape.4': '3e lecture', 'etape.5': 'Sanction royale',
      'projet.parraine': 'Parrainé par', 'projet.note': 'Note explicative (officielle)',
      'projet.source': 'Lire le projet sur ola.org', 'projet.votes': 'votes nominatifs',
      'projet.compteVotes': (n) => `${n} vote${n > 1 ? 's' : ''} nominati${n > 1 ? 'fs' : 'f'}`,
      'projet.avertissement': 'La note explicative est rédigée par l’Assemblée à titre de service aux lecteurs et ne fait pas partie de la loi.',
      'projet.derniere': 'Dernière activité',
      'votes.titre': 'Votes nominatifs', 'votes.pour': 'Pour', 'votes.contre': 'Contre',
      'votes.resultat': 'Résultat', 'votes.date': 'Date', 'votes.sujet': 'Question',
      'votes.detail': 'Qui a voté quoi', 'votes.fermer': 'Fermer',
      'votes.ancien': 'ne siège plus',
      'votes.sansNoms': 'Pour ce vote, l’Assemblée n’a publié que les totaux, sans les noms. Le procès-verbal fait foi.',
      'votes.pv': 'Procès-verbal du jour →',
      'votes.ajournement-chambre': 'Motion d’ajournement de l’Assemblée',
      'votes.ajournement-debat': 'Motion d’ajournement du débat',
      'votes.proposePar': 'proposée par',
      'deputes.titre': 'Député·e·s', 'deputes.recherche': 'Chercher par nom ou circonscription',
      'deputes.circo': 'Circonscription', 'deputes.parti': 'Parti', 'deputes.courriel': 'Courriel',
      'cabinet.titre': 'Conseil des ministres', 'cabinet.adjoints': 'Adjoint·e·s parlementaires',
      'cabinet.titreOfficiel': 'Titre officiel',
      'accueil.chapo': "Les 124 député·e·s de l'Ontario adoptent les lois qui touchent les écoles, le logement, les soins et les mines. DossierOntario suit chaque projet de loi, chaque vote nominatif et chaque élu·e — à partir du compte rendu officiel, avec un lien vers lui sur chaque élément.",
      'accueil.mouvements': 'Derniers mouvements',
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
      'sources.l1': 'Projets de loi, étapes, notes explicatives', 'sources.l2': 'Votes nominatifs',
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

  // ---------------------------------------------------------------- en-tête
  function appliquerLangue() {
    document.documentElement.lang = langue;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = mot(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      el.innerHTML = mot(el.getAttribute('data-i18n-html'));
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
          const res = await fetch(`data/site/${nom}.json`, { cache: 'no-cache' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          DONNEES[nom] = await res.json();
        } catch (err) {
          console.error(`Données « ${nom} » indisponibles :`, err.message);
          DONNEES[nom] = null;
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
          <td>${echapper(selonLangue(m.evenementEn, m.evenementFr) ?? '')}</td>
        </tr>`
      )
      .join('');

    cible.innerHTML = `
      <div class="chiffres">${chiffres}</div>
      <h2 class="titre-vue">${mot('accueil.mouvements')}</h2>
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
      return `<article class="carte">
        <div><span class="numero">${echapper(p.numero)}</span>
          <span class="pastille ${pastille}">${echapper(etiquette)}</span>
          ${p.type === 'prive' ? `<span class="pastille">${mot('projets.prive')}</span>` : ''}</div>
        <h3 class="carte-titre"><a href="${echapper(p.url)}" target="_blank" rel="noopener">${echapper(titre)}</a></h3>
        ${statut ? `<p class="legende">${echapper(statut)}</p>` : ''}
        <p class="legende">${mot('projet.parraine')} ${echapper(p.parrains.join(', '))}</p>
        <div class="etapes">${etapes}</div>
        ${note ? `<p class="courant">${echapper(note.slice(0, 260))}${note.length > 260 ? '…' : ''}</p>` : ''}
        <p class="legende">${p.derniereActivite ? `${mot('projet.derniere')} : ${date(p.derniereActivite)}` : ''}
          ${p.votes ? ` · ${mot('projet.compteVotes', p.votes)}` : ''}</p>
        <a class="lien-source" href="${echapper(selonLangue(p.url, p.urlFr))}" target="_blank" rel="noopener">${mot('projet.source')} →</a>
      </article>`;
    };

    const dessiner = () => {
      const visibles = projets.filter((p) => {
        const okFiltre =
          filtre === 'tous' ||
          (filtre === 'sanctionne' ? p.etape === 5 : filtre === 'encours' ? p.etape < 5 : p.typeProjet === filtre);
        const texte = `${p.numero} ${p.titreEn} ${p.titreFr ?? ''}`.toLowerCase();
        return okFiltre && (!recherche || texte.includes(recherche));
      });
      cible.querySelector('[data-role="compte"]').textContent = mot('projets.compte', visibles.length);
      cible.querySelector('[data-role="liste"]').innerHTML = visibles.length
        ? visibles.map(carte).join('')
        : `<p class="courant">${mot('projets.aucun')}</p>`;
    };

    const filtres = ['tous', 'gouvernement', 'depute', 'prive', 'sanctionne', 'encours']
      .map((f) => `<button class="filtre ${f === 'tous' ? 'actif' : ''}" data-filtre="${f}">${mot(`projets.${f}`)}</button>`)
      .join('');

    cible.innerHTML = `
      <div class="barre-filtres">
        <input class="champ" type="search" data-role="recherche" placeholder="${mot('projets.recherche')}" aria-label="${mot('projets.recherche')}">
        ${filtres}
      </div>
      <p class="legende" data-role="compte"></p>
      <div class="grille" data-role="liste"></div>`;

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

    const detail = (v) => {
      const ligne = (camp) =>
        v.votants
          .filter((x) => x[1] === camp)
          .map((x) => {
            const d = parIdentifiant.get(x[0]) ?? anciens.get(x[0]) ?? null;
            const ancien = !parIdentifiant.has(x[0]) && anciens.has(x[0]);
            return `<li>${echapper(d ? d.nom : x[0])} <span class="legende">${echapper(
              d ? selonLangue(d.parti, d.partiFr) ?? '' : ''
            )}${ancien ? ` · ${mot('votes.ancien')}` : ''}</span></li>`;
          })
          .join('');
      return `<div class="grille">
        <div><h4 class="pour">${mot('votes.pour')} (${v.pour})</h4><ul>${ligne('pour')}</ul></div>
        <div><h4 class="contre">${mot('votes.contre')} (${v.contre})</h4><ul>${ligne('contre')}</ul></div>
      </div>`;
    };

    cible.innerHTML = votes
      .map(
        (v) => `<details class="carte">
          <summary>
            <span class="legende">${date(v.date) ?? ''}</span>
            <h3 class="carte-titre">${echapper(sujet(v))}</h3>
            <p class="legende">${selonLangue(v.typeEn, v.typeFr) ? `${echapper(selonLangue(v.typeEn, v.typeFr))} — ` : ''}
              <span class="pour">${mot('votes.pour')} ${v.pour}</span> ·
              <span class="contre">${mot('votes.contre')} ${v.contre}</span> ·
              ${echapper(selonLangue(v.resultatEn, v.resultatFr) ?? '')}</p>
          </summary>
          ${v.sansNoms ? `<p class="courant">${mot('votes.sansNoms')}</p>` : detail(v)}
          <a class="lien-source" href="${echapper(selonLangue(v.url, v.urlFr))}" target="_blank" rel="noopener">${
            v.sansNoms ? mot('votes.pv') : 'ola.org →'
          }</a>
        </details>`
      )
      .join('');
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

  function rendre() {
    appliquerLangue();
    const vue = document.body.dataset.vue;
    if (VUES[vue]) VUES[vue]();
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
