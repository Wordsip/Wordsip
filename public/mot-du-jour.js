const params = new URLSearchParams(window.location.search);
const email = params.get('email');
const isGuest = params.get('guest') === 'true';

let currentWord = null;
let currentUser = null;
let attemptCount = 1;
const MAX_ATTEMPTS = 4;
let correctCount = 0;

const LEVEL_LABELS = {
  beginner1: 'Débutant 1', beginner2: 'Débutant 2', beginner3: 'Débutant 3',
  intermediate1: 'Intermédiaire 1', intermediate2: 'Intermédiaire 2', intermediate3: 'Intermédiaire 3',
};

async function loadWord() {
  if (isGuest) {
    // Mode invité : pas de compte, langue/niveau fixes, suivi via localStorage
    const guestLang = params.get('lang') || 'en';
    const res = await fetch(`/api/preview/${guestLang}/beginner1`);
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
  }

  renderWord();
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

  document.getElementById('word-main').textContent = currentWord.word;
  document.getElementById('word-phonetic').textContent = currentWord.phonetic || '';
  document.getElementById('word-translation').textContent = currentWord.translation;

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
}

function setupExercise() {
  document.getElementById('word-display').textContent = currentWord.word;
  document.getElementById('attempt-count').textContent = attemptCount;

  const revealBtn = document.getElementById('reveal-btn');
  const timerNote = document.getElementById('timer-note');
  const inputArea = document.getElementById('exercise-input-area');

  inputArea.style.display = 'none';
  document.getElementById('exercise-input').value = '';
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
      await fetch('/api/validate-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
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

loadWord();
