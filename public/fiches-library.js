/* WordSip — bibliothèque des fiches de cours : tuiles, barre latérale, recherche, tri A → Z et index alphabétique.
   Les fonctions « pures » (tri, lettres, filtres, regroupements) n'utilisent pas le DOM : elles sont testées sous Node. */
(function (root) {
  'use strict';

  /* ---------- Fonctions pures ---------- */
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const stripTags = s => String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Les articles en tête de titre (« Los artículos », « La voix passive », « The ... ») ne comptent pas dans le classement.
  const LEAD = /^(?:l['’]|(?:le|la|les|un|une|des|el|los|las|lo|il|gli|una|uno|the|an?)\s+)(?=\p{L})/iu;
  function sortKey(title) {
    let t = String(title == null ? '' : title).trim().replace(/^[^\p{L}\p{N}]+/u, '');
    const m = t.match(LEAD);
    if (m && t.length > m[0].length + 1) t = t.slice(m[0].length);
    return norm(t).replace(/^[^a-z0-9]+/, '');
  }
  const letterOf = title => { const c = sortKey(title).charAt(0); return /[a-z]/.test(c) ? c.toUpperCase() : '#'; };
  const compare = (a, b) => sortKey(a).localeCompare(sortKey(b), 'fr', { numeric: true, sensitivity: 'base' });

  const ICONS = [
    [/couleur|colou?r|colore/, '🎨'], [/heure|hora\b|ora\b|clock/, '🕒'], [/lieux|lugar|luogo|place/, '🏙️'], [/position/, '📍'],
    [/vetement|clothes|ropa|vestiti/, '👕'], [/cuisine|cocina|cucina|kitchen/, '🍳'], [/number|nombre|numero|numeri|numeros/, '🔢'],
    [/continuous|progressi/, '🔄'], [/present perfect|perfect/, '🔗'], [/past|preterit|indefinido/, '⏪'], [/future|futuro|going to/, '🔮'],
    [/present|presente/, '⏱️'], [/modal|modale|poder, deber/, '🧭'], [/passiv|pasiva/, '↩️'], [/plural/, '➕'], [/possess|posesiv|possessif/, '👤'],
    [/mouvement|movement|movimiento|movimento/, '🚶'], [/temps|time|tiempo|tempo|\bat, in, on/, '⏳'], [/in \/ on \/ at/, '📌'], [/relati/, '🔗'],
    [/por y para/, '🔀'], [/article|articul|articol/, '🅰️'], [/preposition|prepos/, '📌']
  ];
  function iconFor(lesson) {
    const hay = norm(`${lesson.id || ''} ${lesson.title || ''}`);
    for (const [re, icon] of ICONS) if (re.test(hay)) return icon;
    return lesson.type === 'vocabulary' ? '🔤' : lesson.type === 'rule' ? '📘' : lesson.type === 'reference' ? '📋' : '⏳';
  }
  const SUB_TONES = { bases: 'teal', 'corps-sante': 'pink', 'maison-quotidien': 'orange', 'monde-autour': 'blue', 'vie-sociale': 'purple' };
  function toneFor(lesson) {
    if ((lesson.category || 'grammaire') === 'vocabulaire') return SUB_TONES[lesson.subcategory || 'bases'] || 'teal';
    return lesson.type === 'rule' ? 'indigo' : lesson.type === 'reference' ? 'lime' : 'purple';
  }
  const typeLabel = lesson => lesson.type === 'vocabulary' ? 'Vocabulaire' : lesson.type === 'rule' ? 'Règle' : lesson.type === 'reference' ? 'Référence' : 'Temps';

  /* Transforme les fiches en éléments affichables (et interrogeables). */
  function buildItems(lessons, previewOf) {
    return (lessons || []).map((lesson, index) => {
      const title = String(lesson.title || ''), cut = title.indexOf(' — ');
      const main = cut > 0 ? title.slice(0, cut) : title, sub = cut > 0 ? title.slice(cut + 3) : '';
      const preview = stripTags(previewOf ? previewOf(lesson) : lesson.objective || '');
      const words = (lesson.vocabulary || []).map(v => `${v.term || ''} ${v.translation || ''}`).join(' ');
      return {
        lesson, index, main, sub, key: sortKey(title), letter: letterOf(title), cat: lesson.category || 'grammaire',
        sort: lesson.subcategory || 'bases', order: lesson.learningOrder || 0, icon: iconFor(lesson), tone: toneFor(lesson), type: typeLabel(lesson),
        blurb: stripTags(lesson.subtitle || sub || preview).slice(0, 110),
        text: norm(`${title} ${lesson.subtitle || ''} ${preview} ${words}`)
      };
    });
  }
  /* Filtre : texte (tous les mots saisis doivent apparaître) et catégorie (all, path, vocabulaire, grammaire). */
  function filterItems(items, q, filter) {
    const terms = norm(q).split(/\s+/).filter(Boolean);
    return items.filter(it => {
      if (filter === 'path' && !it.order) return false;
      if ((filter === 'vocabulaire' || filter === 'grammaire') && it.cat !== filter) return false;
      return terms.every(t => it.text.includes(t));
    });
  }
  /* Note de recherche : le mot trouvé dans la fiche, pour comprendre pourquoi elle apparaît. */
  function matchNote(item, q) {
    const terms = norm(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return '';
    if (terms.every(t => norm(item.lesson.title).includes(t))) return '';
    const hit = (item.lesson.vocabulary || []).find(v => terms.every(t => norm(`${v.term} ${v.translation}`).includes(t)));
    return hit ? `Contient « ${hit.term} » = ${hit.translation}` : '';
  }
  const PATH_LABELS = [['path', '🌱 Parcours du quotidien'], ['vocabulaire', '🔤 Vocabulaire'], ['grammaire', '📚 Grammaire']];
  /* Regroupement : par lettre (az / za) ou par catégorie (parcours). */
  function group(items, sort) {
    if (sort === 'path') {
      const bucket = it => it.order ? 'path' : it.cat;
      return PATH_LABELS.map(([key, label]) => ({
        key, label,
        items: items.filter(it => bucket(it) === key).sort((a, b) => key === 'path' ? a.order - b.order : compare(a.lesson.title, b.lesson.title))
      })).filter(g => g.items.length);
    }
    const sorted = items.slice().sort((a, b) => compare(a.lesson.title, b.lesson.title));
    if (sort === 'za') sorted.reverse();
    const map = new Map();
    for (const it of sorted) { if (!map.has(it.letter)) map.set(it.letter, []); map.get(it.letter).push(it); }
    let letters = [...map.keys()].sort();
    if (letters.includes('#')) letters = [...letters.filter(l => l !== '#'), '#'];
    if (sort === 'za') letters = letters.slice().reverse().filter(l => l !== '#').concat(letters.includes('#') ? ['#'] : []);
    return letters.map(l => ({ key: l, label: l, items: map.get(l) }));
  }

  /* ---------- Interface ---------- */
  const reduce = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let S = null; // état courant

  function seenSet() { try { return new Set(JSON.parse(root.localStorage.getItem('wordsip-fiches-seen-' + S.language) || '[]')); } catch (e) { return new Set(); } }
  function markSeen(id) {
    try { const set = seenSet(); set.add(id); root.localStorage.setItem('wordsip-fiches-seen-' + S.language, JSON.stringify([...set])); } catch (e) { /* ignoré */ }
  }

  function tileHtml(it, seen, q) {
    const note = matchNote(it, q), step = it.order ? `<b class="lib-step">étape ${it.order}/6</b>` : '', done = seen.has(it.lesson.id) ? '<b class="lib-seen">✓ vue</b>' : '';
    return `<button type="button" class="lib-tile tone-${it.tone}" data-index="${it.index}"><span class="lib-ico" aria-hidden="true">${it.icon}</span><strong>${esc(it.main)}</strong>${it.blurb ? `<small>${esc(it.blurb)}</small>` : ''}${note ? `<span class="lib-note">${esc(note)}</span>` : ''}<em class="lib-meta"><b class="lib-type">${it.type}</b>${step}${done}</em></button>`;
  }
  function renderCounts() {
    const base = filterItems(S.items, S.q, 'all'), count = f => filterItems(S.items, S.q, f).length;
    const defs = [['all', 'Toutes', base.length], ['path', '🌱 Parcours', count('path')], ['vocabulaire', '🔤 Vocabulaire', count('vocabulaire')], ['grammaire', '📚 Grammaire', count('grammaire')]];
    S.el.filters.innerHTML = defs.map(([k, label, n]) => `<button type="button" class="lib-pill" data-filter="${k}" aria-pressed="${S.filter === k}">${label} <b>${n}</b></button>`).join('');
    S.el.sort.querySelectorAll('[data-sort]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sort === S.sort)));
  }
  function renderRail(groups) {
    if (S.sort === 'path') return '';
    const have = new Set(groups.map(g => g.key)), letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    if (have.has('#')) letters.push('#');
    const order = S.sort === 'za' ? letters.slice(0, 26).reverse().concat(have.has('#') ? ['#'] : []) : letters;
    return `<nav class="lib-rail" aria-label="Index alphabétique">${order.map(l => have.has(l) ? `<button type="button" class="lib-letter-btn" data-letter="${l}" aria-label="Aller à la lettre ${l}">${l}</button>` : `<span class="lib-letter-off" aria-hidden="true">${l}</span>`).join('')}</nav>`;
  }
  function renderMain() {
    const items = filterItems(S.items, S.q, S.filter), groups = group(items, S.sort), seen = seenSet();
    if (!items.length) {
      S.el.menu.innerHTML = `<div class="lib-empty"><p>🔎 Aucune fiche ne correspond à « ${esc(S.q)} ».</p><button type="button" class="lib-reset">Effacer la recherche</button></div>`;
      S.el.menu.querySelector('.lib-reset').onclick = () => { S.q = ''; S.filter = 'all'; S.el.q.value = ''; refresh(); S.el.q.focus(); };
      return;
    }
    const letterMode = S.sort !== 'path';
    S.el.menu.innerHTML = `<div class="lib-head"><h2>Fiches de cours</h2><p>${S.languageLabel ? esc(S.languageLabel) + ' · ' : ''}${items.length} fiche${items.length > 1 ? 's' : ''}${S.q ? ' pour « ' + esc(S.q) + ' »' : ''}</p></div>
      <div class="lib-board"><div class="lib-groups">${groups.map(g => `<section class="lib-group${letterMode ? '' : ' lib-group-path'}"><h3 class="lib-letter" id="lib-g-${esc(g.key)}" data-key="${esc(g.key)}">${letterMode ? `<span>${esc(g.label)}</span>` : esc(g.label)}<small>${g.items.length}</small></h3><div class="lib-grid">${g.items.map(it => tileHtml(it, seen, S.q)).join('')}</div></section>`).join('')}</div>${renderRail(groups)}</div>`;
    S.el.menu.querySelectorAll('.lib-tile').forEach(b => { b.onclick = () => open(Number(b.dataset.index)); });
    S.el.menu.querySelectorAll('.lib-letter-btn').forEach(b => { b.onclick = () => jump(b.dataset.letter); });
    spy();
  }
  function renderList() {
    const items = filterItems(S.items, S.q, S.filter), groups = group(items, S.sort), letterMode = S.sort !== 'path';
    S.el.list.innerHTML = groups.map(g => `<p class="lib-row-head">${esc(g.label)}</p>${g.items.map(it => `<button type="button" class="lib-row" data-index="${it.index}"${S.active === it.index ? ' aria-current="true"' : ''}><i aria-hidden="true">${it.icon}</i><span>${esc(it.main)}</span></button>`).join('')}`).join('') || '<p class="lib-row-head">Aucun résultat</p>';
    void letterMode;
    S.el.list.querySelectorAll('.lib-row').forEach(b => { b.onclick = () => open(Number(b.dataset.index)); });
  }
  function jump(letter) {
    const target = S.el.menu.querySelector(`[data-key="${letter}"]`);
    if (target) target.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
  }
  /* Lettre courante de l'index : la dernière dont le titre a atteint le haut de l'écran. */
  function markCurrent() {
    if (!S || S.sort === 'path') return;
    const heads = [...S.el.menu.querySelectorAll('.lib-letter')];
    if (!heads.length) return;
    let cur = heads[0];
    for (const h of heads) { if (h.getBoundingClientRect().top <= 150) cur = h; else break; }
    const key = cur.dataset.key;
    S.el.menu.querySelectorAll('.lib-letter-btn').forEach(b => b.classList.toggle('current', b.dataset.letter === key));
  }
  function spy() {
    if (!S.scrollBound) {
      let queued = false;
      root.addEventListener('scroll', () => { if (queued) return; queued = true; root.requestAnimationFrame(() => { queued = false; markCurrent(); }); }, { passive: true });
      S.scrollBound = true;
    }
    markCurrent();
  }
  function refresh() { renderCounts(); renderMain(); renderList(); const n = filterItems(S.items, S.q, S.filter).length; S.el.count.textContent = `${n} fiche${n > 1 ? 's' : ''} affichée${n > 1 ? 's' : ''}`; }
  function open(index) { if (S.onOpen) S.onOpen(index); }
  function setActive(index) {
    S.active = index == null ? null : index;
    if (index != null) markSeen(S.items[index].lesson.id);
    renderList();
    const cur = S.el.list.querySelector('[aria-current]'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    if (index == null) renderMain();
  }

  function mount(opts) {
    const side = document.getElementById('lib-side'), menu = document.getElementById('lessons-menu');
    S = { items: buildItems(opts.lessons, opts.preview), language: opts.language || 'en', languageLabel: opts.languageLabel || '', onOpen: opts.onOpen, q: '', filter: 'all', sort: 'az', active: null, scrollBound: false, el: {} };
    side.innerHTML = `<div class="lib-side-inner"><label class="lib-search"><span class="lib-sr">Rechercher une fiche ou un mot</span><input id="lib-q" type="search" placeholder="🔍 Fiche ou mot…" autocomplete="off" spellcheck="false"></label><div class="lib-filters" id="lib-filters" role="group" aria-label="Filtrer par catégorie"></div><div class="lib-sort" id="lib-sort" role="group" aria-label="Ordre d’affichage"><button type="button" data-sort="az">A → Z</button><button type="button" data-sort="za">Z → A</button><button type="button" data-sort="path">Parcours</button></div><p class="lib-count" id="lib-count" aria-live="polite"></p><nav class="lib-list" id="lib-list" aria-label="Toutes les fiches"></nav></div>`;
    S.el = { menu, q: side.querySelector('#lib-q'), filters: side.querySelector('#lib-filters'), sort: side.querySelector('#lib-sort'), count: side.querySelector('#lib-count'), list: side.querySelector('#lib-list') };
    S.el.q.addEventListener('input', () => { S.q = S.el.q.value; refresh(); });
    S.el.q.addEventListener('keydown', e => { if (e.key === 'Escape' && S.q) { S.q = ''; S.el.q.value = ''; refresh(); } });
    S.el.filters.addEventListener('click', e => { const b = e.target.closest('[data-filter]'); if (b) { S.filter = b.dataset.filter; refresh(); } });
    S.el.sort.addEventListener('click', e => { const b = e.target.closest('[data-sort]'); if (b) { S.sort = b.dataset.sort; refresh(); } });
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) && document.getElementById('lib-q')) { e.preventDefault(); S.el.q.focus(); }
    });
    refresh();
  }

  const api = { norm, sortKey, letterOf, compare, iconFor, toneFor, buildItems, filterItems, matchNote, group, mount, setActive, showList() { if (S) setActive(null); } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.WordSipLibrary = api;
})(typeof window !== 'undefined' ? window : globalThis);
