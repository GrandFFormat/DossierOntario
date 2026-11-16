/* « Have your say » (16 nov. 2026) : les audiences publiques des comités, lues dans
   /data/site/audiences.json (scrapers/audiences.js, chaque jour). Deux places :
   - l'accueil : tous les avis encore ouverts, sous le bloc d'ouverture ;
   - la fiche d'un projet de loi (/bill/140) : l'avis de ce projet seulement, sous le titre.
   Un avis disparaît quand toutes ses dates sont passées. Rien à venir : rien d'affiché.
   La langue suit celle du site (dossier:langue) et suit le bouton EN/FR sans recharger. */
(function () {
  'use strict';
  var MOIS = { en: ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'], fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juill.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'] };
  var JOURS = { en: ['Sun.', 'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.'], fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'] };
  var T = {
    en: { titre: 'Have your say', sous: 'Public hearings held by committees of the Legislature. Anyone can ask to speak or send a written submission.', titreProjet: 'Public hearings on this bill', prochaine: 'Hearing', prochaines: 'Next hearing', villes: function (n) { return n + ' cities'; }, inscrire: 'Register to speak by', memoire: 'Written submissions by', postuler: 'Register or send a submission ↗', avis: 'Official notice ↗', fiche: 'Bill page →', source: 'Source: notices of hearings, Legislative Assembly of Ontario.', ferme: 'closed' },
    fr: { titre: 'Donnez votre avis', sous: 'Audiences publiques des comités de l’Assemblée. Tout le monde peut demander à témoigner ou envoyer un mémoire écrit.', titreProjet: 'Audiences publiques sur ce projet de loi', prochaine: 'Audience', prochaines: 'Prochaine audience', villes: function (n) { return n + ' villes'; }, inscrire: 'S’inscrire pour témoigner avant le', memoire: 'Mémoires écrits jusqu’au', postuler: 'S’inscrire ou envoyer un mémoire ↗', avis: 'Avis officiel (anglais) ↗', fiche: 'Fiche du projet →', source: 'Source : avis d’audiences, Assemblée législative de l’Ontario.', ferme: 'fermée' }
  };
  function langue() { try { return localStorage.getItem('dossier:langue') === 'fr' ? 'fr' : 'en'; } catch (e) { return 'en'; } }
  function echapper(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function date(iso, lg) {
    var p = iso.split('-').map(Number), js = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
    return lg === 'fr' ? JOURS.fr[js] + ' ' + (p[2] === 1 ? '1er' : p[2]) + ' ' + MOIS.fr[p[1] - 1] : JOURS.en[js] + ' ' + MOIS.en[p[1] - 1] + ' ' + p[2];
  }
  function heure(h, lg) {   // « 12:00 p.m. » → « 12 h » en français
    if (lg !== 'fr') return h;
    var m = /^(\d{1,2}):(\d{2}) ([ap])/.exec(h); if (!m) return h;
    var n = Number(m[1]) % 12 + (m[3] === 'p' ? 12 : 0);
    return n + ' h' + (m[2] !== '00' ? ' ' + m[2] : '');
  }
  var AUJ = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });

  function style() {
    if (document.getElementById('aud-style')) return;
    var s = document.createElement('style'); s.id = 'aud-style';
    s.textContent = '.aud{margin:28px 0}.aud-boite{background:var(--card,#fff);color:var(--ink,#131313);border:3px solid var(--ink,#131313);box-shadow:5px 5px 0 var(--ink,#131313);padding:16px 18px}' +
      '.aud h2{margin:0 0 4px;font-family:Archivo,sans-serif;font-weight:900;text-transform:uppercase;font-size:clamp(18px,2.2vw,24px)}.aud-sous{margin:0 0 12px;font-size:14px;color:var(--muted,#5B6570)}' +
      '.aud-avis{border-top:2px solid var(--ink,#131313);padding:12px 0 4px}.aud-avis:first-of-type{border-top:0;padding-top:0}.aud-avis h3{margin:0 0 2px;font-size:17px;line-height:1.25}.aud-avis h3 a{color:inherit}' +
      '.aud-comite{font-size:13px;color:var(--muted,#5B6570);margin:0 0 6px}.aud-avis ul{margin:0 0 8px;padding-left:18px;font-size:15px;line-height:1.5}' +
      '.aud-liens{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:14px;font-weight:700}.aud-liens a{color:var(--ink,#131313)}.aud-liens .aud-go{background:#FFD24D;color:#131313;border:2px solid var(--ink,#131313);padding:2px 10px;text-decoration:none}' +
      '.aud-note{margin:10px 0 0;font-size:12px;color:var(--muted,#5B6570)}';
    document.head.appendChild(s);
  }

  // Ce qui reste à venir dans un avis ; null s'il n'y a plus rien.
  function avenir(a) {
    var aud = a.audiences.filter(function (x) { return x.date >= AUJ; });
    var ins = a.inscriptions.filter(function (x) { return x.date >= AUJ; });
    var mem = a.memoire && a.memoire.date >= AUJ ? a.memoire : null;
    return aud.length || ins.length || mem ? { aud: aud, ins: ins, mem: mem } : null;
  }

  function carte(a, r, lg, t, surFiche) {
    var lignes = [];
    if (r.aud.length) {
      var x = r.aud[0];
      lignes.push('<li><b>' + (a.audiences.length > 1 ? t.prochaines : t.prochaine) + '</b>' + (lg === 'fr' ? ' : ' : ': ') + echapper(date(x.date, lg)) + (x.lieu ? ', ' + echapper(x.lieu) : '') +
        (a.audiences.length > 1 ? ' (' + t.villes(a.audiences.length) + ')' : '') + '</li>');
    }
    if (r.ins.length) { var i = r.ins[0]; lignes.push('<li><b>' + t.inscrire + '</b> ' + echapper(date(i.date, lg)) + ', ' + echapper(heure(i.heure, lg)) + (i.pour ? ' (' + echapper(i.pour) + ')' : '') + '</li>'); }
    if (r.mem) lignes.push('<li><b>' + t.memoire + '</b> ' + echapper(date(r.mem.date, lg)) + ', ' + echapper(heure(r.mem.heure, lg)) + '</li>');
    var titre = a.bill && !surFiche ? '<a href="/bill/' + a.bill + '">' + echapper(a.titre) + '</a>' : echapper(a.titre);
    return '<div class="aud-avis"><h3>' + titre + '</h3><p class="aud-comite">' + echapper(a.comite) + '</p><ul>' + lignes.join('') + '</ul>' +
      '<div class="aud-liens"><a class="aud-go" href="' + echapper(a.inscription) + '" target="_blank" rel="noopener">' + t.postuler + '</a><a href="' + echapper(a.url) + '" target="_blank" rel="noopener">' + t.avis + '</a></div></div>';
  }

  var donnees = null;
  function rendre() {
    if (!donnees) return;
    var lg = langue(), t = T[lg];
    var surFiche = /^\/bill\/\d+/.test(location.pathname);
    var numero = surFiche ? parseInt(location.pathname.split('/')[2], 10) : null;
    var liste = donnees.items.filter(function (a) { return !surFiche || a.bill === numero; })
      .map(function (a) { return [a, avenir(a)]; }).filter(function (p) { return p[1]; });
    var zone = document.getElementById('audiences');
    if (!liste.length) { if (zone) zone.remove(); return; }
    if (!zone) {
      zone = document.createElement('section'); zone.id = 'audiences'; zone.className = 'aud';
      var ancre = surFiche ? document.querySelector('main h1') : document.querySelector('main section[data-vue="accueil"]');
      if (!ancre) return;
      ancre.insertAdjacentElement('afterend', zone);
    }
    style();
    zone.innerHTML = '<div class="aud-boite"><h2>' + (surFiche ? t.titreProjet : t.titre) + '</h2>' + (surFiche ? '' : '<p class="aud-sous">' + t.sous + '</p>') +
      liste.map(function (p) { return carte(p[0], p[1], lg, t, surFiche); }).join('') + '<p class="aud-note">' + t.source + '</p></div>';
  }

  function lancer() {
    var p = location.pathname.replace(/\/index(\.html)?$/, '/');
    if (p !== '/' && !/^\/bill\/\d+/.test(p)) return;
    fetch('/data/site/audiences.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { donnees = j; rendre(); }).catch(function () {});
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-action="langue"]')) setTimeout(rendre, 0); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lancer); else lancer();
})();
