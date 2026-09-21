const params = new URLSearchParams(window.location.search);
const email = params.get('email');
const isGuest = params.get('guest') === 'true';

fetch('/api/track-visit', { method: 'POST' }).catch(() => {});

let comparison = null;
let allComparisonGroups = [];

async function resolveLanguage() {
  if (email) {
    try {
      const res = await fetch(`/api/my-word?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.user) return data.user.language;
    } catch (err) { /* on retombe sur le param lang ci-dessous */ }
  }
  return params.get('lang') || 'en';
}

async function init() {
  const navLinks = ['nav-mot-link', 'nav-phonetique-link'];
  navLinks.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.href = `${el.getAttribute('href')}${window.location.search}`;
  });

  const language = await resolveLanguage();

  try {
    const res = await fetch(`/api/comparisons/${language}`);
    if (!res.ok) throw new Error('none');
    const data = await res.json();
    allComparisonGroups = data.groups;
  } catch (err) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('empty').style.display = 'block';
    return;
  }

  renderComparisonMenu();
  document.getElementById('loading').style.display = 'none';
}

// Menu de sélection : toutes les fiches sont visibles d'un coup, l'utilisateur
// choisit celle qu'il veut étudier — les autres restent en arrière-plan,
// accessibles via le bouton "Retour à la liste".
function renderComparisonMenu() {
  const menu = document.getElementById('comparison-menu');
  menu.innerHTML = allComparisonGroups.map((g, i) => `
    <button type="button" class="lesson-menu-item" data-index="${i}">
      <span style="font-weight:600;">${g.title}</span>
      <span style="display:block;font-size:12px;color:#999;margin-top:2px;">${g.intro.slice(0, 90)}${g.intro.length > 90 ? '…' : ''}</span>
    </button>
  `).join('');

  menu.querySelectorAll('.lesson-menu-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      comparison = allComparisonGroups[Number(btn.dataset.index)];
      renderComparison();
      menu.style.display = 'none';
      document.getElementById('content').style.display = 'block';
    });
  });

  menu.style.display = 'block';
}

document.getElementById('comparison-back-btn').addEventListener('click', () => {
  document.getElementById('content').style.display = 'none';
  document.getElementById('comparison-menu').style.display = 'block';
});

function renderComparison() {
  document.getElementById('comparison-title').textContent = comparison.title;
  document.getElementById('comparison-intro').textContent = comparison.intro;

  const itemsList = document.getElementById('items-list');
  itemsList.innerHTML = comparison.items.map((item) => `
    <section class="info-card" style="margin-top:10px;">
      <div style="display:flex;gap:12px;align-items:flex-start;">
        ${item.icon ? `<div style="width:64px;height:64px;flex-shrink:0;">${item.icon}</div>` : ''}
        <div>
          <p class="info-title">${item.word.toUpperCase()}</p>
          <p style="font-size:14px;">${item.rule}</p>
          <p style="font-size:13px;color:#666;font-style:italic;margin-top:6px;">
            ${item.examples.map((ex) => `« ${ex} »`).join('<br>')}
          </p>
        </div>
      </div>
    </section>
  `).join('');

  renderQuiz();
}

function renderQuiz() {
  const container = document.getElementById('quiz-container');
  container.innerHTML = comparison.exercises.map((ex, i) => `
    <div class="quiz-question" data-index="${i}" style="margin-bottom:14px;">
      <p style="font-size:14px;margin-bottom:6px;">${i + 1}. ${ex.sentence.replace('___', '<strong>____</strong>')}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${ex.options.map((opt) => `
          <button type="button" class="quiz-option" data-question="${i}" data-value="${opt}" data-selected="false"
            style="padding:6px 14px;border-radius:8px;border:1px solid #d0f0ee;background:white;cursor:pointer;font-size:13px;">
            ${opt}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.quiz-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.question;
      container.querySelectorAll(`.quiz-option[data-question="${q}"]`).forEach((b) => {
        b.style.background = 'white';
        b.style.borderColor = '#d0f0ee';
        b.style.color = '#333';
        b.dataset.selected = 'false';
      });
      btn.style.background = '#2b7a78';
      btn.style.borderColor = '#2b7a78';
      btn.style.color = 'white';
      btn.dataset.selected = 'true';
    });
  });
}

document.getElementById('quiz-check-btn').addEventListener('click', () => {
  const container = document.getElementById('quiz-container');
  let correct = 0;
  let answered = 0;

  comparison.exercises.forEach((ex, i) => {
    const selected = container.querySelector(`.quiz-option[data-question="${i}"][data-selected="true"]`);
    const allOptions = container.querySelectorAll(`.quiz-option[data-question="${i}"]`);

    allOptions.forEach((btn) => { btn.disabled = true; });

    if (selected) {
      answered += 1;
      const isCorrect = selected.dataset.value === ex.correct;
      if (isCorrect) {
        correct += 1;
        selected.style.background = '#1a7a3e';
        selected.style.borderColor = '#1a7a3e';
      } else {
        selected.style.background = '#c0392b';
        selected.style.borderColor = '#c0392b';
        allOptions.forEach((btn) => {
          if (btn.dataset.value === ex.correct) {
            btn.style.background = '#1a7a3e';
            btn.style.borderColor = '#1a7a3e';
            btn.style.color = 'white';
          }
        });
      }
    } else {
      allOptions.forEach((btn) => {
        if (btn.dataset.value === ex.correct) {
          btn.style.background = '#1a7a3e';
          btn.style.borderColor = '#1a7a3e';
          btn.style.color = 'white';
        }
      });
    }
  });

  const resultEl = document.getElementById('quiz-result');
  resultEl.style.display = 'block';
  resultEl.style.color = correct === comparison.exercises.length ? '#1a7a3e' : '#333';
  resultEl.textContent = `${correct} / ${comparison.exercises.length} bonnes réponses`
    + (answered < comparison.exercises.length ? ` (${comparison.exercises.length - answered} question(s) non répondue(s))` : '');

  document.getElementById('quiz-check-btn').style.display = 'none';
  document.getElementById('quiz-retry-btn').style.display = 'inline-block';
});

document.getElementById('quiz-retry-btn').addEventListener('click', () => {
  renderQuiz();
  document.getElementById('quiz-result').style.display = 'none';
  document.getElementById('quiz-check-btn').style.display = 'inline-block';
  document.getElementById('quiz-retry-btn').style.display = 'none';
});

init();

// Ouvre directement le bon onglet si l'URL le demande (ex. lien envoyé depuis
// la page mot du jour vers une fiche de cours précise).
const initialTab = params.get('tab');
if (initialTab && ['verbs', 'characters', 'lessons'].includes(initialTab)) {
  switchTab(initialTab);
}

// --- Onglets ---
document.getElementById('tab-comparison-btn').addEventListener('click', () => switchTab('comparison'));
document.getElementById('tab-verbs-btn').addEventListener('click', () => switchTab('verbs'));
document.getElementById('tab-characters-btn').addEventListener('click', () => switchTab('characters'));

function switchTab(tab) {
  const tabs = ['comparison', 'verbs', 'characters', 'lessons'];
  tabs.forEach((t) => {
    document.getElementById(`${t}-tab`).style.display = t === tab ? 'block' : 'none';
    document.getElementById(`tab-${t}-btn`).className = `tab-btn${t === tab ? ' tab-btn-active' : ''}`;
  });

  if (tab === 'verbs' && !verbsLoaded) {
    loadIrregularVerbs();
  }
  if (tab === 'characters' && !charactersLoaded) {
    loadCharacters();
  }
  if (tab === 'lessons' && !lessonsLoaded) {
    loadLessons();
  }
}
document.getElementById('tab-lessons-btn').addEventListener('click', () => switchTab('lessons'));

// --- Verbes irréguliers ---
// Un mélange de questions à choix multiple et de saisie libre, généré côté
// client à partir de la liste complète de verbes — pour que chaque session
// propose une série différente plutôt que toujours les mêmes questions.
// Le "piège" n'est pas le même selon la langue : en anglais c'est le
// prétérit/participe passé, en espagnol/italien c'est surtout le présent
// irrégulier (radical qui change) et le participe passé irrégulier.
const VERB_FORM_LABELS = {
  en: { base: 'Infinitif', past: 'prétérit (passé simple)', participle: 'participe passé' },
  es: { base: 'Infinitivo', past: 'présent, forme "yo"', participle: 'participe passé' },
  it: { base: 'Infinito', past: 'présent, forme "io"', participle: 'participe passé (passato prossimo)' },
};
// Pourquoi le japonais et le chinois n'ont pas ce contenu : le chinois n'a
// aucune conjugaison verbale (le verbe ne change jamais de forme), et le
// japonais n'a que 2 verbes véritablement irréguliers (する et 来る) — pas
// assez pour ce format d'exercice, le reste suit des règles régulières par
// groupe de verbes.
const VERB_EMPTY_REASONS = {
  ja: "Le japonais n'a que 2 verbes vraiment irréguliers (する et 来る) — pas assez pour ce format d'exercice. Le reste suit des règles régulières par groupe de verbes.",
  zh: "Le chinois n'a pas de conjugaison verbale : un verbe ne change jamais de forme, quel que soit le temps ou le sujet. Cette notion ne s'applique donc pas.",
};

let allVerbs = [];
let verbQuestions = [];
let verbsLoaded = false;
let currentVerbLanguage = 'en';
let verbsStudyMode = true;
const QUESTIONS_PER_ROUND = 10;

async function loadIrregularVerbs() {
  currentVerbLanguage = await resolveLanguage();
  try {
    const res = await fetch(`/api/irregular-verbs/${currentVerbLanguage}`);
    if (!res.ok) throw new Error('none');
    const data = await res.json();
    allVerbs = data.verbs;
  } catch (err) {
    document.getElementById('verbs-loading').style.display = 'none';
    const emptyEl = document.getElementById('verbs-empty');
    emptyEl.textContent = VERB_EMPTY_REASONS[currentVerbLanguage]
      || 'Rien de disponible pour cette langue pour le moment.';
    emptyEl.style.display = 'block';
    return;
  }

  verbsLoaded = true;
  verbsStudyMode = true;
  renderVerbStudyTable();
  document.getElementById('verbs-loading').style.display = 'none';
  document.getElementById('verbs-content').style.display = 'block';
}

// Vue "réviser" : tableau complet des verbes avec leurs formes, à parcourir
// avant de se lancer dans le quiz — pour apprendre, pas juste être testé.
function renderVerbStudyTable() {
  const labels = VERB_FORM_LABELS[currentVerbLanguage] || VERB_FORM_LABELS.en;
  const container = document.getElementById('verbs-quiz-container');

  const rows = allVerbs.map((v) => `
    <tr>
      <td style="padding:6px 8px;font-weight:600;">${v.base}</td>
      <td style="padding:6px 8px;color:#666;font-size:12px;">${v.translation}</td>
      <td style="padding:6px 8px;">${v.past}</td>
      <td style="padding:6px 8px;">${v.participle}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:2px solid #d0f0ee;text-align:left;">
            <th style="padding:6px 8px;">${labels.base}</th>
            <th style="padding:6px 8px;">Traduction</th>
            <th style="padding:6px 8px;">${labels.past}</th>
            <th style="padding:6px 8px;">${labels.participle}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  document.getElementById('verbs-quiz-check-btn').textContent = 'Je suis prêt(e), lancer le quiz';
  document.getElementById('verbs-quiz-check-btn').style.display = 'inline-block';
  document.getElementById('verbs-quiz-check-btn').onclick = startVerbQuiz;
  document.getElementById('verbs-quiz-retry-btn').style.display = 'none';
  document.getElementById('verbs-quiz-result').style.display = 'none';
}

function startVerbQuiz() {
  verbsStudyMode = false;
  buildVerbQuestions();
  renderVerbQuiz();
  document.getElementById('verbs-quiz-check-btn').textContent = 'Vérifier mes réponses';
  document.getElementById('verbs-quiz-check-btn').onclick = checkVerbQuiz;
}

// Une forme peut avoir plusieurs variantes valides séparées par "/" (ex.
// "was/were" pour be) — on les sépare pour la comparaison et l'affichage.
function formVariants(form) {
  return form.split('/').map((f) => f.trim());
}

function buildVerbQuestions() {
  const labels = VERB_FORM_LABELS[currentVerbLanguage] || VERB_FORM_LABELS.en;
  const shuffled = [...allVerbs].sort(() => Math.random() - 0.5);
  const chosen = shuffled.slice(0, Math.min(QUESTIONS_PER_ROUND, shuffled.length));

  verbQuestions = chosen.map((verb) => {
    const formKey = Math.random() < 0.5 ? 'past' : 'participle';
    const formLabel = labels[formKey];
    const type = Math.random() < 0.5 ? 'multiple_choice' : 'typed';
    const correctVariants = formVariants(verb[formKey]);

    let options = null;
    if (type === 'multiple_choice') {
      const distractorPool = allVerbs
        .filter((v) => v.base !== verb.base)
        .flatMap((v) => formVariants(v[formKey]));
      const distractors = [...new Set(distractorPool)]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      options = [...correctVariants.slice(0, 1), ...distractors].sort(() => Math.random() - 0.5);
    }

    return { base: verb.base, translation: verb.translation, formKey, formLabel, type, correctVariants, options };
  });
}

function renderVerbQuiz() {
  const container = document.getElementById('verbs-quiz-container');
  container.innerHTML = verbQuestions.map((q, i) => `
    <div class="verb-question" data-index="${i}">
      <p style="font-size:14px;margin-bottom:6px;">
        ${i + 1}. <strong>${q.base}</strong> <span style="color:#999;font-size:12px;">(${q.translation})</span>
        — donne le <strong>${q.formLabel}</strong>
      </p>
      ${q.type === 'multiple_choice'
        ? `<div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${q.options.map((opt) => `
              <button type="button" class="quiz-option verb-option" data-question="${i}" data-value="${opt}" data-selected="false"
                style="padding:6px 14px;border-radius:8px;border:1px solid #d0f0ee;background:white;cursor:pointer;font-size:13px;">
                ${opt}
              </button>
            `).join('')}
          </div>`
        : `<input type="text" class="verb-input" data-question="${i}" placeholder="Écris ta réponse...">`
      }
    </div>
  `).join('');

  container.querySelectorAll('.verb-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.question;
      container.querySelectorAll(`.verb-option[data-question="${q}"]`).forEach((b) => {
        b.style.background = 'white';
        b.style.borderColor = '#d0f0ee';
        b.style.color = '#333';
        b.dataset.selected = 'false';
      });
      btn.style.background = '#2b7a78';
      btn.style.borderColor = '#2b7a78';
      btn.style.color = 'white';
      btn.dataset.selected = 'true';
    });
  });
}

function checkVerbQuiz() {
  const container = document.getElementById('verbs-quiz-container');
  let correct = 0;

  verbQuestions.forEach((q, i) => {
    let isCorrect = false;

    if (q.type === 'multiple_choice') {
      const selected = container.querySelector(`.verb-option[data-question="${i}"][data-selected="true"]`);
      const allOptions = container.querySelectorAll(`.verb-option[data-question="${i}"]`);
      allOptions.forEach((btn) => { btn.disabled = true; });

      isCorrect = !!selected && q.correctVariants.includes(selected.dataset.value);
      allOptions.forEach((btn) => {
        if (q.correctVariants.includes(btn.dataset.value)) {
          btn.style.background = '#1a7a3e';
          btn.style.borderColor = '#1a7a3e';
          btn.style.color = 'white';
        } else if (btn === selected) {
          btn.style.background = '#c0392b';
          btn.style.borderColor = '#c0392b';
        }
      });
    } else {
      const input = container.querySelector(`.verb-input[data-question="${i}"]`);
      input.disabled = true;
      const value = input.value.trim().toLowerCase();
      isCorrect = q.correctVariants.some((v) => v.toLowerCase() === value);
      input.style.borderColor = isCorrect ? '#1a7a3e' : '#c0392b';
      input.style.background = isCorrect ? '#e8f7ee' : '#fdecea';
      if (!isCorrect) {
        const hint = document.createElement('span');
        hint.style.cssText = 'font-size:12px;color:#1a7a3e;margin-left:8px;';
        hint.textContent = `→ ${q.correctVariants.join(' / ')}`;
        input.insertAdjacentElement('afterend', hint);
      }
    }

    if (isCorrect) correct += 1;
  });

  const resultEl = document.getElementById('verbs-quiz-result');
  resultEl.style.display = 'block';
  resultEl.style.color = correct === verbQuestions.length ? '#1a7a3e' : '#333';
  resultEl.textContent = `${correct} / ${verbQuestions.length} bonnes réponses`;

  document.getElementById('verbs-quiz-check-btn').style.display = 'none';
  document.getElementById('verbs-quiz-retry-btn').style.display = 'inline-block';
}

document.getElementById('verbs-quiz-retry-btn').addEventListener('click', () => {
  // Repasse par la table de révision avant une nouvelle série, plutôt que
  // d'enchaîner directement sur un nouveau quiz à froid.
  renderVerbStudyTable();
});

// --- Fiches de caractères (japonais : hiragana/katakana, chinois : radicaux) ---
let charactersLoaded = false;
let currentCharLanguage = 'en';
let charSets = null;
let charQuestions = [];
const CHAR_QUESTIONS_PER_ROUND = 12;

const CHAR_EMPTY_REASONS = {
  en: "Les fiches de caractères concernent le japonais et le chinois — l'anglais utilise l'alphabet latin classique.",
  es: "Les fiches de caractères concernent le japonais et le chinois — l'espagnol utilise l'alphabet latin classique.",
  it: "Les fiches de caractères concernent le japonais et le chinois — l'italien utilise l'alphabet latin classique.",
};

async function loadCharacters() {
  currentCharLanguage = await resolveLanguage();
  try {
    const res = await fetch(`/api/characters/${currentCharLanguage}`);
    if (!res.ok) throw new Error('none');
    charSets = await res.json();
  } catch (err) {
    document.getElementById('characters-loading').style.display = 'none';
    const emptyEl = document.getElementById('characters-empty');
    emptyEl.textContent = CHAR_EMPTY_REASONS[currentCharLanguage]
      || 'Rien de disponible pour cette langue pour le moment.';
    emptyEl.style.display = 'block';
    return;
  }

  charactersLoaded = true;
  renderCharacterTables();
  document.getElementById('characters-loading').style.display = 'none';
  document.getElementById('characters-content').style.display = 'block';
}

// Aplati les différents jeux (hiragana/katakana, ou radicaux) en une seule
// liste homogène {char, answer, label} pour pouvoir générer le quiz sans
// dépendre de la structure exacte (qui diffère entre japonais et chinois).
function flattenCharItems() {
  if (charSets.hiragana || charSets.katakana) {
    return [
      ...(charSets.hiragana || []).map((c) => ({ char: c.char, answer: c.romaji, label: 'romaji' })),
      ...(charSets.katakana || []).map((c) => ({ char: c.char, answer: c.romaji, label: 'romaji' })),
    ];
  }
  if (charSets.radicals) {
    return charSets.radicals.map((c) => ({ char: c.char, answer: c.meaning, label: 'sens' }));
  }
  return [];
}

function renderCharacterTables() {
  const titleEl = document.getElementById('characters-title');
  const subtitleEl = document.getElementById('characters-subtitle');
  const tablesEl = document.getElementById('characters-tables');

  if (charSets.hiragana || charSets.katakana) {
    titleEl.textContent = 'Hiragana et Katakana';
    subtitleEl.textContent = 'Les 46 syllabes de base des deux alphabets phonétiques japonais.';
    tablesEl.innerHTML = ['hiragana', 'katakana'].map((setName) => {
      if (!charSets[setName]) return '';
      const cells = charSets[setName].map((c) => `
        <div style="text-align:center;padding:6px;background:white;border-radius:8px;">
          <div style="font-size:22px;">${c.char}</div>
          <div style="font-size:11px;color:#999;">${c.romaji}</div>
        </div>
      `).join('');
      return `
        <section class="info-card" style="margin-top:10px;">
          <p class="info-title">${setName === 'hiragana' ? 'ひらがな — HIRAGANA' : 'カタカナ — KATAKANA'}</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(54px, 1fr));gap:6px;margin-top:8px;">
            ${cells}
          </div>
        </section>
      `;
    }).join('');
  } else if (charSets.radicals) {
    titleEl.textContent = 'Radicaux de base (部首)';
    subtitleEl.textContent = "30 radicaux courants — les briques de base qui composent la plupart des caractères chinois.";
    tablesEl.innerHTML = `
      <section class="info-card" style="margin-top:10px;">
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="border-bottom:2px solid #d0f0ee;text-align:left;">
                <th style="padding:6px 8px;">Radical</th>
                <th style="padding:6px 8px;">Pinyin</th>
                <th style="padding:6px 8px;">Sens</th>
                <th style="padding:6px 8px;">Exemple</th>
              </tr>
            </thead>
            <tbody>
              ${charSets.radicals.map((r) => `
                <tr>
                  <td style="padding:6px 8px;font-size:20px;">${r.char}</td>
                  <td style="padding:6px 8px;color:#666;">${r.pinyin}</td>
                  <td style="padding:6px 8px;">${r.meaning}</td>
                  <td style="padding:6px 8px;color:#666;font-size:12px;">${r.example}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  document.getElementById('characters-quiz-check-btn').textContent = 'Je suis prêt(e), lancer le quiz';
  document.getElementById('characters-quiz-check-btn').onclick = startCharacterQuiz;
  document.getElementById('characters-quiz-retry-btn').style.display = 'none';
  document.getElementById('characters-quiz-result').style.display = 'none';
  document.getElementById('characters-quiz-container').innerHTML = '';
}

function startCharacterQuiz() {
  const allItems = flattenCharItems();
  const shuffled = [...allItems].sort(() => Math.random() - 0.5);
  charQuestions = shuffled.slice(0, Math.min(CHAR_QUESTIONS_PER_ROUND, shuffled.length)).map((item) => {
    const distractorPool = allItems
      .filter((i) => i.answer !== item.answer)
      .map((i) => i.answer);
    const distractors = [...new Set(distractorPool)].sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [item.answer, ...distractors].sort(() => Math.random() - 0.5);
    return { ...item, options };
  });

  const container = document.getElementById('characters-quiz-container');
  container.innerHTML = charQuestions.map((q, i) => `
    <div class="verb-question" data-index="${i}">
      <p style="font-size:22px;margin-bottom:6px;">${i + 1}. ${q.char} <span style="font-size:12px;color:#999;">(${q.label} ?)</span></p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${q.options.map((opt) => `
          <button type="button" class="quiz-option char-option" data-question="${i}" data-value="${opt}" data-selected="false"
            style="padding:6px 14px;border-radius:8px;border:1px solid #d0f0ee;background:white;cursor:pointer;font-size:13px;">
            ${opt}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.char-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.question;
      container.querySelectorAll(`.char-option[data-question="${q}"]`).forEach((b) => {
        b.style.background = 'white';
        b.style.borderColor = '#d0f0ee';
        b.style.color = '#333';
        b.dataset.selected = 'false';
      });
      btn.style.background = '#2b7a78';
      btn.style.borderColor = '#2b7a78';
      btn.style.color = 'white';
      btn.dataset.selected = 'true';
    });
  });

  document.getElementById('characters-quiz-check-btn').textContent = 'Vérifier mes réponses';
  document.getElementById('characters-quiz-check-btn').onclick = checkCharacterQuiz;
}

function checkCharacterQuiz() {
  const container = document.getElementById('characters-quiz-container');
  let correct = 0;

  charQuestions.forEach((q, i) => {
    const selected = container.querySelector(`.char-option[data-question="${i}"][data-selected="true"]`);
    const allOptions = container.querySelectorAll(`.char-option[data-question="${i}"]`);
    allOptions.forEach((btn) => { btn.disabled = true; });

    const isCorrect = !!selected && selected.dataset.value === q.answer;
    if (isCorrect) correct += 1;

    allOptions.forEach((btn) => {
      if (btn.dataset.value === q.answer) {
        btn.style.background = '#1a7a3e';
        btn.style.borderColor = '#1a7a3e';
        btn.style.color = 'white';
      } else if (btn === selected) {
        btn.style.background = '#c0392b';
        btn.style.borderColor = '#c0392b';
      }
    });
  });

  const resultEl = document.getElementById('characters-quiz-result');
  resultEl.style.display = 'block';
  resultEl.style.color = correct === charQuestions.length ? '#1a7a3e' : '#333';
  resultEl.textContent = `${correct} / ${charQuestions.length} bonnes réponses`;

  document.getElementById('characters-quiz-check-btn').style.display = 'none';
  document.getElementById('characters-quiz-retry-btn').style.display = 'inline-block';
}

document.getElementById('characters-quiz-retry-btn').addEventListener('click', () => {
  renderCharacterTables();
});

// --- Fiches de cours (marqueurs de temps / utilisation / tableau de formes) ---
let lessonsLoaded = false;
let allLessons = [];

async function loadLessons() {
  const language = await resolveLanguage();
  try {
    const res = await fetch(`/api/lessons/${language}`);
    if (!res.ok) throw new Error('none');
    const data = await res.json();
    allLessons = data.lessons;
  } catch (err) {
    document.getElementById('lessons-loading').style.display = 'none';
    document.getElementById('lessons-empty').style.display = 'block';
    return;
  }

  lessonsLoaded = true;
  renderLessonsMenu();
  document.getElementById('lessons-loading').style.display = 'none';

  // Lien direct depuis une autre page (ex. bannière "jour grammaire" sur le
  // mot du jour) : ?lesson=ID affiche directement la fiche visée, sans passer
  // par le menu.
  const preselectId = params.get('lesson');
  if (preselectId) {
    const index = allLessons.findIndex((l) => l.id === preselectId);
    if (index !== -1) showLessonDetail(index);
  }
}

// Menu de sélection : toutes les fiches sont listées, l'utilisateur choisit
// celle qu'il veut étudier — les autres passent en arrière-plan, accessibles
// via le bouton "Retour à la liste".
function renderLessonsMenu() {
  const menu = document.getElementById('lessons-menu');
  menu.innerHTML = allLessons.map((lesson, i) => `
    <button type="button" class="lesson-menu-item" data-index="${i}">
      <span style="font-weight:600;">${lesson.title}</span>
      ${lesson.subtitle ? `<span style="display:block;font-size:12px;color:#999;margin-top:2px;">${lesson.subtitle}</span>` : ''}
    </button>
  `).join('');

  menu.querySelectorAll('.lesson-menu-item').forEach((btn) => {
    btn.addEventListener('click', () => showLessonDetail(Number(btn.dataset.index)));
  });

  menu.style.display = 'block';
  document.getElementById('lessons-detail').style.display = 'none';
}

function showLessonDetail(index) {
  renderLessons([allLessons[index]]);
  document.getElementById('lessons-menu').style.display = 'none';
  document.getElementById('lessons-detail').style.display = 'block';
}

document.getElementById('lessons-back-btn').addEventListener('click', () => {
  document.getElementById('lessons-detail').style.display = 'none';
  document.getElementById('lessons-menu').style.display = 'block';
});

function renderLessons(lessons) {
  const container = document.getElementById('lessons-content');
  container.innerHTML = lessons.map((lesson) => renderLessonCard(lesson)).join('');
}

function renderLessonCard(lesson) {
  if (lesson.type === 'rule') return renderRuleLessonCard(lesson);
  if (lesson.type === 'reference') return renderReferenceLessonCard(lesson);
  return renderTenseLessonCard(lesson);
}

// Fiches "règle" : plusieurs sous-points, chacun avec une règle de sens et
// des exemples — pour les sujets qui n'ont pas de tableau de conjugaison
// (modaux, articles, voix passive, pluriels...).
function renderRuleLessonCard(lesson) {
  const sectionsHtml = lesson.sections.map((s) => `
    <section class="info-card" style="margin-top:10px;">
      <p class="info-title">${s.title.toUpperCase()}</p>
      <p style="font-size:14px;">${s.rule}</p>
      <p style="font-size:13px;color:#666;font-style:italic;margin-top:6px;">
        ${s.examples.map((ex) => `« ${ex} »`).join('<br>')}
      </p>
    </section>
  `).join('');

  return `
    <section class="word-card" style="margin-top:10px;">
      <p class="label">Fiche de cours</p>
      <h1 style="font-size:22px;">${lesson.title}</h1>
      <p style="font-size:13px;color:#555;margin-top:4px;">${lesson.subtitle || ''}</p>
    </section>
    ${sectionsHtml}
  `;
}

// Fiches "référence" : un simple tableau (ex. pronoms sujet/complément/
// possessifs), sans règle de sens à expliquer — juste une grille à consulter.
function renderReferenceLessonCard(lesson) {
  const headerHtml = lesson.table.headers.map((h) => `<th style="padding:6px 8px;">${h}</th>`).join('');
  const rowsHtml = lesson.table.rows.map((row) => `
    <tr>${row.map((cell) => `<td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${cell}</td>`).join('')}</tr>
  `).join('');

  return `
    <section class="word-card" style="margin-top:10px;">
      <p class="label">Fiche de cours</p>
      <h1 style="font-size:22px;">${lesson.title}</h1>
      <p style="font-size:13px;color:#555;margin-top:4px;">${lesson.subtitle || ''}</p>
    </section>
    <section class="info-card" style="margin-top:10px;">
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="border-bottom:2px solid #d0f0ee;text-align:left;">${headerHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderTenseLessonCard(lesson) {
  const markersHtml = lesson.timeMarkers.map((m) => `
    <li style="margin-bottom:4px;"><strong>${m.expression}</strong> — <span style="color:#666;">${m.translation}</span></li>
  `).join('');

  const usagesHtml = lesson.usages.map((u) => `
    <div style="margin-bottom:12px;">
      <p style="font-weight:600;font-size:13px;color:#2b7a78;">${u.title}</p>
      <p style="font-size:13px;margin:2px 0;">${u.description}</p>
      <p style="font-size:13px;font-style:italic;color:#666;">« ${u.example} »</p>
    </div>
  `).join('');

  const formsHtml = lesson.forms.map((form) => {
    const rows = form.rows.map((row) => `
      <tr>${row.map((cell) => `<td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;">${cell}</td>`).join('')}</tr>
    `).join('');
    return `
      <div style="flex:1;min-width:180px;">
        <p style="font-weight:600;font-size:13px;color:#2b7a78;text-align:center;margin-bottom:4px;">${form.label}</p>
        <p style="font-size:11px;color:#999;text-align:center;margin-bottom:6px;">${form.pattern}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }).join('');

  return `
    <section class="word-card" style="margin-top:10px;">
      <p class="label">Fiche de cours</p>
      <h1 style="font-size:22px;">${lesson.title}</h1>
      <p style="font-size:13px;color:#555;margin-top:4px;">${lesson.subtitle || ''}</p>
    </section>

    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;">
      <section class="info-card" style="flex:1;min-width:220px;">
        <p class="info-title">🕐 MARQUEURS DE TEMPS</p>
        <ul style="font-size:13px;padding-left:18px;margin-top:8px;">${markersHtml}</ul>
      </section>
      <section class="info-card" style="flex:1;min-width:220px;">
        <p class="info-title">✅ UTILISATION</p>
        ${usagesHtml}
      </section>
    </div>

    <section class="info-card" style="margin-top:12px;">
      <p class="info-title">⚙️ FORMES</p>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;overflow-x:auto;">
        ${formsHtml}
      </div>
    </section>
  `;
}
