/* WordSip — effets de jeu partagés (sons, confettis, chrono, animations).
   Aucun fichier audio : tous les sons sont synthétisés par WebAudio.
   Respecte « prefers-reduced-motion » et garde le choix muet en mémoire. */
(function (root) {
  'use strict';
  const doc = root.document;
  const reduce = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- Son ---------- */
  let muted = false;
  try { muted = root.localStorage.getItem('wordsip-muted') === '1'; } catch (e) { /* stockage indisponible */ }
  let actx = null;
  function ac() {
    if (!actx) {
      const A = root.AudioContext || root.webkitAudioContext;
      if (!A) return null;
      try { actx = new A(); } catch (e) { return null; }
    }
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    return actx;
  }
  function tone(freq, at, dur, type, vol, glide) {
    const c = ac();
    if (!c) return;
    const t0 = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (glide) o.frequency.linearRampToValueAtTime(Math.max(40, freq + glide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.1, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  const SOUNDS = {
    ok() { tone(660, 0, 0.1, 'triangle', 0.13); tone(990, 0.08, 0.18, 'triangle', 0.12); },
    combo(n) {
      const notes = [523, 659, 784, 988, 1175], k = Math.min(4, Math.max(1, (n || 3) - 2));
      for (let i = 0; i <= k; i++) tone(notes[i], i * 0.055, 0.14, 'square', 0.05);
    },
    bad() { tone(230, 0, 0.22, 'sawtooth', 0.07, -110); },
    tick() { tone(880, 0, 0.05, 'square', 0.035); },
    click() { tone(520, 0, 0.04, 'triangle', 0.06); },
    pick() { tone(740, 0, 0.05, 'triangle', 0.07); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.11)); },
    lose() { [392, 330, 262].forEach((f, i) => tone(f, i * 0.16, 0.3, 'sawtooth', 0.06)); },
    shoot() { tone(980, 0, 0.09, 'square', 0.035, -560); },
    boom() { tone(170, 0, 0.26, 'sawtooth', 0.07, -120); },
    life() { tone(300, 0, 0.3, 'sawtooth', 0.08, -180); },
    vroom() { tone(110, 0, 0.42, 'sawtooth', 0.05, 260); tone(220, 0.05, 0.34, 'triangle', 0.04, 300); },
    honk() { tone(420, 0, 0.16, 'square', 0.06); tone(340, 0.2, 0.22, 'square', 0.06); }
  };
  function play(name, arg) {
    if (muted) return;
    try { if (SOUNDS[name]) SOUNDS[name](arg); } catch (e) { /* le son ne doit jamais casser le jeu */ }
  }
  function haptic(pattern) {
    try { if (!muted && root.navigator && root.navigator.vibrate) root.navigator.vibrate(pattern); } catch (e) { /* ignoré */ }
  }
  function isMuted() { return muted; }
  function setMuted(value) {
    muted = !!value;
    try { root.localStorage.setItem('wordsip-muted', muted ? '1' : '0'); } catch (e) { /* ignoré */ }
    doc.querySelectorAll('[data-mute]').forEach(paintMute);
  }
  function paintMute(btn) {
    btn.textContent = muted ? '🔇 Son coupé' : '🔊 Son activé';
    btn.setAttribute('aria-pressed', String(muted));
  }
  function bindMute(btn) {
    if (!btn) return;
    btn.setAttribute('data-mute', '');
    paintMute(btn);
    btn.addEventListener('click', () => { setMuted(!muted); if (!muted) play('click'); });
  }

  /* ---------- Particules ---------- */
  let layer = null, lctx = null, parts = [], raf = 0, dpr = 1;
  function ensureLayer() {
    if (layer) return;
    layer = doc.createElement('canvas');
    layer.className = 'ws-fx-layer';
    layer.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(layer);
    lctx = layer.getContext('2d');
    fit();
    root.addEventListener('resize', fit);
  }
  function fit() {
    if (!layer) return;
    dpr = Math.min(2, root.devicePixelRatio || 1);
    layer.width = Math.floor(root.innerWidth * dpr);
    layer.height = Math.floor(root.innerHeight * dpr);
    layer.style.width = root.innerWidth + 'px';
    layer.style.height = root.innerHeight + 'px';
  }
  const COLORS = ['#ffd23f', '#ff6b6b', '#4ecdc4', '#6c8cff', '#ff9ff3', '#7bed9f', '#ffa502'];
  function burst(x, y, opts) {
    if (reduce) return;
    ensureLayer();
    const o = opts || {}, count = o.count || 26, colors = o.colors || COLORS, power = o.power || 1;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = (2 + Math.random() * 5) * power;
      parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2 * power, g: 0.16, life: 1,
        decay: 0.012 + Math.random() * 0.014, size: 3 + Math.random() * 5,
        color: colors[i % colors.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        shape: Math.random() < 0.4 ? 'c' : 'r'
      });
    }
    if (!raf) raf = root.requestAnimationFrame(step);
  }
  function confetti(rounds) {
    if (reduce) return;
    const w = root.innerWidth, n = rounds || 3;
    for (let r = 0; r < n; r++) {
      root.setTimeout(() => {
        burst(w * (0.2 + Math.random() * 0.6), root.innerHeight * 0.3, { count: 46, power: 1.5 });
      }, r * 220);
    }
  }
  function step() {
    raf = 0;
    if (!lctx) return;
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, layer.width, layer.height);
    lctx.scale(dpr, dpr);
    parts = parts.filter(p => p.life > 0 && p.y < root.innerHeight + 40);
    for (const p of parts) {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.992; p.rot += p.vr; p.life -= p.decay;
      lctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
      lctx.fillStyle = p.color;
      if (p.shape === 'c') { lctx.beginPath(); lctx.arc(p.x, p.y, p.size / 2, 0, 6.3); lctx.fill(); }
      else { lctx.save(); lctx.translate(p.x, p.y); lctx.rotate(p.rot); lctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66); lctx.restore(); }
    }
    lctx.globalAlpha = 1;
    if (parts.length) raf = root.requestAnimationFrame(step);
    else lctx.clearRect(0, 0, layer.width, layer.height);
  }

  /* ---------- Animations DOM ---------- */
  function center(target) {
    if (!target) return { x: root.innerWidth / 2, y: root.innerHeight / 3 };
    if (typeof target.x === 'number') return target;
    const r = target.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function floatText(target, text, kind) {
    const p = center(target), s = doc.createElement('span');
    s.className = 'ws-float ws-float-' + (kind || 'good');
    s.textContent = text;
    s.setAttribute('aria-hidden', 'true');
    s.style.left = p.x + 'px';
    s.style.top = p.y + 'px';
    doc.body.appendChild(s);
    root.setTimeout(() => s.remove(), 1100);
  }
  function restart(el, cls, ms) {
    if (!el || reduce) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    root.setTimeout(() => el.classList.remove(cls), ms || 600);
  }
  const shake = el => restart(el, 'ws-shake', 520);
  const pop = el => restart(el, 'ws-pop', 480);
  const bump = el => restart(el, 'ws-bump', 360);

  /* ---------- Chrono (une seule horloge active) ---------- */
  let clk = null;
  function stopClock(wrap) {
    if (clk) { root.cancelAnimationFrame(clk.raf); clk = null; }
    if (wrap) { wrap.hidden = true; wrap.classList.remove('warn'); }
  }
  function clock(wrap, bar, seconds, onTimeout) {
    stopClock(wrap);
    if (!wrap || !bar) return;
    wrap.hidden = false; wrap.classList.remove('warn');
    bar.style.transform = 'scaleX(1)';
    const st = { start: root.performance.now(), dur: seconds * 1000, raf: 0, paused: false, pausedAt: 0, last: 99, cb: onTimeout };
    clk = st;
    const loop = now => {
      if (clk !== st) return;
      if (st.paused) { st.raf = root.requestAnimationFrame(loop); return; }
      const left = st.dur - (now - st.start);
      bar.style.transform = 'scaleX(' + Math.max(0, left / st.dur) + ')';
      if (left < st.dur * 0.3) wrap.classList.add('warn');
      const sec = Math.ceil(left / 1000);
      if (sec <= 3 && sec > 0 && sec !== st.last) { st.last = sec; play('tick'); }
      if (left <= 0) { clk = null; wrap.hidden = true; if (st.cb) st.cb(); return; }
      st.raf = root.requestAnimationFrame(loop);
    };
    st.raf = root.requestAnimationFrame(loop);
  }
  doc.addEventListener('visibilitychange', () => {
    if (!clk) return;
    if (doc.hidden) { clk.paused = true; clk.pausedAt = root.performance.now(); }
    else if (clk.paused) { clk.start += root.performance.now() - clk.pausedAt; clk.paused = false; }
  });

  root.WordSipFX = { play, haptic, isMuted, setMuted, bindMute, burst, confetti, floatText, shake, pop, bump, clock, stopClock, reduce };
})(typeof window !== 'undefined' ? window : globalThis);
