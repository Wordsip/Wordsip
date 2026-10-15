(() => {
  'use strict';
  const $ = id => document.getElementById(id), canvas = $('arena'), ctx = canvas.getContext('2d');
  const FX = typeof WordSipFX !== 'undefined' ? WordSipFX : null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.min(900, Math.max(320, Math.floor(canvas.parentElement.clientWidth)));
  const H = Math.min(480, Math.max(340, Math.floor(window.innerHeight * .48)));
  canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
  const params = new URLSearchParams(location.search), guest = params.get('guest') === 'true';
  const names = { en: 'Anglais', es: 'Espagnol', it: 'Italien', ja: 'Japonais', zh: 'Chinois' };
  const PALETTE = [['#2ec4b6', '#0b7a75'], ['#ff9f1c', '#b45309'], ['#9b5de5', '#5b21b6'], ['#f15bb5', '#a21a63']];
  const DEADLINE = H - 85, MAX_TIME = 120, ROBOT_H = 96;
  let deck = null, weekCount = 0, running = false, paused = false, score = 0, lives = 3, remaining = 90, roundIndex = 0;
  let targets = [], rocks = [], mines = [], bullets = [], particles = [], player = W / 2, vx = 0, last = 0, elapsed = 0, shotAt = -1;
  let hits = 0, errors = 0, missed = 0, streak = 0, bestStreak = 0, shake = 0, flash = 0, language = 'en', learned = [];
  const keys = new Set(); let mission = null;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 80 }, () => ({ x: rnd() * W, y: rnd() * H, r: .6 + Math.floor(rnd() * 3) * .55, v: 6 + Math.floor(rnd() * 3) * 9 }));
  $('back').href = '/mot-du-jour' + location.search; $('grammar').href = '/grammaire' + location.search;
  const bestKey = 'wordsip-best-weekly-all';
  const readBest = () => { try { return Number(localStorage.getItem(bestKey)) || 0; } catch (e) { return 0; } };
  const play = (name, arg) => { if (FX) FX.play(name, arg); };
  const wave = () => Math.max(1, roundIndex);

  function feedback(text, bad = false) { $('feedback').textContent = text; $('feedback').className = 'feedback ' + (bad ? 'bad' : 'good'); }
  function hud() {
    $('score').textContent = score;
    $('lives').textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
    $('lives').setAttribute('aria-label', lives + ' vie' + (lives > 1 ? 's' : ''));
    $('time').textContent = Math.max(0, Math.ceil(remaining)) + ' s';
    $('wave').textContent = wave();
    $('combo-pill').hidden = streak < 2; $('combo').textContent = 'x' + Math.min(streak, 9);
  }
  function screenPoint(x, y) { const r = canvas.getBoundingClientRect(); return { x: r.left + x * r.width / W, y: r.top + y * r.height / H }; }
  function explode(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * 6.283, s = 60 + Math.random() * 240;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 1, decay: .9 + Math.random() * 1.2, r: 2 + Math.random() * 3.5, color });
    }
  }

  /* ---------- Manches : mots différents, intrus, obstacles ---------- */
  function nextRound() {
    const w = roundIndex + 1, decoys = w >= 4 ? 3 : 2;
    mission = WordSipGame.buildRound(deck, roundIndex++, { decoys });
    $('direction').textContent = mission.reverse ? 'Retrouvez le mot dans la langue étudiée' : 'Retrouvez la traduction française';
    $('prompt').textContent = mission.prompt;
    const count = mission.options.length, columns = W < 600 ? Math.min(2, count) : count, spacing = (W - 40) / columns;
    const width = Math.min(190, spacing * .8), sway = 8 + Math.min(22, w * 1.4);
    targets = mission.options.map((o, i) => {
      const baseX = 20 + spacing * (i % columns + .5) - width / 2;
      return { ...o, x: baseX, y: 24 + Math.floor(i / columns) * (ROBOT_H + 14), w: width, h: ROBOT_H, baseX, sway, speed: .9 + Math.random() * .3, colors: PALETTE[i % PALETTE.length], phase: i * .7 };
    });
    // Obstacles : astéroïdes (arrêtent les tirs) dès la vague 2, mines (à ne pas toucher) dès la vague 5.
    const nRocks = w < 2 ? 0 : Math.min(3, 1 + Math.floor(w / 4)), nMines = w < 5 ? 0 : Math.min(2, 1 + Math.floor((w - 5) / 5));
    const band = [Math.min(H - 190, 24 + Math.ceil(count / columns) * (ROBOT_H + 14) + 14), H - 135];
    const spot = () => band[0] + rnd() * Math.max(10, band[1] - band[0]);
    rocks = Array.from({ length: nRocks }, (_, i) => ({ x: 60 + rnd() * (W - 120), y: spot(), r: 22 + rnd() * 10, vx: (i % 2 ? 1 : -1) * (28 + rnd() * 34), spin: rnd() * 6, shape: Array.from({ length: 9 }, () => .78 + rnd() * .3) }));
    mines = Array.from({ length: nMines }, (_, i) => ({ x: 60 + rnd() * (W - 120), y: spot(), r: 17, vx: (i % 2 ? -1 : 1) * (22 + rnd() * 26) }));
    bullets = [];
    $('targets').replaceChildren();
    targets.forEach(t => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = t.label; b.setAttribute('aria-label', 'Tirer sur ' + t.label);
      b.onclick = () => { if (running && !paused) hit(t); };
      t.button = b; $('targets').append(b);
    });
    hud();
  }
  function begin() {
    if (paused && running) { resume(); return; }
    if (!deck || !deck.size) return;
    score = 0; lives = 3; remaining = 90; roundIndex = 0; hits = 0; errors = 0; missed = 0; streak = 0; bestStreak = 0; elapsed = 0; shotAt = -1; shake = 0; flash = 0; learned = [];
    particles = []; rocks = []; mines = []; player = W / 2; vx = 0; keys.clear(); running = true; paused = false;
    $('review').open = false; $('review').hidden = true; $('overlay').hidden = true; $('pause').disabled = false; $('pause').textContent = 'Pause';
    feedback('Détruisez le robot qui porte la bonne réponse. Évitez les intrus, les astéroïdes et les mines.'); nextRound(); hud(); canvas.focus(); play('click');
  }
  function hit(target) {
    if (!targets.includes(target) || !running || paused) return;
    score = WordSipGame.scoreHit(score, target.correct);
    const cx = target.x + target.w / 2, cy = target.y + target.h / 2, at = screenPoint(cx, cy);
    if (target.correct) {
      hits++; streak++; bestStreak = Math.max(bestStreak, streak);
      const bonus = streak >= 3 ? Math.min(10, (streak - 2) * 2) : 0; score += bonus; remaining = Math.min(MAX_TIME, remaining + 1.5);
      explode(cx, cy, '#7bed9f', 38); explode(cx, cy, '#ffd166', 16); shake = .5; play(streak >= 3 ? 'combo' : 'ok', streak); play('boom');
      if (FX) { FX.floatText(at, '+' + (10 + bonus) + (bonus ? ' 🔥' : ''), bonus ? 'combo' : 'good'); FX.burst(at.x, at.y, { count: 20 }); }
      const p = mission.pair, ex = p.example;
      if (!learned.some(l => l.word === p.word)) learned.push({ word: p.word, translation: p.translation });
      feedback('Robot détruit ! ' + p.word + ' = ' + p.translation + ' · +' + (10 + bonus) + (bonus ? ' (combo !)' : '') + (ex ? ' · Exemple : ' + ex.text + ' — ' + ex.translation : ''));
      nextRound();
    } else {
      errors++; streak = 0; explode(cx, cy, '#ff6b6b', 24); shake = .35; flash = .35; play('bad');
      if (FX) { FX.floatText(at, '−5', 'bad'); FX.haptic([40, 30, 40]); }
      feedback('Intrus ! « ' + target.label + ' » n’est pas la bonne réponse pour « ' + mission.prompt + ' » · −5.', true);
      targets = targets.filter(t => t !== target); target.button.disabled = true;
    }
    hud();
  }
  function hitMine(mine) {
    score = WordSipGame.scoreHit(score, false); lives--; errors++; streak = 0; shake = .8; flash = .5; mines = mines.filter(m => m !== mine);
    explode(mine.x, mine.y, '#ffb347', 44); explode(mine.x, mine.y, '#ff4d6d', 20); play('boom'); play('life');
    if (FX) { FX.floatText(screenPoint(mine.x, mine.y), '💥 −5', 'bad'); FX.haptic([60, 40, 60]); }
    feedback('Boum ! Vous avez touché une mine : −5 et une vie perdue.', true); hud();
  }
  function fire() {
    if (!running || paused || elapsed - shotAt < .24) return;
    shotAt = elapsed; bullets.push({ x: player, y: H - 62 }); play('shoot');
  }
  function pause() {
    if (!running || paused) return;
    paused = true; keys.clear(); $('overlay-title').textContent = 'Mission en pause';
    $('overlay-text').textContent = 'Le temps et les robots sont arrêtés. Reprenez quand vous êtes prêt.';
    $('start').textContent = 'Reprendre'; $('overlay').hidden = false; $('pause').textContent = 'Reprendre';
  }
  function resume() { paused = false; keys.clear(); last = performance.now(); $('overlay').hidden = true; $('pause').textContent = 'Pause'; canvas.focus(); }
  function finish() {
    running = false; paused = false; keys.clear(); bullets = []; $('targets').replaceChildren(); $('pause').disabled = true; $('review').hidden = false;
    const shots = hits + errors + missed, accuracy = shots ? hits / shots : 0;
    const starCount = !shots ? 0 : lives <= 0 ? (accuracy >= .7 ? 1 : 0) : accuracy >= .85 ? 3 : accuracy >= .65 ? 2 : accuracy >= .4 ? 1 : 0;
    let record = false;
    if (score > readBest()) { try { localStorage.setItem(bestKey, String(score)); record = true; } catch (e) { /* ignoré */ } }
    $('overlay-title').textContent = (lives <= 0 ? '💥 Vaisseau détruit ' : '🚀 Mission terminée ') + '⭐'.repeat(starCount) + '☆'.repeat(3 - starCount);
    const seen = learned.slice(0, 8).map(l => l.word + ' = ' + l.translation).join(' · ');
    $('overlay-text').textContent = `${score} points${record && score > 0 ? ' · 🏅 Nouveau record !' : ''} · ${learned.length} mot${learned.length > 1 ? 's' : ''} réussi${learned.length > 1 ? 's' : ''} · meilleur combo x${bestStreak} · ${errors} mauvais tirs · ${missed} robots échappés.${seen ? ' Mots réussis : ' + seen + (learned.length > 8 ? '…' : '') + '.' : ''}`;
    $('start').textContent = 'Rejouer'; $('overlay').hidden = false; hud();
    if (starCount >= 2) { play('win'); if (FX) FX.confetti(3); } else play(lives <= 0 ? 'lose' : 'click');
  }

  /* ---------- Dessin ---------- */
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  }
  function blob(x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function wrap(text, max, font) {
    ctx.font = font; const lines = []; let line = '';
    for (const part of (text.includes(' ') ? text.split(' ') : Array.from(text))) {
      const trial = line + (line && text.includes(' ') ? ' ' : '') + part;
      if (ctx.measureText(trial).width > max && line) { lines.push(line); line = part; } else line = trial;
    }
    if (line) lines.push(line); return lines;
  }
  function drawRobot(t) {
    const bob = Math.sin(elapsed * 2 + t.phase) * 2.5, x = t.x, y = t.y + bob, w = t.w, h = t.h, [c1, c2] = t.colors, cx = x + w / 2, hw = Math.min(66, w * .44);
    ctx.save();
    const fl = 6 + Math.random() * 8; ctx.fillStyle = '#ffd166'; ctx.globalAlpha = .9;
    for (const jx of [x + w * .3, x + w * .7]) { ctx.beginPath(); ctx.moveTo(jx - 7, y + h - 2); ctx.lineTo(jx, y + h + fl); ctx.lineTo(jx + 7, y + h - 2); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.shadowColor = c1; ctx.shadowBlur = 16;
    const g = ctx.createLinearGradient(0, y + 24, 0, y + h); g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; rr(x, y + 26, w, h - 26, 16); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 2.5; rr(x, y + 26, w, h - 26, 16); ctx.stroke();
    ctx.fillStyle = c2; rr(x - 8, y + 44, 10, 28, 5); ctx.fill(); rr(x + w - 2, y + 44, 10, 28, 5); ctx.fill();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, y + 6); ctx.lineTo(cx, y - 4); ctx.stroke();
    ctx.fillStyle = Math.sin(elapsed * 6 + t.phase) > 0 ? '#ff4d6d' : '#ffd166'; ctx.beginPath(); ctx.arc(cx, y - 6, 4.5, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#e8eef7'; rr(cx - hw / 2, y + 6, hw, 28, 10); ctx.fill(); ctx.strokeStyle = c2; ctx.lineWidth = 2.5; ctx.stroke();
    const blink = Math.sin(elapsed * 1.4 + t.phase * 3) > .97 ? 1 : 5;
    ctx.fillStyle = '#38e8ff'; ctx.shadowColor = '#38e8ff'; ctx.shadowBlur = 9;
    for (const ex of [cx - hw * .22, cx + hw * .22]) { ctx.beginPath(); ctx.ellipse(ex, y + 20, 5.5, blink, 0, 0, 6.3); ctx.fill(); }
    ctx.shadowBlur = 0;
    const sx = x + 8, sy = y + 38, sw = w - 16, sh = h - 38 - 8;
    ctx.fillStyle = '#06142be6'; rr(sx, sy, sw, sh, 10); ctx.fill(); ctx.strokeStyle = '#38e8ff66'; ctx.lineWidth = 1.5; ctx.stroke();
    const font = '800 17px "Baloo 2","Nunito","Segoe UI",Arial,sans-serif', lines = wrap(t.label, sw - 12, font);
    ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#d7fff3'; ctx.shadowColor = '#38e8ff'; ctx.shadowBlur = 5;
    lines.slice(0, 2).forEach((line, i, all) => ctx.fillText(line, cx, sy + sh / 2 + (i - (all.length - 1) / 2) * 19, sw - 10));
    ctx.restore();
  }
  function drawRock(r) {
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.spin);
    ctx.beginPath(); r.shape.forEach((k, i) => { const a = i / r.shape.length * 6.283, px = Math.cos(a) * r.r * k, py = Math.sin(a) * r.r * k; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath();
    const g = ctx.createRadialGradient(-r.r * .3, -r.r * .3, 2, 0, 0, r.r * 1.2); g.addColorStop(0, '#b8c2d1'); g.addColorStop(1, '#4b5563');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#0003'; for (const [dx, dy, rad] of [[-.3, .2, .22], [.25, -.25, .16], [.2, .35, .12]]) { ctx.beginPath(); ctx.arc(dx * r.r, dy * r.r, rad * r.r, 0, 6.3); ctx.fill(); }
    ctx.restore();
  }
  function drawMine(m) {
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(elapsed * .8);
    ctx.fillStyle = '#ff4d6d'; for (let i = 0; i < 8; i++) { ctx.rotate(.7854); ctx.beginPath(); ctx.moveTo(-5, -m.r + 2); ctx.lineTo(0, -m.r - 9); ctx.lineTo(5, -m.r + 2); ctx.closePath(); ctx.fill(); }
    const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, m.r); g.addColorStop(0, '#5b6577'); g.addColorStop(1, '#1b2130');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, m.r, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 2; ctx.stroke();
    ctx.rotate(-elapsed * .8); ctx.fillStyle = Math.sin(elapsed * 8) > 0 ? '#ff4d6d' : '#ffd166'; ctx.shadowColor = '#ff4d6d'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  function draw() {
    const ox = shake > 0 ? (Math.random() - .5) * shake * 16 : 0, oy = shake > 0 ? (Math.random() - .5) * shake * 16 : 0;
    ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#080f2b'); bg.addColorStop(.6, '#12204a'); bg.addColorStop(1, '#1e3263');
    ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40);
    blob(W * .18, H * .3, 190, '#7c3aed38'); blob(W * .85, H * .5, 210, '#06b6d430'); blob(W * .5, H * .95, 240, '#f4727233');
    for (const s of stars) { ctx.globalAlpha = .35 + s.r * .3; ctx.fillStyle = '#dff6ff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.3); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.strokeStyle = '#ff4d6d88'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -elapsed * 20;
    ctx.beginPath(); ctx.moveTo(0, DEADLINE); ctx.lineTo(W, DEADLINE); ctx.stroke(); ctx.restore();
    const grd = ctx.createLinearGradient(0, DEADLINE, 0, H); grd.addColorStop(0, '#ff4d6d14'); grd.addColorStop(1, 'transparent'); ctx.fillStyle = grd; ctx.fillRect(0, DEADLINE, W, H - DEADLINE);
    rocks.forEach(drawRock); mines.forEach(drawMine); targets.forEach(drawRobot);
    for (const b of bullets) {
      const g = ctx.createLinearGradient(0, b.y, 0, b.y + 34); g.addColorStop(0, '#fff7c2'); g.addColorStop(1, '#ff9f1c00');
      ctx.save(); ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 14; ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y + 30); ctx.stroke(); ctx.restore();
    }
    for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (.4 + p.life * .6), 0, 6.3); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(player, H - 40); ctx.rotate(Math.max(-.3, Math.min(.3, vx / 430 * .3)));
    const flame = 12 + Math.random() * 10 + Math.min(8, Math.abs(vx) / 60);
    const fg = ctx.createLinearGradient(0, 14, 0, 14 + flame); fg.addColorStop(0, '#fff3b0'); fg.addColorStop(.5, '#ff9f1c'); fg.addColorStop(1, '#ff4d6d00');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-7, 14); ctx.lineTo(0, 14 + flame); ctx.lineTo(7, 14); ctx.closePath(); ctx.fill();
    ctx.shadowColor = '#5eead4'; ctx.shadowBlur = 16;
    const sg = ctx.createLinearGradient(-24, -22, 24, 18); sg.addColorStop(0, '#d9fff6'); sg.addColorStop(1, '#2ec4b6');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(23, 17); ctx.lineTo(9, 11); ctx.lineTo(0, 17); ctx.lineTo(-9, 11); ctx.lineTo(-23, 17); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#0b3b5f'; ctx.beginPath(); ctx.ellipse(0, -4, 5, 9, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#7dd3fc'; ctx.beginPath(); ctx.ellipse(-1.5, -7, 1.8, 4, 0, 0, 6.3); ctx.fill();
    ctx.restore();
    if (flash > 0) { ctx.fillStyle = `rgba(255,77,109,${flash * .5})`; ctx.fillRect(0, 0, W, H); }
  }

  function frame(time) {
    const dt = Math.min(.05, (time - last) / 1000 || 0); last = time;
    for (const s of stars) { s.y += s.v * dt * (running && !paused ? 1 : .3); if (s.y > H) { s.y = 0; s.x = Math.random() * W; } }
    shake = Math.max(0, shake - dt * 2.2); flash = Math.max(0, flash - dt * 1.6);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= p.decay * dt; }
    particles = particles.filter(p => p.life > 0);
    if (running && !paused) {
      elapsed += dt; remaining -= dt;
      const prev = player;
      if (keys.has('ArrowLeft') || keys.has('a')) player -= 430 * dt;
      if (keys.has('ArrowRight') || keys.has('d')) player += 430 * dt;
      player = Math.max(26, Math.min(W - 26, player)); vx = vx * .8 + (player - prev) / Math.max(dt, .001) * .2;
      if (keys.has(' ')) fire();
      const fall = 26 + Math.min(46, roundIndex * 2.4);
      for (const t of targets) { t.y += fall * t.speed * dt; t.x = t.baseX + Math.sin(elapsed * (1.2 + roundIndex * .04) + t.phase) * t.sway; }
      for (const o of [...rocks, ...mines]) { o.x += o.vx * dt; if (o.x < o.r + 6 || o.x > W - o.r - 6) o.vx *= -1; }
      for (const r of rocks) r.spin += dt * .6;
      for (const b of bullets) b.y -= 640 * dt;
      for (const b of bullets) {
        const rock = rocks.find(r => Math.hypot(b.x - r.x, b.y - r.y) < r.r + 3);
        if (rock) { b.y = -100; explode(b.x, rock.y + rock.r * .6, '#cbd5e1', 8); play('click'); continue; }
        const mine = mines.find(m => Math.hypot(b.x - m.x, b.y - m.y) < m.r + 6);
        if (mine) { b.y = -100; hitMine(mine); continue; }
        const found = targets.find(t => b.x >= t.x && b.x <= t.x + t.w && b.y <= t.y + t.h && b.y + 20 >= t.y);
        if (found) { b.y = -100; hit(found); break; }
      }
      bullets = bullets.filter(b => b.y > -20);
      if (targets.some(t => t.correct && t.y + t.h >= DEADLINE)) {
        lives--; missed++; streak = 0; shake = .6; flash = .5; play('life');
        feedback('Le bon robot s’est échappé : « ' + mission.correct + ' » · une vie perdue.', true);
        if (lives > 0) nextRound();
      }
      if (remaining <= 0 || lives <= 0) finish();
      hud();
    } else if (!running) vx = 0;
    draw(); requestAnimationFrame(frame);
  }

  $('start').onclick = begin; $('pause').onclick = () => paused ? resume() : pause(); $('fire').onclick = fire;
  for (const [id, key] of [['left', 'ArrowLeft'], ['right', 'ArrowRight']]) {
    $(id).onpointerdown = e => { e.preventDefault(); $(id).setPointerCapture(e.pointerId); keys.add(key); };
    $(id).onpointerup = $(id).onpointercancel = () => keys.delete(key);
  }
  canvas.onpointerdown = e => {
    if (!running || paused) return; const rect = canvas.getBoundingClientRect();
    player = Math.max(26, Math.min(W - 26, (e.clientX - rect.left) * W / rect.width)); fire(); canvas.focus();
  };
  document.addEventListener('keydown', e => {
    if (!running || paused || e.target.closest('button,input,summary')) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (['ArrowLeft', 'ArrowRight', 'a', 'd', ' '].includes(key)) { e.preventDefault(); keys.add(key); }
  });
  document.addEventListener('keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
  window.addEventListener('blur', pause); document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  if (FX) FX.bindMute($('sound-toggle')); else $('sound-toggle').hidden = true;

  /* Mots des fiches : complètent les mots consultés pour que les manches varient toujours. */
  async function loadPool(lang) {
    try {
      const res = await fetch('/api/learning-games/' + lang); if (!res.ok) return [];
      const data = await res.json(), n = WordSipGame.normal;
      return (data.lessons || []).flatMap(lesson => (lesson.vocabulary || []).map(v => {
        const ex = (lesson.examples || []).find(e => e.text && n(e.text).includes(n(v.term)));
        return { word: v.term, translation: v.translation, reading: v.reading || '', theme: lesson.id.replace(/^quotidien-/, ''), example: ex ? { text: ex.text, translation: ex.translation } : null };
      }));
    } catch (e) { return []; }
  }

  async function load() {
    try {
      let level = params.get('level') || 'niveau1', profile = 'guest', words; language = params.get('lang') || 'en';
      if (!guest) {
        let email = params.get('email'); if (!email) { const r = await fetch('/api/session'), s = await r.json(); email = s.email; }
        if (!email) throw new Error('Connectez-vous ou revenez depuis votre mode invité.');
        profile = email; const r = await fetch('/api/week-game?email=' + encodeURIComponent(email)); const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Chargement impossible.');
        language = data.language; level = data.level; words = data.words;
      } else words = WordSipHistory.week(profile, language, level);
      const pool = await loadPool(language), n = WordSipGame.normal;
      // Rattache aux mots consultés leur thème et leur phrase d'exemple quand la fiche les connaît.
      const known = new Map(pool.map(p => [n(p.word) + '|' + n(p.translation), p]));
      deck = WordSipGame.createDeck(words.map(w => ({ ...(known.get(n(w.word) + '|' + n(w.translation)) || {}), ...w })), pool);
      weekCount = deck.weekSize;
      $('language').textContent = (names[language] || language) + (weekCount ? ' · mots consultés depuis lundi' : ' · mode découverte');
      $('word-count').textContent = weekCount + ' mot(s) de la semaine · ' + deck.size + ' mots en jeu';
      const best = readBest(); if (best > 0) $('word-count').textContent += ' · 🏅 record ' + best;
      for (const word of words) { const li = document.createElement('li'); li.textContent = word.word + ' — ' + word.translation; $('word-list').append(li); }
      if (!deck.size) {
        $('overlay-title').textContent = 'Votre semaine commence ici';
        $('overlay-text').textContent = 'Consultez votre mot du jour, puis revenez jouer. Seuls les mots réellement vus depuis lundi sont ajoutés.'; $('start').hidden = true; return;
      }
      if (!weekCount) $('overlay-text').textContent = 'Vous n’avez pas encore consulté de mot cette semaine : voici une mission de découverte avec les mots des fiches. Les mots que vous consultez passeront en premier.';
      $('prompt').textContent = 'Prêt à viser ?'; $('start').disabled = false;
    } catch (error) {
      $('loading-error').textContent = error.message; $('overlay-title').textContent = 'Les mots ne sont pas encore disponibles';
      $('overlay-text').textContent = 'Retournez à Mon mot du jour, puis réessayez.'; $('start').hidden = true;
    }
  }
  requestAnimationFrame(frame); load(); hud();
})();
