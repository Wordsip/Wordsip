const params = new URLSearchParams(window.location.search);
let email = params.get('email');

fetch('/api/track-visit', { method: 'POST' }).catch(() => {});

// Connexion persistante : si l'URL n'a pas d'email mais qu'un cookie de
// session valide existe, on le récupère automatiquement (voir la même
// logique dans mot-du-jour.js pour le détail).
async function resolveSessionEmail() {
  if (email) return;
  try {
    const res = await fetch('/api/session');
    const data = await res.json();
    if (data.email) {
      email = data.email;
      const url = new URL(window.location.href);
      url.searchParams.set('email', email);
      window.history.replaceState({}, '', url);
    }
  } catch (err) { /* silencieux */ }
}

async function init() {
  await resolveSessionEmail();

  // Conserve la query string (email) sur les autres liens du menu, comme sur
  // les autres pages du site.
  ['nav-mot-link', 'nav-grammaire-link', 'nav-phonetique-link', 'nav-histoire-link'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.href = `${el.getAttribute('href')}${window.location.search}`;
  });

  if (!email) {
    showLocked(
      '🔒 CONNEXION REQUISE',
      'La dictée est réservée aux comptes inscrits — elle se base sur tes mots déjà appris. ' +
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
        const remaining = (data.unlockWords || 6) - (data.wordsLearned || 0);
        showLocked(
          '🔒 DICTÉE PAS ENCORE DISPONIBLE',
          `La dictée se débloque à partir de ${data.unlockWords || 6} mots appris, pour avoir de vrais mots à réviser. ` +
          `Tu en as <b>${data.wordsLearned || 0}</b> pour l'instant — encore <b>${remaining} mot${remaining > 1 ? 's' : ''}</b> à apprendre sur "Mon mot" !`
        );
      }
      return;
    }

    // /api/dictee ne renvoie pas la langue du compte telle quelle (elle se
    // déduit du user) : une seule requête à /api/my-word pour la récupérer,
    // avant de construire les boutons audio qui en ont besoin.
    const lang = await fetchUserLanguage();
    window.WordSipHelp?.setLanguage(lang);

    document.getElementById('level-badge').textContent = data.level.replace('niveau', 'Niveau ');

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

// Normalise pour comparer sans se faire piéger par la casse, les espaces en
// trop, ou une ponctuation finale oubliée — la dictée reste une dictée,
// mais un point final manquant ne doit pas annuler tout le reste.
function normalize(str) {
  return (str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]+$/g, '');
}

// Met en gras/surbrillance chaque mot appris là où il apparaît dans le
// texte correct (recherche insensible à la casse, sur un mot entier).
function highlightLearnedWords(text, words) {
  let html = text;
  words.forEach((w) => {
    const re = new RegExp(`\\b(${w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
    html = html.replace(re, '<b style="color:#2b7a78;background:#eaf6f5;border-radius:4px;padding:1px 3px;">$1</b>');
  });
  return html;
}

function renderDictee(data, lang) {
  document.getElementById('dictee-play-btn').onclick = () => {
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(data.text)}&lang=${lang}`);
    audio.play().catch(() => {});
  };

  document.getElementById('check-all-btn').onclick = () => checkDictee(data);
  document.getElementById('new-series-btn').onclick = () => {
    document.getElementById('dictee-content').style.display = 'none';
    document.getElementById('dictee-result').style.display = 'none';
    document.getElementById('dictee-input').value = '';
    document.getElementById('dictee-input').disabled = false;
    document.getElementById('check-all-btn').style.display = 'inline-block';
    document.getElementById('new-series-btn').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    document.getElementById('loading').textContent = 'Nouvelle dictée en préparation...';
    init();
  };
}

function checkDictee(data) {
  const input = document.getElementById('dictee-input');
  const userText = input.value;

  // Comparaison phrase par phrase (plus juste qu'un simple égal/différent
  // sur tout le texte : une seule faute ne doit pas tout faire échouer).
  const correctSentences = data.text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const userSentences = userText.split(/(?<=[.!?])\s+/).filter(Boolean);
  let correctCount = 0;
  correctSentences.forEach((s, i) => {
    if (normalize(userSentences[i]) === normalize(s)) correctCount += 1;
  });

  input.disabled = true;
  document.getElementById('check-all-btn').style.display = 'none';
  document.getElementById('new-series-btn').style.display = 'inline-block';

  const scoreLabel = document.getElementById('dictee-score-label');
  const allCorrect = correctCount === correctSentences.length;
  scoreLabel.textContent = `${allCorrect ? '✅' : '📝'} ${correctCount} / ${correctSentences.length} phrases correctes`;
  scoreLabel.style.color = allCorrect ? '#1a7a3e' : '#17252a';

  document.getElementById('dictee-correct-text').innerHTML = highlightLearnedWords(data.text, data.words);
  document.getElementById('dictee-result').style.display = 'block';
}

init();
