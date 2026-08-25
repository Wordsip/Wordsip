let step1Data = {};

// Étape 1 → Étape 2
document.getElementById('step1-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  step1Data = Object.fromEntries(formData.entries());
  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'block';
});

// Affiche/cache le réglage de durée du minuteur
document.querySelectorAll('input[name="revealMode"]').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    document.getElementById('timer-duration').style.display =
      e.target.value === 'timer' ? 'block' : 'none';
  });
});

document.getElementById('revealSeconds')?.addEventListener('input', (e) => {
  document.getElementById('revealSecondsValue').textContent = `${e.target.value}s`;
});

// Étape 2 → Inscription finale
document.getElementById('step2-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const step2Data = Object.fromEntries(formData.entries());
  const data = { ...step1Data, ...step2Data };

  const messageEl = document.getElementById('form-message');

  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      window.location.href = `/mot-du-jour?email=${encodeURIComponent(data.email)}`;
    } else {
      messageEl.style.color = '#c0392b';
      messageEl.textContent = result.error || 'Une erreur est survenue.';
    }
  } catch (err) {
    messageEl.style.color = '#c0392b';
    messageEl.textContent = 'Erreur de connexion au serveur.';
  }
});

// Mode invité — pas d'inscription, langue par défaut anglais, suivi via le navigateur
document.getElementById('guest-trial-btn').addEventListener('click', () => {
  window.location.href = '/mot-du-jour?guest=true&lang=en';
});
