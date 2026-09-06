let adminSecret = null;

const LEVEL_LABELS = {
  beginner1: 'Débutant 1', beginner2: 'Débutant 2', beginner3: 'Débutant 3',
  beginner4: 'Débutant 4', beginner5: 'Débutant 5',
  intermediate1: 'Intermédiaire 1', intermediate2: 'Intermédiaire 2', intermediate3: 'Intermédiaire 3',
  intermediate4: 'Intermédiaire 4', intermediate5: 'Intermédiaire 5',
};

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

  const wordEntry = {
    word: document.getElementById('add-word').value,
    phonetic: document.getElementById('add-phonetic').value,
    translation: document.getElementById('add-translation').value,
    examples,
    grammar,
    slang,
  };

  const body = {
    secret: adminSecret,
    language: document.getElementById('add-language').value,
    subLevel: document.getElementById('add-sublevel').value,
    wordEntry,
  };

  try {
    const res = await fetch('/api/admin/words', {
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
  const res = await fetch(`/api/admin/words?secret=${encodeURIComponent(adminSecret)}`);
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
  const res = await fetch('/api/admin/words/toggle', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: adminSecret, language, subLevel, index }),
  });

  if (res.ok) {
    loadWords();
  } else {
    alert('Erreur lors du blocage/déblocage.');
  }
}

async function deleteWord(language, subLevel, index) {
  if (!confirm('Supprimer ce mot définitivement ?')) return;

  const res = await fetch('/api/admin/words', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: adminSecret, language, subLevel, index }),
  });

  if (res.ok) {
    loadWords();
  } else {
    alert('Erreur lors de la suppression.');
  }
}

// --- Utilisateurs ---

async function loadUsers() {
  const res = await fetch(`/api/admin/users?secret=${encodeURIComponent(adminSecret)}`);
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
          <p style="font-size:11px;color:#666;">${u.language} · ${u.level} · ${u.track} · ${u.wordsValidated} mots validés</p>
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

  const res = await fetch('/api/admin/users', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: adminSecret, email }),
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

  const res = await fetch('/api/admin/blacklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: adminSecret, email }),
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
  const res = await fetch(`/api/admin/blacklist?secret=${encodeURIComponent(adminSecret)}`);
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
  const res = await fetch('/api/admin/blacklist', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: adminSecret, email }),
  });

  if (res.ok) {
    loadBlacklist();
  } else {
    alert('Erreur lors du déblocage.');
  }
}
