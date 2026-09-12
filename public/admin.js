let adminSecret = null;

// Envoie le secret admin dans un header plutôt que dans l'URL ou le corps :
// une query string finit dans les logs serveur/proxy et dans l'historique
// du navigateur, ce qu'on veut éviter pour un secret. Toutes les requêtes
// admin passent par cette fonction pour garder ça cohérent partout.
function adminFetch(url, options = {}) {
  const headers = { ...(options.headers || {}), 'x-admin-secret': adminSecret };
  return fetch(url, { ...options, headers });
}

const LEVEL_LABELS = {
  niveau1: 'Niveau 1 — Collège (6e-5e-4e)',
  niveau2: 'Niveau 2 — Lycée (3e-2nde-1re-Tle)',
  niveau3: 'Niveau 3 — Fac / Master / Pro',
};

// Chaque langue a ses propres clés de variante régionale pour la phonétique
// (ou une seule variante pour les langues qui n'en ont pas deux). Détermine
// les libellés affichés dans le formulaire d'ajout de mot selon la langue
// choisie, pour que l'admin sache ce qu'il remplit.
const PHONETIC_REGIONS = {
  en: { key1: 'us', key2: 'uk', label1: 'Phonétique US', label2: 'Phonétique UK' },
  es: { key1: 'es', key2: 'latam', label1: 'Phonétique Espagne', label2: 'Phonétique Amérique latine' },
};

function updatePhoneticLabels() {
  const lang = document.getElementById('add-language').value;
  const regions = PHONETIC_REGIONS[lang];
  document.getElementById('add-phonetic-label-1').textContent = regions ? regions.label1 : 'Phonétique';
  const label2 = document.getElementById('add-phonetic-label-2');
  const input2 = document.getElementById('add-phonetic-2');
  label2.style.display = regions ? '' : 'none';
  input2.style.display = regions ? '' : 'none';
}
document.getElementById('add-language').addEventListener('change', updatePhoneticLabels);
updatePhoneticLabels();

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('admin-email').value;
  const secret = document.getElementById('admin-secret').value;
  const messageEl = document.getElementById('admin-login-message');

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, secret }),
    });
    const result = await res.json();

    if (res.ok) {
      adminSecret = secret;
      document.getElementById('admin-login').style.display = 'none';
      document.getElementById('admin-panel').style.display = 'block';
      loadWords();
      loadUsers();
      loadBlacklist();
    } else {
      messageEl.textContent = result.error;
      messageEl.style.color = '#c0392b';
    }
  } catch (err) {
    messageEl.textContent = 'Erreur de connexion.';
    messageEl.style.color = '#c0392b';
  }
});

document.getElementById('add-word-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const messageEl = document.getElementById('add-word-message');

  const examples = document.getElementById('add-examples').value
    .split('\n').map((s) => s.trim()).filter(Boolean);

  let grammar = {};
  let slang = {};
  try {
    const grammarRaw = document.getElementById('add-grammar').value.trim();
    if (grammarRaw) grammar = JSON.parse(grammarRaw);
  } catch (err) {
    messageEl.textContent = 'Le champ Grammaire doit être un JSON valide.';
    messageEl.style.color = '#c0392b';
    return;
  }
  try {
    const slangRaw = document.getElementById('add-slang').value.trim();
    if (slangRaw) slang = JSON.parse(slangRaw);
  } catch (err) {
    messageEl.textContent = 'Le champ Argot doit être un JSON valide.';
    messageEl.style.color = '#c0392b';
    return;
  }

  // Phonétique : construit l'objet avec les bonnes clés régionales selon la
  // langue (us/uk pour l'anglais, es/latam pour l'espagnol...), ou une simple
  // chaîne si la langue n'a qu'une seule variante ou si la 2e n'est pas remplie.
  const lang = document.getElementById('add-language').value;
  const regions = PHONETIC_REGIONS[lang];
  const value1 = document.getElementById('add-phonetic-1').value.trim();
  const value2 = document.getElementById('add-phonetic-2').value.trim();
  const phonetic = (regions && value2)
    ? { [regions.key1]: value1, [regions.key2]: value2 }
    : value1;

  const wordEntry = {
    word: document.getElementById('add-word').value,
    phonetic,
    translation: document.getElementById('add-translation').value,
    examples,
    grammar,
    slang,
  };

  const body = {
    language: document.getElementById('add-language').value,
    subLevel: document.getElementById('add-sublevel').value,
    wordEntry,
  };

  try {
    const res = await adminFetch('/api/admin/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await res.json();

    if (res.ok) {
      messageEl.textContent = '✅ Mot ajouté avec succès !';
      messageEl.style.color = 'green';
      e.target.reset();
      loadWords();
    } else {
      messageEl.textContent = result.error;
      messageEl.style.color = '#c0392b';
    }
  } catch (err) {
    messageEl.textContent = 'Erreur lors de l\'ajout.';
    messageEl.style.color = '#c0392b';
  }
});

document.getElementById('filter-language').addEventListener('change', loadWords);

async function loadWords() {
  const language = document.getElementById('filter-language').value;
  const res = await adminFetch('/api/admin/words');
  const allWords = await res.json();
  const languageWords = allWords[language] || {};

  const container = document.getElementById('words-list');
  container.innerHTML = '';

  Object.entries(languageWords).forEach(([subLevel, words]) => {
    if (!Array.isArray(words) || words.length === 0) return;

    const heading = document.createElement('h3');
    heading.style.cssText = 'font-size:14px;margin:16px 0 8px;color:#2b7a78;';
    heading.textContent = `${LEVEL_LABELS[subLevel] || subLevel} — ordre de diffusion`;
    container.appendChild(heading);

    words.forEach((w, index) => {
      const row = document.createElement('div');
      row.className = 'word-row';
      if (w.disabled) row.style.cssText = 'opacity:0.5;background:#f5f5f5;';
      row.innerHTML = `
        <div class="word-row-header">
          <span><span style="color:#999;font-size:12px;">#${index + 1}</span> <strong>${w.word}</strong> — ${w.translation} ${w.disabled ? '<span style="color:#c0392b;font-size:11px;font-weight:600;">(BLOQUÉ)</span>' : ''}</span>
          <div class="word-row-actions">
            <button onclick="toggleWord('${language}', '${subLevel}', ${index})" style="background:${w.disabled ? '#2b7a78' : '#e0a800'};">${w.disabled ? 'Débloquer' : 'Bloquer'}</button>
            <button onclick="deleteWord('${language}', '${subLevel}', ${index})" style="background:#c0392b;">Supprimer</button>
          </div>
        </div>
        <p style="font-size:12px;color:#666;margin-top:4px;">${(w.examples || []).join(' | ')}</p>
      `;
      container.appendChild(row);
    });
  });

  if (container.innerHTML === '') {
    container.innerHTML = '<p style="color:#999;font-size:13px;">Aucun mot pour cette langue pour le moment.</p>';
  }
}

async function toggleWord(language, subLevel, index) {
  const res = await adminFetch('/api/admin/words/toggle', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, subLevel, index }),
  });

  if (res.ok) {
    loadWords();
  } else {
    alert('Erreur lors du blocage/déblocage.');
  }
}

async function deleteWord(language, subLevel, index) {
  if (!confirm('Supprimer ce mot définitivement ?')) return;

  const res = await adminFetch('/api/admin/words', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, subLevel, index }),
  });

  if (res.ok) {
    loadWords();
  } else {
    alert('Erreur lors de la suppression.');
  }
}

// --- Utilisateurs ---

async function loadUsers() {
  const res = await adminFetch('/api/admin/users');
  const users = await res.json();
  const container = document.getElementById('users-list');
  container.innerHTML = '';

  if (users.length === 0) {
    container.innerHTML = '<p style="color:#999;font-size:13px;">Aucun utilisateur inscrit pour le moment.</p>';
    return;
  }

  users.forEach((u) => {
    const row = document.createElement('div');
    row.className = 'word-row';
    row.innerHTML = `
      <div class="word-row-header">
        <div>
          <strong>${u.pseudo}</strong> — ${u.email}
          <p style="font-size:11px;color:#666;">${u.language} · ${LEVEL_LABELS[u.level] || u.level} · ${u.wordsValidated} mots validés</p>
        </div>
        <div class="word-row-actions">
          <button onclick="deleteUser('${u.email}')" style="background:#c0392b;">Supprimer</button>
        </div>
      </div>
    `;
    container.appendChild(row);
  });
}

async function deleteUser(email) {
  if (!confirm(`Supprimer définitivement le compte ${email} et toutes ses données ?`)) return;

  const res = await adminFetch('/api/admin/users', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (res.ok) {
    loadUsers();
  } else {
    alert('Erreur lors de la suppression.');
  }
}

// --- Liste noire d'emails ---

document.getElementById('blacklist-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('blacklist-email').value;
  const messageEl = document.getElementById('blacklist-message');

  const res = await adminFetch('/api/admin/blacklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (res.ok) {
    messageEl.textContent = `✅ ${email} a été bloqué.`;
    messageEl.style.color = 'green';
    e.target.reset();
    loadBlacklist();
  } else {
    messageEl.textContent = 'Erreur lors du blocage.';
    messageEl.style.color = '#c0392b';
  }
});

async function loadBlacklist() {
  const res = await adminFetch('/api/admin/blacklist');
  const list = await res.json();
  const container = document.getElementById('blacklist-list');
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = '<p style="color:#999;font-size:13px;">Aucune adresse bloquée pour le moment.</p>';
    return;
  }

  list.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'word-row';
    row.innerHTML = `
      <div class="word-row-header">
        <span>${entry.email}</span>
        <button onclick="removeFromBlacklist('${entry.email}')" style="width:auto;padding:5px 10px;font-size:12px;">Débloquer</button>
      </div>
    `;
    container.appendChild(row);
  });
}

async function removeFromBlacklist(email) {
  const res = await adminFetch('/api/admin/blacklist', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (res.ok) {
    loadBlacklist();
  } else {
    alert('Erreur lors du déblocage.');
  }
}
