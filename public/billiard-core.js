/* WordSip — moteur du « Billard des mots » : physique 2D pure (sans DOM), testable sous Node.
   Table de 640 × 400 ; 6 poches (4 coins + 2 milieux) ; billes rondes de masses égales ; plots fixes (obstacles).
   La simulation est déterministe : la même position et le même tir donnent toujours le même résultat. */
(function (root) {
  'use strict';
  const T = { w: 640, h: 400, ballR: 14, pocketR: 25, fric: 240, stop: 8, wallE: 0.82, ballE: 0.95, bumpE: 1, maxSpeed: 1000, dt: 1 / 240 };
  const POCKETS = [[0, 0], [T.w / 2, 0], [T.w, 0], [0, T.h], [T.w / 2, T.h], [T.w, T.h]];

  const clone = s => ({ balls: s.balls.map(b => ({ ...b })), bumpers: s.bumpers.map(b => ({ ...b })) });
  const moving = s => s.balls.some(b => !b.potted && (b.vx !== 0 || b.vy !== 0));

  /* Un pas de simulation. Retourne les événements : { type: 'pot'|'hit'|'wall', ... }. */
  function step(s, dt) {
    const ev = [], R = T.ballR, live = s.balls.filter(b => !b.potted);
    for (const b of live) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 0) {
        const ns = Math.max(0, sp - T.fric * dt);
        if (ns < T.stop) { b.vx = 0; b.vy = 0; } else { b.vx *= ns / sp; b.vy *= ns / sp; }
      }
      for (let i = 0; i < POCKETS.length; i++) {
        if (Math.hypot(b.x - POCKETS[i][0], b.y - POCKETS[i][1]) < T.pocketR) {
          b.potted = true; b.pocket = i; b.vx = 0; b.vy = 0; ev.push({ type: 'pot', id: b.id, pocket: i });
          break;
        }
      }
      if (b.potted) continue;
      if (b.x < R) { b.x = R; if (b.vx < 0) { b.vx = -b.vx * T.wallE; ev.push({ type: 'wall', id: b.id }); } }
      if (b.x > T.w - R) { b.x = T.w - R; if (b.vx > 0) { b.vx = -b.vx * T.wallE; ev.push({ type: 'wall', id: b.id }); } }
      if (b.y < R) { b.y = R; if (b.vy < 0) { b.vy = -b.vy * T.wallE; ev.push({ type: 'wall', id: b.id }); } }
      if (b.y > T.h - R) { b.y = T.h - R; if (b.vy > 0) { b.vy = -b.vy * T.wallE; ev.push({ type: 'wall', id: b.id }); } }
      for (const bm of s.bumpers) {
        const dx = b.x - bm.x, dy = b.y - bm.y, d = Math.hypot(dx, dy), min = R + bm.r;
        if (d < min && d > 0) {
          const nx = dx / d, ny = dy / d; b.x = bm.x + nx * min; b.y = bm.y + ny * min;
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) { b.vx -= (1 + T.bumpE) * vn * nx; b.vy -= (1 + T.bumpE) * vn * ny; ev.push({ type: 'bump', id: b.id }); }
        }
      }
    }
    const alive = s.balls.filter(b => !b.potted);
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i], c = alive[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
        if (d >= 2 * R || d === 0) continue;
        const nx = dx / d, ny = dy / d, push = (2 * R - d) / 2;
        a.x -= nx * push; a.y -= ny * push; c.x += nx * push; c.y += ny * push;
        const rv = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
        if (rv > 0) {
          const j2 = (1 + T.ballE) * rv / 2;
          a.vx -= j2 * nx; a.vy -= j2 * ny; c.vx += j2 * nx; c.vy += j2 * ny;
          ev.push({ type: 'hit', a: a.id, b: c.id, speed: rv });
        }
      }
    }
    return ev;
  }

  /* Tire la bille blanche (id 0) : angle en radians, puissance de 0 à 1. */
  function shoot(s, angle, power) {
    const cue = s.balls.find(b => b.id === 0), sp = Math.max(0, Math.min(1, power)) * T.maxSpeed;
    cue.vx = Math.cos(angle) * sp; cue.vy = Math.sin(angle) * sp;
  }
  /* Simule jusqu'à l'arrêt de toutes les billes (ou maxTime secondes). Retourne tous les événements. */
  function simulate(s, maxTime) {
    const all = []; let t = 0;
    while (moving(s) && t < (maxTime || 14)) { for (const e of step(s, T.dt)) all.push(e); t += T.dt; }
    return all;
  }

  /* Cherche un tir qui envoie la bille cible dans la poche voulue (méthode de la « bille fantôme »),
     sans empocher d'intrus. Retourne { angle, power } ou null. */
  function findShot(s, targetId, pocket) {
    const cue = s.balls.find(b => b.id === 0), tg = s.balls.find(b => b.id === targetId), p = POCKETS[pocket];
    const dx = p[0] - tg.x, dy = p[1] - tg.y, d = Math.hypot(dx, dy) || 1;
    const gx = tg.x - dx / d * 2 * T.ballR, gy = tg.y - dy / d * 2 * T.ballR, base = Math.atan2(gy - cue.y, gx - cue.x);
    for (const power of [0.55, 0.7, 0.85, 1, 0.4]) {
      for (const off of [0, 0.012, -0.012, 0.025, -0.025, 0.04, -0.04]) {
        const sim = clone(s); shoot(sim, base + off, power); simulate(sim, 12);
        const t2 = sim.balls.find(b => b.id === targetId);
        if (t2.potted && t2.pocket === pocket && sim.balls.every(b => b.role !== 'intruder' || !b.potted) && !sim.balls.find(b => b.id === 0).potted) return { angle: base + off, power };
      }
    }
    return null;
  }

  /* Prépare une manche : bille blanche, bille cible, intrus et plots, avec un tir garanti vers une poche
     (la poche correcte est choisie parmi celles qui sont réellement accessibles). */
  function createRound(opts) {
    const rng = opts.rng || Math.random, R = T.ballR, intruders = opts.intruders || 1, bumpers = opts.bumpers || 0;
    for (let attempt = 0; attempt < 60; attempt++) {
      const items = [], free = (x, y, m) => items.every(o => Math.hypot(o.x - x, o.y - y) > (o.r || R) + m) && POCKETS.every(p => Math.hypot(p[0] - x, p[1] - y) > T.pocketR + R + 12);
      const place = (role, r, region, margin) => {
        for (let k = 0; k < 80; k++) {
          const x = region[0] + rng() * (region[2] - region[0]), y = region[1] + rng() * (region[3] - region[1]);
          if (free(x, y, margin + r)) { items.push({ x, y, r, role }); return items[items.length - 1]; }
        }
        return null;
      };
      const cue = place('cue', R, [60, 120, 200, 280], 6);
      const bums = Array.from({ length: bumpers }, () => place('bumper', 20, [230, 70, 560, 330], 18));
      const target = place('target', R, [300, 70, 580, 330], 6);
      const others = Array.from({ length: intruders }, () => place('intruder', R, [220, 60, 590, 340], 6));
      if (!cue || !target || bums.includes(null) || others.includes(null)) continue;
      const state = {
        balls: [{ id: 0, x: cue.x, y: cue.y, vx: 0, vy: 0, role: 'cue' }, { id: 1, x: target.x, y: target.y, vx: 0, vy: 0, role: 'target' },
          ...others.map((o, i) => ({ id: 2 + i, x: o.x, y: o.y, vx: 0, vy: 0, role: 'intruder' }))],
        bumpers: bums.map(b => ({ x: b.x, y: b.y, r: b.r }))
      };
      const order = [0, 1, 2, 3, 4, 5].map(i => [rng(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
      for (const pocket of order) {
        const shot = findShot(state, 1, pocket);
        if (shot) return { state, pocket, shot };
      }
    }
    return null;
  }

  const api = { T, POCKETS, step, shoot, simulate, clone, moving, findShot, createRound };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.WordSipBilliard = api;
})(typeof window !== 'undefined' ? window : globalThis);
