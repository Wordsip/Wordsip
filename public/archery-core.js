/* WordSip — moteur du « Tir à l'arc des mots » : logique pure (sans DOM), testable sous Node.
   Scène de 800 × 500. Trois plans de cibles : proche (10 m), moyen (20 m) et lointain (30 m).
   La flèche traverse les plans du plus proche au plus lointain et s'arrête dans la première cible touchée.
   Le résultat d'un tir est entièrement déterminé par la visée, la force de l'arc, l'instant du tir et le vent. */
(function (root) {
  'use strict';
  const A = {
    W: 800, H: 500, bow: { x: 400, y: 470 }, horizon: 200, baseR: 64, windPx: 46, fullDraw: 1.1,
    depths: {
      near: { key: 'near', d: 10, scale: 0.95, ground: 392, points: 10 },
      mid: { key: 'mid', d: 20, scale: 0.66, ground: 322, points: 20 },
      far: { key: 'far', d: 30, scale: 0.45, ground: 262, points: 30 }
    }
  };
  const ORDER = ['near', 'mid', 'far'];
  const radius = depth => A.baseR * A.depths[depth].scale;
  const centerY = depth => A.depths[depth].ground - radius(depth) * 1.25;

  /* Position d'une cible à l'instant t (secondes) : fixe, ou en va-et-vient horizontal. */
  function posAt(target, t) {
    return { x: target.x + (target.amp || 0) * Math.sin((target.speed || 0) * t + (target.phase || 0)), y: centerY(target.depth) };
  }
  const power = drawTime => Math.max(0, Math.min(1, drawTime / A.fullDraw));
  /* Temps de vol jusqu'au plan donné : plus long pour une cible lointaine ou un arc peu bandé. */
  const flightTime = (depth, pw) => (0.28 + A.depths[depth].d * 0.012) * (1.55 - 0.6 * pw);
  /* Léger tremblement de la visée ; il augmente si l'on garde l'arc tendu trop longtemps. */
  function swayAt(t, drawTime, factor) {
    const f = factor == null ? 1 : factor, amp = f * (3.5 + 11 * Math.max(0, drawTime - 1.6));
    return { x: amp * (Math.sin(2.3 * t) + 0.4 * Math.sin(5.1 * t + 1)), y: amp * (Math.cos(1.9 * t + 0.5) + 0.4 * Math.sin(4.3 * t)) };
  }
  const drop = (pw, depth) => (1 - pw) * (30 + 60 * A.depths[depth].d / 30);
  /* Point d'arrivée de la flèche dans un plan donné. */
  function landing(aim, pw, sway, wind, depth) {
    return { x: aim.x + sway.x + wind * A.windPx * A.depths[depth].d / 30, y: aim.y + sway.y + drop(pw, depth) };
  }
  const ringOf = ratio => ratio <= 0.2 ? 'bull' : ratio <= 0.5 ? 'inner' : ratio <= 0.8 ? 'mid' : 'edge';
  const RING_BONUS = { bull: 10, inner: 5, mid: 0, edge: 0 };

  /* Résout un tir. args : aim {x,y}, drawTime, time (instant du tir), targets, wind, swayFactor. */
  function resolveShot(args) {
    const pw = power(args.drawTime), sway = swayAt(args.time, args.drawTime, args.swayFactor);
    for (const depth of ORDER) {
      const tc = args.time + flightTime(depth, pw), L = landing(args.aim, pw, sway, args.wind || 0, depth), R = radius(depth);
      let best = null;
      for (const t of args.targets) {
        if (t.depth !== depth) continue;
        const p = posAt(t, tc), dist = Math.hypot(L.x - p.x, L.y - p.y);
        if (dist <= R && (!best || dist < best.dist)) best = { id: t.id, depth, dist, ratio: dist / R, ring: ringOf(dist / R), at: p, land: L, flight: flightTime(depth, pw) };
      }
      if (best) return { hit: best, land: best.land, endDepth: depth, flight: best.flight, power: pw, sway };
    }
    const L = landing(args.aim, pw, sway, args.wind || 0, 'far');
    return { hit: null, land: L, endDepth: 'far', flight: flightTime('far', pw), power: pw, sway };
  }
  /* Points d'une cible touchée : selon la distance, plus un bonus au centre. */
  const scoreOf = hit => ({ base: A.depths[hit.depth].points, bonus: RING_BONUS[hit.ring], ring: hit.ring });

  /* Visée parfaite (vent, chute, tremblement et mouvement de la cible compris) pour toucher le centre d'une cible. */
  function solveAim(target, args) {
    const pw = power(args.drawTime), tc = args.time + flightTime(target.depth, pw), p = posAt(target, tc), sway = swayAt(args.time, args.drawTime, args.swayFactor);
    return { x: p.x - sway.x - (args.wind || 0) * A.windPx * A.depths[target.depth].d / 30, y: p.y - sway.y - drop(pw, target.depth) };
  }

  /* Manche : cibles à plusieurs distances (une bonne, des intrus), certaines mobiles, un vent. */
  function makeRound(opts) {
    const rng = opts.rng || Math.random, count = Math.max(3, Math.min(6, opts.count || 4)), moving = !!opts.moving, windMax = opts.windMax || 0;
    const speedMul = opts.speedMul || 1;
    for (let attempt = 0; attempt < 200; attempt++) {
      const depths = Array.from({ length: count }, (_, i) => ORDER[i < 3 ? i : Math.floor(rng() * 3)]).sort(() => rng() - 0.5);
      const targets = [];
      let ok = true;
      for (let i = 0; i < count && ok; i++) {
        const depth = depths[i], R = radius(depth), amp = moving ? 32 + rng() * 60 : 0, margin = R + amp + 14;
        let placed = false;
        for (let k = 0; k < 60 && !placed; k++) {
          const x = margin + rng() * (A.W - 2 * margin);
          const clash = targets.some(o => o.depth === depth && Math.abs(o.x - x) < R + radius(o.depth) + (o.amp || 0) + amp + 12);
          if (!clash) { targets.push({ id: i, depth, x, amp, speed: moving ? (0.7 + rng() * 0.8) * speedMul : 0, phase: rng() * 6.28, role: 'intruder' }); placed = true; }
        }
        if (!placed) ok = false;
      }
      if (!ok) continue;
      const wind = windMax ? (rng() * 2 - 1) * windMax : 0, order = targets.map((t, i) => [rng(), i]).sort((a, b) => a[0] - b[0]);
      for (const [, idx] of order) {
        const target = targets[idx];
        // La cible doit rester atteignable à tout moment : on tire en plein centre à plusieurs instants.
        let good = true;
        for (let s = 0; s < 14 && good; s++) {
          const time = s * 0.55, args = { drawTime: A.fullDraw, time, wind, swayFactor: 0, targets };
          const aim = solveAim(target, args), r = resolveShot({ ...args, aim });
          if (!r.hit || r.hit.id !== target.id || r.hit.ratio > 0.3) good = false;
        }
        if (good) { target.role = 'target'; return { targets, correct: target.id, wind }; }
      }
    }
    return null;
  }

  const api = { A, ORDER, radius, centerY, posAt, power, flightTime, swayAt, drop, landing, ringOf, RING_BONUS, resolveShot, scoreOf, solveAim, makeRound };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.WordSipArchery = api;
})(typeof window !== 'undefined' ? window : globalThis);
