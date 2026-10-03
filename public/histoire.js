const params = new URLSearchParams(window.location.search);
let email = params.get('email');
// Aperçu admin : toutes les histoires d'une langue, sans compte ni déblocage
const isPreview = params.get('adminPreview') === 'true' && params.get('lang');
const previewLang = params.get('lang');

['nav-mot-link', 'nav-grammaire-link', 'nav-phonetique-link', 'nav-dictee-link'].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.href = `${el.getAttribute('href')}${window.location.search}`;
});

// Connexion persistante : si l'URL n'a pas d'email mais qu'un cookie de
// session valide existe, on le récupère automatiquement (voir la même
// logique dans mot-du-jour.js pour le détail).
async function resolveSessionEmail() {
  if (email || isPreview) return;
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

const CJK = ['ja', 'zh'];
let language = 'en';
const loaded = {}; // histoires déjà chargées (id -> histoire)

function query(extra = '') {
  return isPreview
    ? `?preview=true&language=${encodeURIComponent(previewLang)}${extra}`
    : `?email=${encodeURIComponent(email)}${extra}`;
}

function showLocked(title, message) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('locked-title').textContent = title;
  document.getElementById('locked-message').innerHTML = message;
  document.getElementById('locked-content').style.display = 'block';
}

async function init() {
  await resolveSessionEmail();
  if (!email && !isPreview) {
    showLocked('🔒 CONNEXION REQUISE',
      "Les histoires se débloquent avec les mots que tu apprends — il faut un compte pour ça." +
      '<br><a href="/" class="reveal-btn" style="display:inline-block;margin-top:12px;text-decoration:none;text-align:center;">Retour à l\'accueil</a>');
    return;
  }
  try {
    const res = await fetch(`/api/stories${query()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showLocked('🔒 COMPTE INTROUVABLE', err.error || 'Impossible de charger les histoires.');
      return;
    }
    const data = await res.json();
    language = data.language;
    document.getElementById('level-badge').textContent =
      isPreview ? 'Aperçu admin' : data.level.replace('niveau', 'Niveau ');

    if (data.stories.length === 0) {
      showLocked('📖 BIENTÔT', "Il n'y a pas encore d'histoires pour cette langue et ce niveau — reviens vite !");
      return;
    }
    const unlocked = data.stories.filter((s) => s.unlocked).length;
    document.getElementById('stories-summary').textContent =
      `${unlocked} histoire${unlocked > 1 ? 's' : ''} débloquée${unlocked > 1 ? 's' : ''} sur ${data.stories.length}`;

    renderList(data.stories);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('story-list').style.display = 'block';
  } catch (err) {
    showLocked('⚠️ ERREUR', 'Une erreur est survenue, réessaie un peu plus tard.');
  }
}

function renderList(stories) {
  const list = document.getElementById('story-list');
  list.innerHTML = stories.map((s) => {
    const levelTag = isPreview ? ` · ${s.level.replace('niveau', 'Niveau ')}` : '';
    if (!s.unlocked) {
      const pct = Math.round((s.knownCount / s.needed) * 100);
      return `
        <div class="story-card locked">
          <p class="story-num">Histoire ${s.chapter}</p>
          <p class="story-title" style="color:#7c9a97;">🔒 ${s.title}</p>
          <p style="font-size:12px;margin:2px 0 0;">Apprends encore ${s.needed - s.knownCount} mot${s.needed - s.knownCount > 1 ? 's' : ''} de cette histoire pour la débloquer (${s.knownCount} / ${s.needed})</p>
          <div class="story-progress"><div style="width:${pct}%;"></div></div>
        </div>`;
    }
    return `
      <div class="story-card" id="card-${s.id}" data-id="${s.id}">
        <div class="story-head" data-head="${s.id}">
          <div>
            <p class="story-num">Histoire ${s.chapter}${levelTag}</p>
            <p class="story-title">${s.title}</p>
            <p class="story-title-fr">${s.titleFr}</p>
          </div>
          <span style="font-size:12px;color:#2b7a78;font-weight:600;">${s.knownCount} / ${s.keywordCount} mots appris ▾</span>
        </div>
        <div class="story-body" id="body-${s.id}"></div>
      </div>`;
  }).join('');

  list.querySelectorAll('[data-head]').forEach((head) => {
    head.addEventListener('click', () => toggleStory(head.dataset.head));
  });
}

async function toggleStory(id) {
  const card = document.getElementById(`card-${id}`);
  if (card.classList.contains('open')) { card.classList.remove('open'); stopAudio(); return; }
  if (!loaded[id]) {
    const res = await fetch(`/api/stories/${id}${query()}`);
    if (!res.ok) return;
    loaded[id] = (await res.json()).story;
    renderStory(loaded[id]);
  }
  card.classList.add('open');
}

function sentenceHtml(sentence) {
  return sentence.parts.map((p) => p.word ? `<b>${p.text}</b>` : p.text).join('');
}

function renderStory(story) {
  const glue = CJK.includes(language) ? '' : ' ';
  const text = story.sentences
    .map((s, i) => `<span class="s" data-s="${i}">${sentenceHtml(s)}</span>`).join(glue);
  const fr = story.sentences.map((s) => s.fr).join(' ');
  const glossary = story.glossary.map((g) => `
    <span style="${g.known ? '' : 'background:#fdece4;'}">${g.known ? '✅' : '🆕'} <b style="background:none;padding:0;">${g.word}</b> — ${g.translation}</span>`).join('');

  document.getElementById(`body-${story.id}`).innerHTML = `
    <p class="story-text" id="text-${story.id}">${text}</p>
    <div class="story-actions">
      <button type="button" data-play="${story.id}">🔊 Écouter</button>
      <button type="button" class="ghost" data-fr="${story.id}">Voir la traduction</button>
    </div>
    <p class="story-fr" id="fr-${story.id}">${fr}</p>
    <div class="story-glossary">
      <p style="font-size:11px;color:#999;margin:0 0 4px;">✅ mot déjà appris · 🆕 nouveau mot (avec sa traduction)</p>
      ${glossary}
    </div>`;

  const body = document.getElementById(`body-${story.id}`);
  body.querySelector('[data-play]').addEventListener('click', (e) => playStory(story, e.currentTarget));
  body.querySelector('[data-fr]').addEventListener('click', (e) => {
    const box = document.getElementById(`fr-${story.id}`);
    const show = box.style.display !== 'block';
    box.style.display = show ? 'block' : 'none';
    e.currentTarget.textContent = show ? 'Masquer la traduction' : 'Voir la traduction';
  });
}

// --- Audio : une requête par phrase (limite de 200 caractères côté serveur),
// jouées à la suite, la phrase en cours est surlignée.
let playToken = 0;
let currentAudio = null;
let currentBtn = null;

function clearHighlight() {
  document.querySelectorAll('.story-text .s').forEach((el) => { el.style.background = ''; });
}

function stopAudio() {
  playToken += 1;
  if (currentAudio) currentAudio.pause();
  currentAudio = null;
  if (currentBtn) currentBtn.textContent = '🔊 Écouter';
  currentBtn = null;
  clearHighlight();
}

async function playStory(story, btn) {
  const wasThisOne = currentBtn === btn;
  stopAudio();
  if (wasThisOne) return; // second clic = arrêter

  const token = playToken;
  currentBtn = btn;
  btn.textContent = '⏹ Arrêter';
  const note = document.getElementById('audio-note');
  note.style.display = 'none';

  for (let i = 0; i < story.sentences.length; i++) {
    if (token !== playToken) return;
    clearHighlight();
    const el = document.querySelector(`#text-${story.id} .s[data-s="${i}"]`);
    if (el) el.style.background = '#fff3cd';

    const ok = await new Promise((resolve) => {
      const audio = new Audio(`/api/tts?text=${encodeURIComponent(story.sentences[i].plain)}&lang=${language}`);
      currentAudio = audio;
      audio.onended = () => resolve(true);
      audio.onerror = () => resolve(false);
      audio.play().catch(() => resolve(false));
    });
    if (!ok && token === playToken) {
      note.textContent = 'Audio momentanément indisponible — réessaie dans une minute.';
      note.style.display = 'block';
      stopAudio();
      return;
    }
  }
  if (token === playToken) stopAudio();
}

init();
