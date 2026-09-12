const params = new URLSearchParams(window.location.search);
const email = params.get('email');
const isGuest = params.get('guest') === 'true';

let currentWord = null;
let currentUser = null;
let attemptCount = 1;
const MAX_ATTEMPTS = 4;
let correctCount = 0;

const LEVEL_LABELS = {
  niveau1: 'Niveau 1 — Collège', niveau2: 'Niveau 2 — Lycée', niveau3: 'Niveau 3 — Fac/Pro',
};
const LEVEL_ORDER = ['niveau1', 'niveau2', 'niveau3'];
let currentProgress = null;

async function loadWord() {
  if (isGuest) {
    // Mode invité : pas de compte, langue/niveau fixes, suivi via localStorage
    const guestLang = params.get('lang') || 'en';
    const res = await fetch(`/api/preview/${guestLang}/niveau1`);
    currentWord = await res.json();
    currentUser = { pseudo: 'Invité', revealMode: 'manual', channel: 'site' };
    setupGuestBanner(guestLang);
  } else {
    if (!email) {
      document.getElementById('loading').textContent = 'Aucun compte trouvé. Retourne à l\'accueil pour t\'inscrire.';
      return;
    }
    const res = await fetch(`/api/my-word?email=${encodeURIComponent(email)}`);
    if (!res.ok) {
      document.getElementById('loading').textContent = 'Compte introuvable.';
      return;
    }
    const data = await res.json();
    currentWord = data.word;
    currentUser = data.user;
    currentProgress = data.progress || null;
  }

  renderWord();
  renderProgress();
}

function setupGuestBanner(lang) {
  const storageKey = 'wordsip_guest_start';
  let startDate = localStorage.getItem(storageKey);
  if (!startDate) {
    startDate = new Date().toISOString();
    localStorage.setItem(storageKey, startDate);
  }
  const daysElapsed = Math.floor((Date.now() - new Date(startDate)) / 86400000) + 1;

  const banner = document.getElementById('channel-note');
  banner.style.display = 'block';

  if (daysElapsed > 7) {
    document.getElementById('content').innerHTML =
      '<div class="info-card"><p>Ton essai gratuit de 7 jours est terminé ! Inscris-toi pour continuer à recevoir un mot chaque jour.</p><a href="/" class="reveal-btn" style="display:inline-block;text-decoration:none;text-align:center;">S\'inscrire gratuitement</a></div>';
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    return;
  }

  banner.textContent = `🎟️ Mode essai — Jour ${daysElapsed} / 7`;
}

// Équivalent front-end de services/phoneticFormat.js : le champ "phonetic"
// est soit une simple chaîne (it/ja/zh), soit un objet à variantes
// régionales — {us, uk} pour l'anglais, {es, latam} pour l'espagnol, etc.
const REGION_LABELS = { us: 'US', uk: 'UK', es: 'ES', latam: 'LATAM' };

function formatPhonetic(phonetic) {
  if (!phonetic) return '';
  if (typeof phonetic === 'string') return phonetic;
  const parts = [];
  for (const [region, value] of Object.entries(phonetic)) {
    if (value) parts.push(`${REGION_LABELS[region] || region.toUpperCase()} ${value}`);
  }
  return parts.join('  ·  ');
}

// Affiche une barre de progression par niveau (mots distincts validés / mots
// disponibles à ce niveau), pour que l'utilisateur voie où il en est et soit
// encouragé à continuer. Rien n'est affiché en mode invité (pas de suivi
// persistant sans compte).
function renderProgress() {
  const section = document.getElementById('progress-section');
  if (!currentProgress || isGuest) {
    section.style.display = 'none';
    return;
  }

  const rows = LEVEL_ORDER.map((level) => {
    const p = currentProgress[level];
    if (!p || p.total === 0) return '';
    const isCurrent = currentUser && currentUser.level === level;
    const isComplete = p.percent >= 100;
    const note = isComplete
      ? '🎉 Niveau terminé, bravo !'
      : isCurrent
        ? 'Continue, tu progresses bien !'
        : '';
    return `
      <div class="progress-row">
        <div class="progress-row-head">
          <span class="level-name${isCurrent ? ' current' : ''}">${LEVEL_LABELS[level] || level}</span>
          <span class="level-pct">${p.validated}/${p.total} · ${p.percent}%</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill${isComplete ? ' complete' : ''}" style="width:${p.percent}%;"></div>
        </div>
        ${note ? `<p class="progress-row-note">${note}</p>` : ''}
      </div>
    `;
  }).join('');

  if (!rows) {
    section.style.display = 'none';
    return;
  }
  section.innerHTML = rows;
  section.style.display = 'block';
}

function renderWord() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('content').style.display = 'block';

  document.getElementById('level-badge').textContent = LEVEL_LABELS[currentWord.subLevel] || '';

  if (currentUser.channel === 'site') {
    const note = document.getElementById('channel-note');
    if (!isGuest) {
      note.style.display = 'block';
      note.textContent = "🌐 Pas d'email reçu — ton mot t'attend ici quand tu te connectes";
    }
  }

  loadExpressionOfWeek();

  document.getElementById('word-main').textContent = currentWord.word;
  document.getElementById('word-phonetic').textContent = formatPhonetic(currentWord.phonetic);
  document.getElementById('word-translation').textContent = currentWord.translation;

  // Bouton audio : joue la prononciation du mot via le service de synthèse vocale
  const playBtn = document.getElementById('play-audio-btn');
  if (playBtn) {
    playBtn.onclick = () => {
      const lang = currentUser.language || params.get('lang') || 'en';
      const audio = new Audio(`/api/tts?text=${encodeURIComponent(currentWord.word)}&lang=${lang}`);
      audio.play().catch(() => {});
    };
  }

  const examplesList = document.getElementById('examples-list');
  examplesList.innerHTML = '';
  (currentWord.examples || []).forEach((ex, i) => {
    const p = document.createElement('p');
    p.textContent = `${i + 1}. ${ex}`;
    examplesList.appendChild(p);
  });

  const g = currentWord.grammar || {};
  document.getElementById('grammar-content').innerHTML = `
    <p><strong>Nature :</strong> ${g.nature || '-'}</p>
    <p><strong>Position :</strong> ${g.position || '-'}</p>
    <p><strong>Registre :</strong> ${g.register || '-'}</p>
    <p><strong>Synonymes proches :</strong> ${g.synonyms || '-'}</p>
  `;

  const s = currentWord.slang || {};
  document.getElementById('slang-expression').innerHTML = `<strong>"${s.expression || '-'}"</strong> — ${s.meaning || ''}`;
  document.getElementById('slang-warning').textContent = s.warning ? `⚠️ ${s.warning}` : '';

  setupExercise();

  // Le lien vers la vidéo doit conserver l'email (ou le mode invité) pour que
  // le bouton "Retour" fonctionne ensuite sans perdre la session.
  const videoLink = document.getElementById('video-link');
  if (videoLink) {
    videoLink.href = `/video-semaine${window.location.search}`;
  }
  const navVideoLink = document.getElementById('nav-video-link');
  if (navVideoLink) {
    navVideoLink.href = `/video-semaine${window.location.search}`;
  }

  // Suppression de compte, cachée en mode invité (pas de vrai compte à supprimer)
  const deleteLink = document.getElementById('delete-account-link');
  if (deleteLink) {
    if (isGuest) {
      deleteLink.style.display = 'none';
    } else {
      deleteLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const confirmed = confirm(
          'Es-tu sûr(e) de vouloir supprimer ton compte ? Cette action est définitive : toutes tes données (progression, préférences) seront effacées et ne pourront pas être récupérées.'
        );
        if (!confirmed) return;

        try {
          const res = await fetch('/api/account', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });

          if (res.ok) {
            alert('Ton compte a bien été supprimé.');
            window.location.href = '/';
          } else {
            alert('Une erreur est survenue lors de la suppression.');
          }
        } catch (err) {
          alert('Erreur de connexion au serveur.');
        }
      });
    }
  }
}

function setupExercise() {
  document.getElementById('word-display').textContent = currentWord.word;
  document.getElementById('attempt-count').textContent = attemptCount;

  const revealBtn = document.getElementById('reveal-btn');
  const timerNote = document.getElementById('timer-note');
  const inputArea = document.getElementById('exercise-input-area');

  inputArea.style.display = 'none';
  document.getElementById('exercise-input').value = '';
  document.getElementById('virtual-keyboard').style.display = 'none';
  document.getElementById('exercise-feedback').textContent = '';
  document.getElementById('word-display').style.color = '';
  document.getElementById('word-display').textContent = currentWord.word;

  if (currentUser.revealMode === 'timer') {
    revealBtn.style.display = 'none';
    let seconds = currentUser.revealSeconds || 10;
    timerNote.style.display = 'block';
    timerNote.textContent = `Le mot disparaît dans ${seconds}s...`;
    const interval = setInterval(() => {
      seconds -= 1;
      timerNote.textContent = `Le mot disparaît dans ${seconds}s...`;
      if (seconds <= 0) {
        clearInterval(interval);
        hideWordAndShowInput();
      }
    }, 1000);
  } else {
    revealBtn.style.display = 'block';
    timerNote.style.display = 'none';
    revealBtn.onclick = hideWordAndShowInput;
  }
}

// --- Clavier virtuel ---
// Pour les langues latines (en/es/it), un clavier standard + la rangée de
// caractères spéciaux/accents propres à la langue (utile si le clavier
// physique de l'utilisateur ne les a pas). Pour le japonais et le chinois,
// pas de "clavier standard" pertinent : les touches sont construites à
// partir des caractères réellement utilisés dans la base de mots
// (récupérés une fois via /api/keyboard/:language, puis mis en cache).
const LATIN_ROW = ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
  'q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
  'w', 'x', 'c', 'v', 'b', 'n'];
const KEYBOARD_SPECIALS = {
  en: [],
  es: ['ñ', 'á', 'é', 'í', 'ó', 'ú', 'ü', '¿', '¡'],
  it: ['à', 'è', 'é', 'ì', 'ò', 'ù'],
};
const dynamicKeyboardCache = {};

async function getKeyboardRows(language) {
  if (language === 'ja' || language === 'zh') {
    if (!dynamicKeyboardCache[language]) {
      try {
        const res = await fetch(`/api/keyboard/${language}`);
        const data = await res.json();
        dynamicKeyboardCache[language] = data.chars || [];
      } catch (err) {
        dynamicKeyboardCache[language] = [];
      }
    }
    const chars = dynamicKeyboardCache[language];
    // Grille de 10 caractères par ligne, plus lisible qu'une seule longue rangée
    const rows = [];
    for (let i = 0; i < chars.length; i += 10) rows.push(chars.slice(i, i + 10));
    return rows;
  }

  const rows = [LATIN_ROW.slice(0, 10), LATIN_ROW.slice(10, 19), LATIN_ROW.slice(19)];
  const specials = KEYBOARD_SPECIALS[language] || [];
  if (specials.length) rows.push(specials);
  return rows;
}

function insertAtCursor(input, text) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, start) + text + input.value.slice(end);
  const newPos = start + text.length;
  input.focus();
  input.setSelectionRange(newPos, newPos);
}

async function renderVirtualKeyboard() {
  const panel = document.getElementById('virtual-keyboard');
  const language = (currentUser && currentUser.language) || 'en';
  const rows = await getKeyboardRows(language);
  const input = document.getElementById('exercise-input');

  const rowsHtml = rows.map((row) => {
    const keys = row.map((ch) => `<button type="button" class="vk-key" data-char="${ch}">${ch}</button>`).join('');
    return `<div class="vk-row">${keys}</div>`;
  }).join('');

  panel.innerHTML = `
    ${rowsHtml}
    <div class="vk-row">
      <button type="button" class="vk-key vk-wide" data-action="space">␣ espace</button>
      <button type="button" class="vk-key vk-wide" data-action="backspace">⌫ effacer</button>
    </div>
  `;

  panel.querySelectorAll('.vk-key').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'backspace') {
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        if (start === end && start > 0) {
          input.value = input.value.slice(0, start - 1) + input.value.slice(end);
          input.focus();
          input.setSelectionRange(start - 1, start - 1);
        } else {
          insertAtCursor(input, '');
        }
      } else if (action === 'space') {
        insertAtCursor(input, ' ');
      } else {
        insertAtCursor(input, btn.dataset.char);
      }
    });
  });
}

document.getElementById('keyboard-toggle-btn')?.addEventListener('click', async () => {
  const panel = document.getElementById('virtual-keyboard');
  const willShow = panel.style.display === 'none';
  if (willShow) {
    await renderVirtualKeyboard();
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
});

function hideWordAndShowInput() {
  document.getElementById('word-display').textContent = '? '.repeat(currentWord.word.length).trim();
  document.getElementById('reveal-btn').style.display = 'none';
  document.getElementById('timer-note').style.display = 'none';
  document.getElementById('exercise-input-area').style.display = 'block';
  document.getElementById('exercise-input').focus();

  // Cache aussi le mot affiché en haut de page, sinon l'exercice n'a aucun intérêt
  document.getElementById('word-main').textContent = '? '.repeat(currentWord.word.length).trim();
}

function revealWordMain() {
  document.getElementById('word-main').textContent = currentWord.word;
}

document.getElementById('check-btn')?.addEventListener('click', async () => {
  const input = document.getElementById('exercise-input').value.trim().toLowerCase();
  const answer = currentWord.word.trim().toLowerCase();
  const feedback = document.getElementById('exercise-feedback');

  if (input === answer) {
    feedback.textContent = '✅ Bravo, c\'est correct !';
    feedback.style.color = 'var(--text-success, green)';
    correctCount += 1;

    if (!isGuest && email) {
      const res = await fetch('/api/validate-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, level: currentWord.subLevel, word: currentWord.word }),
      });
      const result = await res.json();
      if (result.progress) {
        currentProgress = result.progress;
        renderProgress();
      }
    }
  } else {
    feedback.textContent = `❌ Pas tout à fait — la bonne orthographe est "${currentWord.word}"`;
    feedback.style.color = 'var(--text-danger, red)';
  }

  // On révèle à nouveau le mot en haut le temps de voir la correction,
  // avant de relancer un nouvel essai masqué juste après.
  revealWordMain();

  setTimeout(() => {
    if (attemptCount < MAX_ATTEMPTS) {
      attemptCount += 1;
      setupExercise();
    } else {
      document.getElementById('progress-note').textContent =
        `Exercice terminé : ${correctCount}/${MAX_ATTEMPTS} correct(s). Reviens demain pour un nouveau mot !`;
      document.querySelector('.exercise-card').style.display = 'none';
    }
  }, 1800);
});

document.getElementById('reveal-btn')?.addEventListener('input', () => {});

async function loadExpressionOfWeek() {
  const lang = currentUser.language || params.get('lang') || 'en';
  try {
    const res = await fetch(`/api/expression-of-week?language=${lang}`);
    if (!res.ok) return;
    const expr = await res.json();

    const banner = document.getElementById('expression-banner');
    banner.style.display = 'block';
    banner.innerHTML = `
      <p style="font-size:11px;font-weight:700;color:#8a6d00;margin-bottom:6px;">💡 EXPRESSION DE LA SEMAINE</p>
      <p style="font-weight:600;color:#17252a;">"${expr.expression}"</p>
      <p style="font-size:13px;color:#666;margin-top:4px;">🇫🇷 ${expr.meaning}</p>
    `;
  } catch (err) {
    // Silencieux : l'expression est un bonus, pas bloquant si ça échoue
  }
}

loadWord();
