let quizData = null;
const selectedWords = new Set();

async function loadWeeklyVideo() {
  const loading = document.getElementById('loading');
  const content = document.getElementById('video-content');

  try {
    const res = await fetch('/api/latest-video');
    if (!res.ok) {
      loading.textContent = 'Aucune vidéo disponible pour le moment — reviens dimanche soir !';
      return;
    }

    quizData = await res.json();
    loading.style.display = 'none';
    content.style.display = 'block';

    document.getElementById('weekly-video').src = quizData.videoUrl;
    renderQuizOptions();
  } catch (err) {
    loading.textContent = 'Impossible de charger la vidéo pour le moment.';
  }
}

function renderQuizOptions() {
  const container = document.getElementById('quiz-options');
  container.innerHTML = '';

  quizData.quizOptions.forEach((word) => {
    const btn = document.createElement('button');
    btn.textContent = word;
    btn.className = 'quiz-option-btn';
    btn.style.cssText = 'width:100%;margin-bottom:6px;background:white;color:#17252a;border:1.5px solid #dceeed;';
    btn.addEventListener('click', () => {
      if (selectedWords.has(word)) {
        selectedWords.delete(word);
        btn.style.borderColor = '#dceeed';
        btn.style.background = 'white';
      } else {
        selectedWords.add(word);
        btn.style.borderColor = '#2b7a78';
        btn.style.background = '#eaf5ff';
      }
    });
    container.appendChild(btn);
  });
}

document.getElementById('quiz-check-btn')?.addEventListener('click', () => {
  const feedback = document.getElementById('quiz-feedback');
  const correct = new Set(quizData.correctWords);
  const selected = selectedWords;

  const allCorrectSelected = [...correct].every((w) => selected.has(w));
  const noExtraSelected = [...selected].every((w) => correct.has(w));

  if (allCorrectSelected && noExtraSelected) {
    feedback.textContent = `✅ Bravo ! Les mots étaient bien : ${quizData.correctWords.join(', ')}`;
    feedback.style.color = 'green';
  } else {
    feedback.textContent = `❌ Pas tout à fait — les bons mots étaient : ${quizData.correctWords.join(', ')}`;
    feedback.style.color = '#c0392b';
  }
});

loadWeeklyVideo();
