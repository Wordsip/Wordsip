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
