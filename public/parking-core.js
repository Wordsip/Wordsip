/* WordSip — moteur du « Parking des mots » (puzzle de voitures à faire glisser).
   Logique pure, sans DOM : testable sous Node.
   Une voiture : { id, h (true = horizontale), len (2 ou 3), lane (ligne ou colonne fixe), p (position le long de sa voie), face }.
   Une voiture ne glisse que le long de sa voie. Elle peut quitter le plateau si sa voie est libre jusqu'au bord. */
(function (root) {
  'use strict';

  function metaOf(cars) { return cars.map(c => ({ id: c.id, h: c.h, len: c.len, lane: c.lane, fixed: !!c.fixed, key: c.key })); }

  /* Bornes de position (incluses) de la voiture i : lo..hi.
     lo = -len ou hi = n signifie que la voie est libre jusqu'au bord (sortie possible). */
  function rangeOf(i, pos, meta, n) {
    const c = meta[i], p = pos[i];
    if (c.fixed) return { lo: p, hi: p };
    let lo = -c.len, hi = n;
    for (let j = 0; j < meta.length; j++) {
      if (j === i) continue;
      const o = meta[j], q = pos[j];
      let a, b;
      if (o.h === c.h) {
        if (o.lane !== c.lane) continue;
        a = q; b = q + o.len;
      } else {
        if (!(q <= c.lane && c.lane < q + o.len)) continue;
        a = o.lane; b = o.lane + 1;
      }
      if (b <= p) lo = Math.max(lo, b);
      else if (a >= p + c.len) hi = Math.min(hi, a - c.len);
      else return { lo: p, hi: p };
    }
    return { lo, hi };
  }
  function range(car, cars, n) {
    const i = cars.findIndex(c => c.id === car.id);
    return rangeOf(i, cars.map(c => c.p), metaOf(cars), n);
  }

  /* Recherche en largeur : nombre minimal de coups (un coup = une voiture glissée sur n'importe quelle distance,
     la sortie compte pour un coup) pour faire sortir la voiture cible. Retourne { par, path } ou null. */
  function bfs(cars, n, targetId, cap) {
    const meta = metaOf(cars), tIdx = (Array.isArray(targetId) ? targetId : [targetId]).map(id => meta.findIndex(c => c.id === id)).filter(i => i >= 0 && !meta[i].fixed);
    if (!tIdx.length) return null;
    const start = cars.map(c => c.p), seen = new Map(), key = pos => pos.join(',');
    seen.set(key(start), null);
    let frontier = [start], moves = 0;
    const route = k => {
      const path = [];
      for (let cur = seen.get(k); cur; cur = seen.get(cur.from)) path.unshift(cur.move);
      return path;
    };
    while (frontier.length) {
      const next = [];
      for (const pos of frontier) {
        for (const t of tIdx) {
          const r = rangeOf(t, pos, meta, n);
          if (r.lo <= -meta[t].len || r.hi >= n) {
            const path = route(key(pos));
            path.push({ id: meta[t].id, exit: true, dir: r.lo <= -meta[t].len ? -1 : 1 });
            return { par: moves + 1, path };
          }
        }
        for (let i = 0; i < meta.length; i++) {
          const rg = rangeOf(i, pos, meta, n), from = Math.max(rg.lo, 0), to = Math.min(rg.hi, n - meta[i].len);
          for (let q = from; q <= to; q++) {
            if (q === pos[i]) continue;
            const np = pos.slice(); np[i] = q;
            const k = key(np);
            if (seen.has(k)) continue;
            seen.set(k, { from: key(pos), move: { id: meta[i].id, to: q } });
            next.push(np);
          }
        }
      }
      if (seen.size > cap) return null;
      frontier = next; moves++;
    }
    return null;
  }
  const solve = (cars, n, targetId, cap) => { const r = bfs(cars, n, targetId, cap || 20000); return r ? r.par : -1; };
  const hint = (cars, n, targetId) => { const r = bfs(cars, n, targetId, 30000); return r ? r.path[0] : null; };

  function shuffle(list, rng) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function placeCars(n, count, rng, obstacles) {
    const cars = [], occ = Array.from({ length: n }, () => Array(n).fill(false));
    for (let id = 0; id < count; id++) {
      let placed = false;
      for (let t = 0; t < 150 && !placed; t++) {
        const h = rng() < 0.5, len = rng() < 0.68 ? 2 : 3, lane = Math.floor(rng() * n), p = Math.floor(rng() * (n - len + 1));
        const cells = Array.from({ length: len }, (_, k) => h ? [p + k, lane] : [lane, p + k]);
        if (cells.every(([x, y]) => !occ[y][x])) {
          cells.forEach(([x, y]) => { occ[y][x] = true; });
          cars.push({ id, h, len, lane, p, face: rng() < 0.5 ? 1 : -1 });
          placed = true;
        }
      }
      if (!placed) return null;
    }
    // Obstacles fixes (plots, barrières) : immobiles, ils bloquent les voies.
    for (let k = 0; k < (obstacles || 0); k++) {
      const id = count + k;
      let placed = false;
      for (let tr = 0; tr < 150 && !placed; tr++) {
        const h = rng() < 0.5, len = rng() < 0.5 ? 1 : 2, lane = Math.floor(rng() * n), p = Math.floor(rng() * (n - len + 1));
        const cells = Array.from({ length: len }, (_, q) => h ? [p + q, lane] : [lane, p + q]);
        if (cells.every(([x, y]) => !occ[y][x])) {
          cells.forEach(([x, y]) => { occ[y][x] = true; });
          cars.push({ id, h, len, lane, p, face: 1, fixed: true });
          placed = true;
        }
      }
      if (!placed) return null;
    }
    return cars;
  }

  /* Choisit une voiture à faire sortir dont la résolution demande entre minPar et maxPar coups
     (à défaut, la plus difficile qui reste soluble). Retourne { id, par } ou null. */
  function pickMission(cars, n, opts) {
    const o = opts || {}, rng = o.rng || Math.random, minPar = o.minPar || 1, maxPar = o.maxPar || 8;
    let fallback = null;
    for (const c of shuffle(cars, rng)) {
      const par = solve(cars, n, c.id, o.cap || 20000);
      if (par < 1 || par > maxPar) continue;
      if (par >= minPar) return { id: c.id, par };
      if (!fallback || par > fallback.par) fallback = { id: c.id, par };
    }
    return fallback;
  }

  /* Génère un plateau soluble avec une première mission d'une difficulté donnée. */
  function makeLevel(opts) {
    const n = opts.n || 6, count = opts.count || 7, rng = opts.rng || Math.random, minPar = opts.minPar || 2, maxPar = opts.maxPar || 8;
    let best = null;
    for (let attempt = 0; attempt < 80; attempt++) {
      const cars = placeCars(n, count, rng);
      if (!cars) continue;
      const m = pickMission(cars, n, { rng, minPar, maxPar });
      if (!m) continue;
      if (m.par >= minPar) return { cars, mission: m.id, par: m.par };
      if (!best || m.par > best.par) best = { cars, mission: m.id, par: m.par };
    }
    return best;
  }

  /* ----- Mode « phrase » : sortir les mots dans l'ordre, avec des intrus et des obstacles fixes ----- */
  /* keys : clés des mots attendus, dans l'ordre. Chaque voiture porte une clé (key). Retourne { par, moves } ou null. */
  function planStages(cars, n, keys, cap) {
    let state = cars.map(c => ({ ...c })), total = 0;
    const moves = [];
    for (const k of keys) {
      const ids = state.filter(c => !c.fixed && c.key === k).map(c => c.id);
      const r = bfs(state, n, ids, cap || 20000);
      if (!r) return null;
      for (const m of r.path) {
        if (m.exit) { state = state.filter(c => c.id !== m.id); } else { state.find(c => c.id === m.id).p = m.to; }
        moves.push(m);
      }
      total += r.par;
    }
    return { par: total, moves };
  }
  const hintStage = (cars, n, key) => {
    const ids = cars.filter(c => !c.fixed && c.key === key).map(c => c.id), r = ids.length ? bfs(cars, n, ids, 30000) : null;
    return r ? r.path[0] : null;
  };
  /* tokens : mots de la phrase (ordre) ; intruders : mots sans rapport ; obstacles : nombre d'obstacles fixes. */
  function makeSentenceLevel(opts) {
    const n = opts.n || 6, rng = opts.rng || Math.random, tokens = opts.tokens, intruders = opts.intruders || [], obstacles = opts.obstacles || 0, maxPar = opts.maxPar || 30;
    const keyOf = opts.keyOf || (s => String(s).toLowerCase());
    let best = null;
    for (let attempt = 0; attempt < 70; attempt++) {
      const cars = placeCars(n, tokens.length + intruders.length, rng, obstacles);
      if (!cars) continue;
      const order = shuffle(cars.filter(c => !c.fixed).map(c => c.id), rng);
      const labels = shuffle([...tokens.map((t, i) => ({ text: t, role: 'token', index: i })), ...intruders.map(t => ({ text: t, role: 'intruder' }))], rng);
      order.forEach((id, i) => { const c = cars.find(x => x.id === id), l = labels[i]; c.text = l.text; c.key = keyOf(l.text); c.role = l.role; c.index = l.index; });
      const plan = planStages(cars, n, tokens.map(keyOf), 15000);
      if (!plan || plan.par > maxPar) continue;
      const level = { cars, par: plan.par };
      if (plan.par >= (opts.minPar || 0)) return level;
      if (!best || plan.par > best.par) best = level;
    }
    return best;
  }

  const api = { range, rangeOf, solve, hint, bfs, placeCars, pickMission, makeLevel, planStages, hintStage, makeSentenceLevel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.WordSipParking = api;
})(typeof window !== 'undefined' ? window : globalThis);
