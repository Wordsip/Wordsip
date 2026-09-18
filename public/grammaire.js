const params = new URLSearchParams(window.location.search);
const email = params.get('email');
const isGuest = params.get('guest') === 'true';

fetch('/api/track-visit', { method: 'POST' }).catch(() => {});

let comparison = null;

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
    const res = await fetch(`/api/comparison/${language}`);
    if (!res.ok) throw new Error('none');
    comparison = await res.json();
  } catch (err) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('empty').style.display = 'block';
    return;
  }

  renderComparison();
  document.getElementById('loading').style.display = 'none';
  document.getElementById('content').style.display = 'block';
}

function renderComparison() {
  document.getElementById('comparison-title').textContent = comparison.title;
  document.getElementById('comparison-intro').textContent = comparison.intro;

  const itemsList = document.getElementById('items-list');
  itemsList.innerHTML = comparison.items.map((item) => `
    <section class="info-card" style="margin-top:10px;">
      <p class="info-title">${item.word.toUpperCase()}</p>
      <p style="font-size:14px;">${item.rule}</p>
      <p style="font-size:13px;color:#666;font-style:italic;margin-top:6px;">
        ${item.examples.map((ex) => `« ${ex} »`).join('<br>')}
      </p>
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

// --- Onglets ---
document.getElementById('tab-comparison-btn').addEventListener('click', () => switchTab('comparison'));
document.getElementById('tab-verbs-btn').addEventListener('click', () => switchTab('verbs'));

function switchTab(tab) {
  const isComparison = tab === 'comparison';
  document.getElementById('comparison-tab').style.display = isComparison ? 'block' : 'none';
  document.getElementById('verbs-tab').style.display = isComparison ? 'none' : 'block';
  document.getElementById('tab-comparison-btn').className = `tab-btn${isComparison ? ' tab-btn-active' : ''}`;
  document.getElementById('tab-verbs-btn').className = `tab-btn${isComparison ? '' : ' tab-btn-active'}`;

  if (!isComparison && !verbsLoaded) {
    loadIrregularVerbs();
  }
}

// --- Verbes irréguliers ---
// Un mélange de questions à choix multiple et de saisie libre, généré côté
// client à partir de la liste complète de verbes — pour que chaque session
// propose une série différente plutôt que toujours les mêmes questions.
let allVerbs = [];
let verbQuestions = [];
let verbsLoaded = false;
const QUESTIONS_PER_ROUND = 10;

async function loadIrregularVerbs() {
  const language = await resolveLanguage();
  try {
    const res = await fetch(`/api/irregular-verbs/${language}`);
    if (!res.ok) throw new Error('none');
    const data = await res.json();
    allVerbs = data.verbs;
  } catch (err) {
    document.getElementById('verbs-loading').style.display = 'none';
    document.getElementById('verbs-empty').style.display = 'block';
    return;
  }

  verbsLoaded = true;
  buildVerbQuestions();
  renderVerbQuiz();
  document.getElementById('verbs-loading').style.display = 'none';
  document.getElementById('verbs-content').style.display = 'block';
}

// Une forme peut avoir plusieurs variantes valides séparées par "/" (ex.
// "was/were" pour be) — on les sépare pour la comparaison et l'affichage.
function formVariants(form) {
  return form.split('/').map((f) => f.trim());
}

function buildVerbQuestions() {
  const shuffled = [...allVerbs].sort(() => Math.random() - 0.5);
  const chosen = shuffled.slice(0, Math.min(QUESTIONS_PER_ROUND, shuffled.length));

  verbQuestions = chosen.map((verb) => {
    const formKey = Math.random() < 0.5 ? 'past' : 'participle';
    const formLabel = formKey === 'past' ? 'prétérit (passé simple)' : 'participe passé';
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

document.getElementById('verbs-quiz-check-btn').addEventListener('click', () => {
  const container = document.getElementById('verbs-quiz-container');
  let correct = 0;

  verbQuestions.forEach((q, i) => {
    const questionEl = container.querySelector(`.verb-question[data-index="${i}"]`);
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
});

document.getElementById('verbs-quiz-retry-btn').addEventListener('click', () => {
  buildVerbQuestions();
  renderVerbQuiz();
  document.getElementById('verbs-quiz-result').style.display = 'none';
  document.getElementById('verbs-quiz-check-btn').style.display = 'inline-block';
  document.getElementById('verbs-quiz-retry-btn').style.display = 'none';
});
