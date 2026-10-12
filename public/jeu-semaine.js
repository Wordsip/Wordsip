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
  const DEADLINE = H - 85, MAX_TIME = 120;
  let words = [], running = false, paused = false, score = 0, lives = 3, remaining = 90, roundIndex = 0;
  let targets = [], bullets = [], particles = [], player = W / 2, vx = 0, last = 0, elapsed = 0, shotAt = -1;
  let hits = 0, errors = 0, missed = 0, streak = 0, bestStreak = 0, shake = 0, flash = 0, language = 'en';
  const keys = new Set(); let mission = null;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 80 }, () => ({ x: rnd() * W, y: rnd() * H, r: .6 + Math.floor(rnd() * 3) * .55, v: 6 + Math.floor(rnd() * 3) * 9 }));
  $('back').href = '/mot-du-jour' + location.search; $('grammar').href = '/grammaire' + location.search;
  const bestKey = 'wordsip-best-weekly-all';
  const readBest = () => { try { return Number(localStorage.getItem(bestKey)) || 0; } catch (e) { return 0; } };
  const play = (name, arg) => { if (FX) FX.play(name, arg); };

  function feedback(text, bad = false) { $('feedback').textContent = text; $('feedback').className = 'feedback ' + (bad ? 'bad' : 'good'); }
  function hud() {
    $('score').textContent = score;
    $('lives').textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
    $('lives').setAttribute('aria-label', lives + ' vie' + (lives > 1 ? 's' : ''));
    $('time').textContent = Math.max(0, Math.ceil(remaining)) + ' s';
    $('wave').textContent = Math.max(1, roundIndex);
    $('combo-pill').hidden = streak < 2; $('combo').textContent = 'x' + Math.min(streak, 9);
  }
  function screenPoint(x, y) { const r = canvas.getBoundingClientRect(); return { x: r.left + x * r.width / W, y: r.top + y * r.height / H }; }
  function explode(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * 6.283, s = 60 + Math.random() * 240;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 1, decay: .9 + Math.random() * 1.2, r: 2 + Math.random() * 3.5, color });
    }
  }

  function nextRound() {
    mission = WordSipGame.round(words, roundIndex++);
    $('direction').textContent = mission.reverse ? 'Retrouvez le mot dans la langue étudiée' : 'Retrouvez la traduction française';
    $('prompt').textContent = mission.prompt;
    const count = mission.options.length, columns = W < 600 ? Math.min(2, count) : count, spacing = (W - 40) / columns;
    const width = Math.min(190, spacing * .8), sway = 8 + Math.min(20, roundIndex * 1.4);
    targets = mission.options.map((o, i) => {
      const baseX = 20 + spacing * (i % columns + .5) - width / 2;
      return { ...o, x: baseX, y: 22 + Math.floor(i / columns) * 92, w: width, h: 78, baseX, sway, speed: .9 + Math.random() * .3, colors: PALETTE[i % PALETTE.length], phase: i * .7 };
    });
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
    if (!words.length) return;
    score = 0; lives = 3; remaining = 90; roundIndex = 0; hits = 0; errors = 0; missed = 0; streak = 0; bestStreak = 0; elapsed = 0; shotAt = -1; shake = 0; flash = 0;
    particles = []; player = W / 2; vx = 0; keys.clear(); running = true; paused = false;
    $('review').open = false; $('review').hidden = true; $('overlay').hidden = true; $('pause').disabled = false; $('pause').textContent = 'Pause';
    feedback('Visez une cible, puis tirez.'); nextRound(); hud(); canvas.focus(); play('click');
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
      feedback('Bien joué ! ' + mission.pair.word + ' = ' + mission.pair.translation + ' · +' + (10 + bonus) + (bonus ? ' (combo !)' : ''));
      nextRound();
    } else {
      errors++; streak = 0; explode(cx, cy, '#ff6b6b', 24); shake = .35; flash = .35; play('bad');
      if (FX) { FX.floatText(at, '−5', 'bad'); FX.haptic([40, 30, 40]); }
      feedback('Mauvaise cible : ' + target.label + ' · −5. Cherchez encore la traduction de « ' + mission.prompt + ' ».', true);
      targets = targets.filter(t => t !== target); target.button.disabled = true;
    }
    hud();
  }
  function fire() {
    if (!running || paused || elapsed - shotAt < .24) return;
    shotAt = elapsed; bullets.push({ x: player, y: H - 62 }); play('shoot');
  }
  function pause() {
    if (!running || paused) return;
    paused = true; keys.clear(); $('overlay-title').textContent = 'Mission en pause';
    $('overlay-text').textContent = 'Le temps et les cibles sont arrêtés. Reprenez quand vous êtes prêt.';
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
    $('overlay-text').textContent = `${score} points${record && score > 0 ? ' · 🏅 Nouveau record !' : ''} · ${hits} bonnes cibles · meilleur combo x${bestStreak} · ${errors} mauvais tirs · ${missed} cibles échappées. Révisez les mots puis rejouez !`;
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
  function draw() {
    const ox = shake > 0 ? (Math.random() - .5) * shake * 16 : 0, oy = shake > 0 ? (Math.random() - .5) * shake * 16 : 0;
    ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#080f2b'); bg.addColorStop(.6, '#12204a'); bg.addColorStop(1, '#1e3263');
    ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40);
    blob(W * .18, H * .3, 190, '#7c3aed38'); blob(W * .85, H * .5, 210, '#06b6d430'); blob(W * .5, H * .95, 240, '#f4727233');
    for (const s of stars) { ctx.globalAlpha = .35 + s.r * .3; ctx.fillStyle = '#dff6ff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.3); ctx.fill(); }
    ctx.globalAlpha = 1;
    // ligne à ne pas franchir
    ctx.save(); ctx.strokeStyle = '#ff4d6d88'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -elapsed * 20;
    ctx.beginPath(); ctx.moveTo(0, DEADLINE); ctx.lineTo(W, DEADLINE); ctx.stroke(); ctx.restore();
    const grd = ctx.createLinearGradient(0, DEADLINE, 0, H); grd.addColorStop(0, '#ff4d6d14'); grd.addColorStop(1, 'transparent'); ctx.fillStyle = grd; ctx.fillRect(0, DEADLINE, W, H - DEADLINE);
    // cibles
    for (const t of targets) {
      const bob = Math.sin(elapsed * 2 + t.phase) * 2.5;
      ctx.save(); ctx.shadowColor = t.colors[0]; ctx.shadowBlur = 16;
      const g = ctx.createLinearGradient(0, t.y + bob, 0, t.y + bob + t.h); g.addColorStop(0, t.colors[0]); g.addColorStop(1, t.colors[1]);
      ctx.fillStyle = g; rr(t.x, t.y + bob, t.w, t.h, 18); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#ffffff30'; rr(t.x + 6, t.y + bob + 5, t.w - 12, t.h * .36, 12); ctx.fill();
      ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 2.5; rr(t.x, t.y + bob, t.w, t.h, 18); ctx.stroke();
      const font = '800 17px "Baloo 2","Nunito","Segoe UI",Arial,sans-serif', lines = wrap(t.label, t.w - 20, font);
      ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#0008'; ctx.shadowBlur = 4;
      lines.forEach((line, i) => ctx.fillText(line, t.x + t.w / 2, t.y + bob + t.h / 2 + (i - (lines.length - 1) / 2) * 20, t.w - 16));
      ctx.shadowBlur = 0;
    }
    // balles
    for (const b of bullets) {
      const g = ctx.createLinearGradient(0, b.y, 0, b.y + 34); g.addColorStop(0, '#fff7c2'); g.addColorStop(1, '#ff9f1c00');
      ctx.save(); ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 14; ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y + 30); ctx.stroke(); ctx.restore();
    }
    // particules
    for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (.4 + p.life * .6), 0, 6.3); ctx.fill(); }
    ctx.globalAlpha = 1;
    // vaisseau
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
      for (const b of bullets) b.y -= 640 * dt;
      for (const b of bullets) {
        const found = targets.find(t => b.x >= t.x && b.x <= t.x + t.w && b.y <= t.y + t.h && b.y + 20 >= t.y);
        if (found) { b.y = -100; hit(found); break; }
      }
      bullets = bullets.filter(b => b.y > -20);
      if (targets.some(t => t.correct && t.y + t.h >= DEADLINE)) {
        lives--; missed++; streak = 0; shake = .6; flash = .5; play('life');
        feedback('La bonne cible s’est échappée : ' + mission.correct + ' · une vie perdue.', true);
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

  async function load() {
    try {
      let level = params.get('level') || 'niveau1', profile = 'guest'; language = params.get('lang') || 'en';
      if (!guest) {
        let email = params.get('email'); if (!email) { const r = await fetch('/api/session'), s = await r.json(); email = s.email; }
        if (!email) throw new Error('Connectez-vous ou revenez depuis votre mode invité.');
        profile = email; const r = await fetch('/api/week-game?email=' + encodeURIComponent(email)); const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Chargement impossible.');
        language = data.language; level = data.level; words = data.words;
      } else words = WordSipHistory.week(profile, language, level);
      $('language').textContent = (names[language] || language) + ' · mots consultés depuis lundi'; $('word-count').textContent = words.length + ' mot(s)';
      const best = readBest(); if (best > 0) $('word-count').textContent += ' · 🏅 record ' + best;
      for (const word of words) { const li = document.createElement('li'); li.textContent = word.word + ' — ' + word.translation; $('word-list').append(li); }
      if (!words.length) {
        $('overlay-title').textContent = 'Votre semaine commence ici';
        $('overlay-text').textContent = 'Consultez votre mot du jour, puis revenez jouer. Seuls les mots réellement vus depuis lundi sont ajoutés.'; $('start').hidden = true; return;
      }
      $('prompt').textContent = 'Prêt à viser ?'; $('start').disabled = false;
    } catch (error) {
      $('loading-error').textContent = error.message; $('overlay-title').textContent = 'Les mots ne sont pas encore disponibles';
      $('overlay-text').textContent = 'Retournez à Mon mot du jour, puis réessayez.'; $('start').hidden = true;
    }
  }
  requestAnimationFrame(frame); load(); hud();
})();
