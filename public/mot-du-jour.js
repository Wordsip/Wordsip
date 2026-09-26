const params = new URLSearchParams(window.location.search);
const email = params.get('email');
const isGuest = params.get('guest') === 'true';
// Aperçu illimité utilisé uniquement depuis le panneau admin (menu "Aperçu
// par langue") : même mode invité, mais sans le blocage à 7 jours, pour
// pouvoir tester chaque langue autant de fois que nécessaire.
const isAdminPreview = isGuest && params.get('adminPreview') === 'true';

// Compteur de visiteurs uniques pour le panneau admin — silencieux si ça
// échoue, ne doit jamais gêner le reste de la page.
fetch('/api/track-visit', { method: 'POST' }).catch(() => {});

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
let currentAdjacent = null;

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
      document.getElementById('loading').innerHTML =
        'Aucun compte trouvé. Retourne à l\'accueil pour te connecter.' +
        '<br><a href="/" class="reveal-btn" style="display:inline-block;margin-top:14px;text-decoration:none;text-align:center;">Retour à l\'accueil</a>';
      return;
    }
    const res = await fetch(`/api/my-word?email=${encodeURIComponent(email)}`);
    if (!res.ok) {
      document.getElementById('loading').innerHTML =
        'Compte introuvable.' +
        '<br><a href="/" class="reveal-btn" style="display:inline-block;margin-top:14px;text-decoration:none;text-align:center;">Retour à l\'accueil</a>';
      return;
    }
    const data = await res.json();
    currentWord = data.word;
    currentUser = data.user;
    currentProgress = data.progress || null;
    currentAdjacent = data.adjacent || null;
  }

  renderWord();
  renderProgress();
  renderAdjacentWords();
  renderGrammarDayBanner();
}

// --- Jour spécial grammaire ---
// Certains jours (environ 1 sur 5), plutôt que d'insister uniquement sur le
// mot du jour, on propose de réviser une fiche de grammaire à la place.
// Le tirage est déterministe (email + date du jour) : le même jour, la même
// personne voit toujours le même résultat si elle recharge la page — ce
// n'est "aléatoire" qu'au sens où ça change d'un jour à l'autre.
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

async function renderGrammarDayBanner() {
  const banner = document.getElementById('grammar-day-banner');
  if (isGuest || !currentUser || !currentUser.email) {
    banner.style.display = 'none';
    return;
  }

  const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const isGrammarDay = simpleHash(`${currentUser.email}-${todayKey}`) % 5 === 0; // ~1 jour sur 5
  if (!isGrammarDay) {
    banner.style.display = 'none';
    return;
  }

  let lessons = [];
  try {
    const res = await fetch(`/api/lessons/${currentUser.language}`);
    if (!res.ok) throw new Error('none');
    const data = await res.json();
    lessons = data.lessons;
  } catch (err) {
    banner.style.display = 'none'; // pas de fiches pour cette langue, pas de bannière
    return;
  }

  // Ne propose que les fiches jusqu'au niveau atteint par l'utilisateur (un
  // niveau3 voit tout, un niveau1 ne voit que les fiches niveau1).
  const userLevelIndex = LEVEL_ORDER.indexOf(currentUser.level);
  const maxLevelIndex = userLevelIndex === -1 ? 0 : userLevelIndex;
  const eligible = lessons.filter((l) => LEVEL_ORDER.indexOf(l.level) <= maxLevelIndex);
  if (eligible.length === 0) {
    banner.style.display = 'none';
    return;
  }

  // Choix de 3 fiches (ou moins si pas assez disponibles), tirage déterministe
  // aussi pour rester cohérent si la page est rechargée le même jour.
  const shuffled = [...eligible].sort((a, b) => simpleHash(a.id + todayKey) - simpleHash(b.id + todayKey));
  const choices = shuffled.slice(0, 3);

  const choicesEl = document.getElementById('grammar-day-choices');
  choicesEl.innerHTML = choices.map((l) => `
    <a href="/grammaire?tab=lessons&lesson=${encodeURIComponent(l.id)}${window.location.search.replace('?', '&')}"
       style="display:inline-block;padding:8px 14px;background:white;border:1px solid #2b7a78;border-radius:999px;color:#2b7a78;font-size:13px;font-weight:600;text-decoration:none;">
      ${l.title}
    </a>
  `).join('');

  banner.style.display = 'block';
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

  if (isAdminPreview) {
    banner.textContent = '🛠️ Aperçu admin — langue : ' + lang.toUpperCase();
    return;
  }

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

// Affiche le mot d'hier (déjà révélé, pas de flou) et celui de demain
// (flouté, cliquable pour le dévoiler si l'utilisateur veut se donner un
// aperçu). Le clic est permanent pour la session en cours — pas de
// re-floutage automatique, une fois vu c'est vu.
function renderAdjacentWords() {
  const section = document.getElementById('adjacent-words-section');
  if (!currentAdjacent || isGuest) {
    section.style.display = 'none';
    return;
  }

  const prevEl = document.getElementById('adjacent-previous');
  const nextEl = document.getElementById('adjacent-next');

  if (currentAdjacent.previous) {
    prevEl.textContent = `${currentAdjacent.previous.word} — ${currentAdjacent.previous.translation}`;
  }

  if (currentAdjacent.next) {
    nextEl.classList.add('blurred');
    nextEl.textContent = '●●●●●●';
    nextEl.title = 'Clique pour dévoiler';
    nextEl.onclick = () => {
      nextEl.classList.remove('blurred');
      nextEl.textContent = `${currentAdjacent.next.word} — ${currentAdjacent.next.translation}`;
      nextEl.title = '';
      nextEl.onclick = null;
    };
  }

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
  document.getElementById('slang-expression').innerHTML = `<strong>"${s.expression || '-'}"</strong>`;
  document.getElementById('slang-meaning').textContent = s.meaning || '';
  document.getElementById('slang-warning').textContent = s.warning ? `⚠️ ${s.warning}` : '';

  // Bouton audio pour l'expression argotique, même mécanisme que le mot
  // principal — masqué s'il n'y a pas d'expression pour ce mot.
  const playSlangBtn = document.getElementById('play-slang-audio-btn');
  if (playSlangBtn) {
    if (s.expression) {
      playSlangBtn.style.display = '';
      playSlangBtn.onclick = () => {
        const lang = currentUser.language || params.get('lang') || 'en';
        const audio = new Audio(`/api/tts?text=${encodeURIComponent(s.expression)}&lang=${lang}`);
        audio.play().catch(() => {});
      };
    } else {
      playSlangBtn.style.display = 'none';
    }
  }

  renderAlreadyValidatedBadge();
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
  const navPhonetiqueLink = document.getElementById('nav-phonetique-link');
  if (navPhonetiqueLink) {
    navPhonetiqueLink.href = `/phonetique${window.location.search}`;
  }
  const navGrammaireLink = document.getElementById('nav-grammaire-link');
  if (navGrammaireLink) {
    navGrammaireLink.href = `/grammaire${window.location.search}`;
  }
  const navDicteeLink = document.getElementById('nav-dictee-link');
  if (navDicteeLink) {
    navDicteeLink.href = `/dictee${window.location.search}`;
  }

  // Lien vers le panneau admin, visible uniquement pour ce compte précis —
  // pour tous les autres utilisateurs, le lien reste caché comme avant.
  const navAdminLink = document.getElementById('nav-admin-link');
  if (navAdminLink && currentUser && currentUser.email
      && currentUser.email.toLowerCase() === 'wordsip@protonmail.com') {
    navAdminLink.style.display = '';
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
          let res = await fetch('/api/account', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });

          // Si le compte est protégé par un mot de passe, le serveur renvoie
          // 403 sans email — on redemande alors le mot de passe et on
          // réessaie une seule fois, plutôt que de le demander à tout le
          // monde par défaut (la grande majorité des comptes n'en ont pas).
          if (res.status === 403) {
            const password = prompt('Ce compte est protégé par un mot de passe. Entre-le pour confirmer la suppression :');
            if (password === null) return;
            res = await fetch('/api/account', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            });
          }

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

// --- Pratique du tracé à la main (japonais/chinois) ---
// Voir setupHandwritingPractice() plus bas, appelée depuis revealWordMain() —
// un canevas dédié par caractère avec le mot du jour en transparence comme
// modèle. Volontairement pas de reconnaissance d'écriture, juste un support
// visuel au tracé ; la réponse de l'exercice reste le texte tapé.

// Indique si le mot du jour affiché a déjà été validé aujourd'hui par cet
// utilisateur — en mode invité il n'y a pas de suivi persistant, donc rien
// à signaler. Sert uniquement à afficher un badge explicatif : l'exercice
// reste accessible pour s'entraîner, mais ne fera plus avancer le compteur
// tant que ce n'est pas un nouveau mot (demain).
function isWordAlreadyValidated() {
  if (isGuest || !currentUser || !currentWord) return false;
  const validated = (currentUser.validatedWords && currentUser.validatedWords[currentWord.subLevel]) || [];
  return validated.includes(currentWord.word);
}

function renderAlreadyValidatedBadge() {
  const badge = document.getElementById('already-validated-badge');
  if (!badge) return;
  badge.style.display = isWordAlreadyValidated() ? 'block' : 'none';
}

// Petit "?" à côté du titre de l'exercice : explique pourquoi le compteur
// n'augmente pas à chaque connexion (mot identique pour tout le monde un
// jour donné, +1 mot maximum par jour). Évite la confusion pour les gens
// qui se reconnectent plusieurs fois en espérant voir le compteur bouger.
document.getElementById('exercise-help-btn')?.addEventListener('click', () => {
  const popup = document.getElementById('exercise-help-popup');
  popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('exercise-help-close')?.addEventListener('click', () => {
  document.getElementById('exercise-help-popup').style.display = 'none';
});

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

  const handwritingSection = document.getElementById('handwriting-section');
  if (handwritingSection) handwritingSection.style.display = 'none';
}

// --- Pratique de l'écriture (japonais / chinois uniquement) ---
// Un canvas par caractère du mot, avec le caractère affiché en transparence
// comme guide à tracer par-dessus — pas de reconnaissance d'écriture, juste
// un support pour muscler le geste, à la manière du papier calque.
function setupHandwritingPractice() {
  const section = document.getElementById('handwriting-section');
  const language = currentUser && currentUser.language;

  if (!section || (language !== 'ja' && language !== 'zh') || !currentWord) {
    if (section) section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  const container = document.getElementById('handwriting-canvases');
  container.innerHTML = '';

  const characters = Array.from(currentWord.word).filter((ch) => ch.trim());

  characters.forEach((ch) => {
    const wrapper = document.createElement('div');
    const canvas = document.createElement('canvas');
    const size = 140;
    canvas.width = size;
    canvas.height = size;
    canvas.style.cssText = 'border:2px solid #d0f0ee;border-radius:8px;touch-action:none;background:white;';
    wrapper.appendChild(canvas);
    container.appendChild(wrapper);

    const ctx = canvas.getContext('2d');
    // Caractère en transparence, à tracer par-dessus
    ctx.font = `${size * 0.75}px sans-serif`;
    ctx.fillStyle = 'rgba(43,122,120,0.15)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, size / 2, size / 2 + 4);

    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2b7a78';

    let drawing = false;
    let last = null;

    function pos(e) {
      const rect = canvas.getBoundingClientRect();
      const point = e.touches ? e.touches[0] : e;
      return { x: point.clientX - rect.left, y: point.clientY - rect.top };
    }
    function start(e) {
      e.preventDefault();
      drawing = true;
      last = pos(e);
    }
    function move(e) {
      if (!drawing) return;
      e.preventDefault();
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    }
    function end() {
      drawing = false;
    }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);

    // Redessine le guide en transparence, sans effacer le tracé de la personne
    wrapper.dataset.redrawGuide = 'true';
    canvas._redrawGuide = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(43,122,120,0.15)';
      ctx.fillText(ch, size / 2, size / 2 + 4);
    };
  });
}

document.getElementById('handwriting-toggle-btn')?.addEventListener('click', () => {
  const pad = document.getElementById('handwriting-pad');
  const btn = document.getElementById('handwriting-toggle-btn');
  const willShow = pad.style.display === 'none';
  pad.style.display = willShow ? 'block' : 'none';
  btn.textContent = willShow ? 'Masquer le pavé d\'entraînement' : 'Afficher le pavé d\'entraînement';
});

document.getElementById('handwriting-clear-btn')?.addEventListener('click', () => {
  document.querySelectorAll('#handwriting-canvases canvas').forEach((canvas) => {
    if (canvas._redrawGuide) canvas._redrawGuide();
  });
});

function revealWordMain() {
  document.getElementById('word-main').textContent = currentWord.word;
  setupHandwritingPractice();
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
      // Met à jour localement la liste des mots validés (l'API ne renvoie que
      // le résumé de progression, pas la liste complète) pour que le badge
      // "déjà validé" apparaisse immédiatement, sans recharger la page.
      if (!currentUser.validatedWords) currentUser.validatedWords = {};
      if (!currentUser.validatedWords[currentWord.subLevel]) currentUser.validatedWords[currentWord.subLevel] = [];
      if (!currentUser.validatedWords[currentWord.subLevel].includes(currentWord.word)) {
        currentUser.validatedWords[currentWord.subLevel].push(currentWord.word);
      }
      renderAlreadyValidatedBadge();
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
