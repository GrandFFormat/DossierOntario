/* Les séances de la Chambre résumées (16 nov. 2026), copie de la fenêtre de DossierBC
   (carteChambre et ouvrirSeance dans dossierBC/commun/dq.js). Les données viennent de
   /data/site/hansard-resumes.json (scrapers/hansard-resumes.js, chaque jour). Accueil seulement :
   les 3 dernières journées, 2 puces visibles, le « + » jaune ouvre le reste et « Qui a parlé ».
   Rien de résumé : rien d'affiché. La langue suit le bouton EN/FR sans recharger. */
(function () {
  'use strict';
  var T = {
    en: { titre: 'Latest at the Legislature', sous: 'What happened in the House, sitting by sitting.', etiquette: 'House sitting', qui: 'Who spoke', ouvrir: 'Read the whole sitting', note: 'Summary written by DossierOntario from the official Hansard', transcription: 'Transcript ↗', loc: 'en-CA' },
    fr: { titre: 'Dernières activités à l’Assemblée', sous: 'Ce qui s’est passé en Chambre, séance par séance.', etiquette: 'Séance de la Chambre', qui: 'Qui a parlé', ouvrir: 'Lire toute la séance', note: 'Résumé écrit par DossierOntario à partir du Hansard officiel (en anglais)', transcription: 'Transcription ↗', loc: 'fr-CA' }
  };
  function langue() { try { return localStorage.getItem('dossier:langue') === 'fr' ? 'fr' : 'en'; } catch (e) { return 'en'; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function style() {
    if (document.getElementById('sea-style')) return;
    var s = document.createElement('style'); s.id = 'sea-style';
    s.textContent = '.sea{margin:28px 0}.sea-boite{background:var(--card,#fff);color:var(--ink,#131313);border:3px solid var(--ink,#131313);box-shadow:5px 5px 0 var(--ink,#131313);padding:16px 18px}' +
      '.sea h2{margin:0 0 4px;font-family:Archivo,sans-serif;font-weight:900;text-transform:uppercase;font-size:clamp(18px,2.2vw,24px)}.sea-sous{margin:0 0 14px;font-size:14px;color:var(--muted,#5B6570)}' +
      '.sea-grille{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:2px solid var(--ink,#131313)}.sea-carte{display:flex;flex-direction:column;padding:14px 16px 12px;border-left:1px solid var(--line,#ddd);border-top:4px solid transparent}.sea-carte:first-child{border-left:0}.sea-carte:nth-child(2){border-top-color:#FFD24D}' +
      '.sea-jour{font-family:Archivo,sans-serif;font-weight:800;font-size:19px;margin:0 0 8px}.sea-jour::first-letter{text-transform:uppercase}.sea-etiquette{align-self:flex-start;background:#FFD24D;color:#131313;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 8px;margin:0 0 10px}' +
      '.sea-puces{margin:0 0 10px;padding-left:18px;font-size:14.5px;line-height:1.5}.sea-puces li{margin:0 0 6px}.sea-cache,.sea-cache-bloc{display:none}.sea-ouverte .sea-cache{display:list-item}.sea-ouverte .sea-cache-bloc{display:block}' +
      '.sea-qui{font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin:6px 0 6px}.sea-joueurs{list-style:none;margin:0 0 10px;padding:0;font-size:13.5px;line-height:1.45}.sea-joueurs li{margin:0 0 5px}.sea-joueurs span{color:var(--muted,#5B6570)}' +
      '.sea-plus{align-self:center;margin-top:auto;width:34px;height:34px;border:0;background:#FFD24D;color:#131313;font-size:22px;font-weight:900;line-height:1;cursor:pointer}.sea-note{margin:10px 0 0;font-size:12px;color:var(--muted,#5B6570)}.sea-note a{color:inherit;font-weight:700}' +
      '@media(max-width:900px){.sea-grille{grid-template-columns:1fr}.sea-carte{border-left:0;border-bottom:1px solid var(--line,#ddd)}}';
    document.head.appendChild(s);
  }

  function carte(m, lg, t) {
    var jour = new Date(m.jour + 'T12:00:00').toLocaleDateString(t.loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    var puces = m[lg] || [], j = m.joueurs || [];
    var joueur = function (p) { return '<li><b>' + esc(p.nom) + '</b> <span>' + esc(p.role) + '</span> — ' + esc(lg === 'en' ? p.sujet : p.sujetFr) + '</li>'; };
    var reste = puces.length > 2 || j.length > 0;
    return '<div class="sea-carte"><p class="sea-jour">' + esc(jour) + '</p><span class="sea-etiquette">' + t.etiquette + '</span>' +
      '<ul class="sea-puces">' + puces.slice(0, 2).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') +
      puces.slice(2).map(function (p) { return '<li class="sea-cache">' + esc(p) + '</li>'; }).join('') + '</ul>' +
      (j.length ? '<div class="sea-qui sea-cache-bloc">' + t.qui + '</div><ul class="sea-joueurs sea-cache-bloc">' + j.map(joueur).join('') + '</ul>' : '') +
      (reste ? '<button type="button" class="sea-plus" aria-expanded="false" aria-label="' + t.ouvrir + '">+</button>' : '') +
      '<p class="sea-note">' + t.note + ' · <a href="' + esc(m.lien) + '" target="_blank" rel="noopener">' + t.transcription + '</a></p></div>';
  }

  // Comme ouvrirSeance() de DossierBC : la carte glisse en s'ouvrant ; en se refermant, on remonte
  // en haut de la fenêtre.
  function ouvrir(btn) {
    var c = btn.closest('.sea-carte'), avant = c.offsetHeight;
    var ouvert = c.classList.toggle('sea-ouverte'), apres = c.offsetHeight;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && c.animate) {
      c.style.overflow = 'hidden';
      c.animate([{ height: avant + 'px' }, { height: apres + 'px' }], { duration: ouvert ? 450 : 650, easing: 'cubic-bezier(.22,.61,.36,1)' })
        .finished.then(function () { c.style.overflow = ''; }, function () { c.style.overflow = ''; });
    }
    btn.textContent = ouvert ? '−' : '+';
    btn.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    if (!ouvert) {
      var haut = document.getElementById('seances') || c;
      window.scrollTo({ top: haut.getBoundingClientRect().top + window.scrollY - 70, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }

  var donnees = null;
  function rendre() {
    if (!donnees) return;
    var lg = langue(), t = T[lg];
    var liste = Object.keys(donnees.seances || {}).map(function (k) { return donnees.seances[k]; })
      .filter(function (m) { return m.en && m.fr; })
      .sort(function (a, b) { return b.jour.localeCompare(a.jour); }).slice(0, 3);
    var zone = document.getElementById('seances');
    if (!liste.length) { if (zone) zone.remove(); return; }
    if (!zone) {
      var ancre = document.getElementById('audiences') || document.querySelector('main section[data-vue="accueil"]');
      if (!ancre) return;
      zone = document.createElement('section'); zone.id = 'seances'; zone.className = 'sea';
      ancre.insertAdjacentElement('afterend', zone);
    }
    style();
    zone.innerHTML = '<div class="sea-boite"><h2>' + t.titre + '</h2><p class="sea-sous">' + t.sous + '</p><div class="sea-grille">' +
      liste.map(function (m) { return carte(m, lg, t); }).join('') + '</div></div>';
  }

  function lancer() {
    var p = location.pathname.replace(/\/index(\.html)?$/, '/');
    if (p !== '/') return;
    fetch('/data/site/hansard-resumes.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { donnees = j; rendre(); setTimeout(rendre, 1500); }).catch(function () {});
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.sea-plus');
      if (b) { ouvrir(b); return; }
      if (e.target.closest && e.target.closest('[data-action="langue"]')) setTimeout(rendre, 0);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lancer); else lancer();
})();
