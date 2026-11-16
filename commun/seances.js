/* Les séances de la Chambre résumées (16 nov. 2026), copie à l'identique de la fenêtre de
   DossierBC (#band-comites, carteChambre, ouvrirSeance et renderComites dans dossierBC/commun/dq.js,
   styles .bc-signales / .com-* de dossierBC/commun/bc.css). Seules les couleurs sont celles de
   l'Ontario. Les données viennent de /data/site/hansard-resumes.json (scrapers/hansard-resumes.js).
   Accueil seulement : une colonne d'intro, puis les 3 dernières journées, 2 puces visibles, le « + »
   jaune ouvre le reste et « Qui a parlé ». Rien de résumé : rien d'affiché. */
(function () {
  'use strict';
  var T = {
    en: { kicker: 'At the Legislature', semaine: 'This week at the Legislature', dernieres: 'Latest at the Legislature', sub: 'House sittings, summarized from the official Hansard.', avis: 'Nothing at the Legislature this week. Here are the latest sittings.', vie: 'The life of a bill →', etiquette: 'House sitting', qui: 'Who spoke', ouvrir: 'Read the whole sitting', note: 'Summary written by DossierOntario from the official Hansard', transcription: 'Transcript ↗', loc: 'en-CA' },
    fr: { kicker: 'À l’Assemblée', semaine: 'Cette semaine à l’Assemblée', dernieres: 'Dernières activités à l’Assemblée', sub: 'Les séances de la Chambre, résumées à partir du Hansard officiel.', avis: 'Rien à l’Assemblée cette semaine. Voici les dernières séances.', vie: 'La vie d’un projet de loi →', etiquette: 'Séance de la Chambre', qui: 'Qui a parlé', ouvrir: 'Lire toute la séance', note: 'Résumé écrit par DossierOntario à partir du Hansard officiel (en anglais)', transcription: 'Transcription ↗', loc: 'fr-CA' }
  };
  function langue() { try { return localStorage.getItem('dossier:langue') === 'fr' ? 'fr' : 'en'; } catch (e) { return 'en'; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function style() {
    if (document.getElementById('sea-style')) return;
    var s = document.createElement('style'); s.id = 'sea-style';
    s.textContent =
      '.sea{margin:28px 0}' +
      '.sea-cadre{display:grid;grid-template-columns:repeat(4,1fr);background:var(--card,#fff);color:var(--ink,#131313);border:1px solid var(--ink,#131313)}' +
      '.sea-intro{padding:24px 28px;display:flex;flex-direction:column;gap:10px;border-right:1px solid var(--line-soft,#ddd)}' +
      '.sea-kicker{font:700 12px/1 Archivo,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--slate,#555)}' +
      '.sea-intro h2{font:900 28px/1 Archivo,sans-serif;text-transform:uppercase;margin:0}' +
      '.sea-sub{font-size:12px;color:var(--slate,#555);margin:6px 0 0;line-height:1.5}' +
      '.sea-avis{font-size:13px;color:var(--slate,#555);line-height:1.55;margin:0;flex:1}' +
      '.sea-vie{margin:0}.sea-vie a{color:var(--ink,#131313);font-weight:600}' +
      '.sea-liste{grid-column:span 3;display:grid;grid-template-columns:repeat(3,1fr);min-width:0}' +
      '@media(min-width:1001px){.sea-liste{min-height:470px}}' +
      '.sea-carte{position:relative;padding:24px 28px;display:flex;flex-direction:column;gap:8px;border-left:1px solid var(--line-soft,#ddd)}.sea-carte:first-child{border-left:0}' +
      '.sea-carte.sea-jaune::before{content:"";position:absolute;left:0;right:0;top:0;height:6px;background:#FFD24D}' +
      '.sea-jour{font:800 19px/1.1 Archivo,sans-serif;margin:0}' +
      '.sea-etiquette{align-self:flex-start;font:700 11px/1 Archivo,sans-serif;letter-spacing:.06em;text-transform:uppercase;background:#FFD24D;color:#131313;padding:4px 7px}' +
      '.sea-puces{margin:2px 0 0;padding-left:18px;font-size:12.5px;line-height:1.45}.sea-puces li{margin:0 0 4px}' +
      '.sea-cache,.sea-cache-bloc{display:none}.sea-ouverte .sea-cache{display:list-item}.sea-ouverte .sea-cache-bloc{display:block}' +
      '.sea-qui{font:700 11px/1 Archivo,sans-serif;letter-spacing:.06em;text-transform:uppercase;margin-top:4px}' +
      '.sea-joueurs{margin:0;padding:0;list-style:none;font-size:12.5px;line-height:1.45}.sea-joueurs li{margin:0 0 4px}.sea-joueurs span{color:var(--slate,#555)}' +
      '.sea-plus{align-self:center;margin-top:auto;width:34px;height:34px;border-radius:50%;border:0;background:#FFD24D;color:#131313;font:700 22px/1 Archivo,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.sea-plus:hover{filter:brightness(1.05);transform:scale(1.06)}' +
      '.sea-note{font-size:11px;line-height:1.4;color:var(--slate,#555)}.sea-note a{color:inherit;font-weight:600}' +
      '.sea-carte.sea-revenue{animation:seaRevenue 1.6s ease-out}@keyframes seaRevenue{0%,35%{background:rgba(255,210,77,.35)}100%{background:transparent}}' +
      '@media(prefers-reduced-motion:reduce){.sea-carte.sea-revenue{animation:none}}' +
      '@media(max-width:1000px){.sea-cadre{grid-template-columns:1fr}.sea-intro{border-right:0;border-bottom:1px solid var(--line-soft,#ddd)}.sea-liste{grid-column:auto;grid-template-columns:1fr}.sea-carte{border-left:0;border-top:1px solid var(--line-soft,#ddd)}}';
    document.head.appendChild(s);
  }

  function carte(m, lg, t, jaune) {
    var jour = new Date(m.jour + 'T12:00:00').toLocaleDateString(t.loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    var puces = m[lg] || [], j = m.joueurs || [];
    var joueur = function (p) { return '<li><b>' + esc(p.nom) + '</b> <span>' + esc(p.role) + '</span> — ' + esc(lg === 'en' ? p.sujet : p.sujetFr) + '</li>'; };
    var reste = puces.length > 2 || j.length > 0;
    return '<div class="sea-carte' + (jaune ? ' sea-jaune' : '') + '"><p class="sea-jour">' + esc(jour) + '</p><span class="sea-etiquette">' + t.etiquette + '</span>' +
      '<ul class="sea-puces">' + puces.slice(0, 2).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') +
      puces.slice(2).map(function (p) { return '<li class="sea-cache">' + esc(p) + '</li>'; }).join('') + '</ul>' +
      (j.length ? '<div class="sea-qui sea-cache-bloc">' + t.qui + '</div><ul class="sea-joueurs sea-cache-bloc">' + j.map(joueur).join('') + '</ul>' : '') +
      (reste ? '<button type="button" class="sea-plus" aria-expanded="false" aria-label="' + t.ouvrir + '">+</button>' : '') +
      '<span class="sea-note">' + t.note + ' · <a href="' + esc(m.lien) + '" target="_blank" rel="noopener">' + t.transcription + '</a></span></div>';
  }

  // Comme ouvrirSeance() de DossierBC.
  function ouvrir(btn) {
    var c = btn.closest('.sea-carte'), avant = c.offsetHeight;
    var ouvert = c.classList.toggle('sea-ouverte'), apres = c.offsetHeight;
    var reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduit && c.animate) {
      c.style.overflow = 'hidden';
      c.animate([{ height: avant + 'px' }, { height: apres + 'px' }], { duration: ouvert ? 450 : 650, easing: 'cubic-bezier(.22,.61,.36,1)' })
        .finished.then(function () { c.style.overflow = ''; }, function () { c.style.overflow = ''; });
    }
    btn.textContent = ouvert ? '−' : '+';
    btn.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    if (!ouvert) {
      var haut = document.getElementById('seances') || c;
      window.scrollTo({ top: haut.getBoundingClientRect().top + window.scrollY - 70, behavior: reduit ? 'auto' : 'smooth' });
      c.classList.remove('sea-revenue'); void c.offsetWidth; c.classList.add('sea-revenue');
    }
  }

  // Lundi de la semaine en cours, à Toronto (comme lundiDe() de DossierBC, à Victoria).
  function lundi() {
    var auj = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
    var d = new Date(auj + 'T12:00:00Z'), k = (d.getUTCDay() + 6) % 7;
    return new Date(d.getTime() - k * 864e5).toISOString().slice(0, 10);
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
    var semaine = liste[0].jour >= lundi();
    zone.innerHTML = '<div class="sea-cadre"><div class="sea-intro">' +
      '<div class="sea-kicker">' + t.kicker + ' · ' + liste.length + '</div>' +
      '<div><h2>' + (semaine ? t.semaine : t.dernieres) + '</h2><p class="sea-sub">' + t.sub + '</p></div>' +
      '<p class="sea-avis">' + (semaine ? '' : t.avis) + '</p>' +
      '<p class="sea-vie"><a href="/glossary">' + t.vie + '</a></p></div>' +
      '<div class="sea-liste">' + liste.map(function (m, i) { return carte(m, lg, t, i % 2 === 1); }).join('') + '</div></div>';
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
