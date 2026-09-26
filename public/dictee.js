const params = new URLSearchParams(window.location.search);
const email = params.get('email');

fetch('/api/track-visit', { method: 'POST' }).catch(() => {});

let dicteeWords = [];

// Conserve la query string (email) sur les autres liens du menu, comme sur
// les autres pages du site.
['nav-mot-link', 'nav-grammaire-link', 'nav-phonetique-link'].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.href = `${el.getAttribute('href')}${window.location.search}`;
});

async function init() {
  if (!email) {
    showLocked(
      '🔒 CONNEXION REQUISE',
      'La dictée mensuelle est réservée aux comptes inscrits — elle se base sur tes mots déjà appris. ' +
      '<br><a href="/" class="reveal-btn" style="display:inline-block;margin-top:12px;text-decoration:none;text-align:center;">Retour à l\'accueil</a>'
    );
    return;
  }

  try {
    const res = await fetch(`/api/dictee?email=${encodeURIComponent(email)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showLocked('🔒 COMPTE INTROUVABLE', err.error || 'Impossible de charger ta dictée.'
        + '<br><a href="/" class="reveal-btn" style="display:inline-block;margin-top:12px;text-decoration:none;text-align:center;">Retour à l\'accueil</a>');
      return;
    }
    const data = await res.json();

    if (!data.available) {
      if (data.notEnoughWords) {
        showLocked(
          '🔒 PAS ENCORE ASSEZ DE MOTS',
          'Il n\'y a pas encore assez de mots validés ou disponibles pour composer ta dictée. Reviens un peu plus tard, après avoir appris quelques mots de plus !'
        );
      } else {
        const days = data.daysRemaining;
        showLocked(
          '🔒 DICTÉE PAS ENCORE DISPONIBLE',
          `La dictée mensuelle se débloque après ${data.unlockDays || 30} jours de compte, pour avoir de vrais mots appris à réviser. ` +
          `Encore <b>${days} jour${days > 1 ? 's' : ''}</b> avant de pouvoir la faire !`
        );
      }
      return;
    }

    // /api/dictee ne renvoie pas la langue du compte telle quelle (elle se
    // déduit du user) : une seule requête à /api/my-word pour la récupérer,
    // avant de construire les boutons audio qui en ont besoin.
    const lang = await fetchUserLanguage();

    document.getElementById('level-badge').textContent = data.level.replace('niveau', 'Niveau ');

    dicteeWords = data.words;
    renderDictee(data, lang);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('dictee-content').style.display = 'block';
  } catch (err) {
    showLocked('⚠️ ERREUR', 'Une erreur est survenue, réessaie un peu plus tard.');
  }
}

async function fetchUserLanguage() {
  try {
    const res = await fetch(`/api/my-word?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    return (data.user && data.user.language) || 'en';
  } catch (err) {
    return 'en';
  }
}

function showLocked(title, message) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('locked-title').textContent = title;
  document.getElementById('locked-message').innerHTML = message;
  document.getElementById('locked-content').style.display = 'block';
}

function normalize(str) {
  return (str || '').trim().toLowerCase();
}

function renderDictee(data, lang) {
  const list = document.getElementById('dictee-list');
  list.innerHTML = data.words.map((w, i) => `
    <div class="dictee-row" id="dictee-row-${i}" data-word="${encodeURIComponent(w.word)}">
      <button type="button" class="dictee-play-btn" data-index="${i}" title="Écouter">🔊</button>
      <input type="text" class="dictee-input" id="dictee-input-${i}" placeholder="Écris ce que tu entends...">
      ${w.isNew ? '<span class="dictee-new-badge">🆕 nouveau — niveau suivant</span>' : '<span class="dictee-new-badge" style="color:#2b7a78;background:#e6f7ec;">✅ déjà appris</span>'}
      <div class="dictee-feedback" id="dictee-feedback-${i}" style="display:none;"></div>
    </div>
  `).join('');

  list.querySelectorAll('.dictee-play-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.index);
      const audio = new Audio(`/api/tts?text=${encodeURIComponent(dicteeWords[i].word)}&lang=${lang}`);
      audio.play().catch(() => {});
    });
  });

  document.getElementById('check-all-btn').addEventListener('click', checkAll);
  document.getElementById('new-series-btn').addEventListener('click', () => {
    document.getElementById('dictee-content').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    document.getElementById('loading').textContent = 'Nouvelle série en préparation...';
    init();
  });
}

function checkAll() {
  let correct = 0;
  dicteeWords.forEach((w, i) => {
    const input = document.getElementById(`dictee-input-${i}`);
    const row = document.getElementById(`dictee-row-${i}`);
    const feedback = document.getElementById(`dictee-feedback-${i}`);
    const isCorrect = normalize(input.value) === normalize(w.word);

    row.classList.remove('correct', 'incorrect');
    row.classList.add(isCorrect ? 'correct' : 'incorrect');
    input.disabled = true;

    feedback.style.display = 'block';
    feedback.className = `dictee-feedback ${isCorrect ? 'ok' : 'ko'}`;
    feedback.textContent = isCorrect
      ? `✓ Correct ! (${w.translation})`
      : `✗ La bonne orthographe était : « ${w.word} » (${w.translation})`;

    if (isCorrect) correct += 1;
  });

  document.getElementById('check-all-btn').style.display = 'none';
  const scoreEl = document.getElementById('dictee-score');
  scoreEl.style.display = 'block';
  scoreEl.style.color = correct === dicteeWords.length ? '#1a7a3e' : '#333';
  scoreEl.textContent = `${correct} / ${dicteeWords.length} mots bien orthographiés`;
  document.getElementById('new-series-btn').style.display = 'inline-block';
}

init();
