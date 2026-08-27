let step1Data = {};

// Basculer entre le formulaire de connexion et le formulaire d'inscription
const loginToggle = document.getElementById('login-toggle');
const loginCard = document.getElementById('login-card');
const signupCard = document.getElementById('signup-card');
const guestOption = document.getElementById('guest-option');

loginToggle.addEventListener('click', (e) => {
  e.preventDefault();
  const showingLogin = loginCard.style.display === 'block';

  if (showingLogin) {
    loginCard.style.display = 'none';
    signupCard.style.display = 'block';
    guestOption.style.display = 'block';
    loginToggle.textContent = 'Déjà inscrit ? Se connecter';
  } else {
    loginCard.style.display = 'block';
    signupCard.style.display = 'none';
    guestOption.style.display = 'none';
    loginToggle.textContent = 'Pas encore de compte ? S\'inscrire';
  }
});

// Connexion par email (retrouve le compte existant, sans mot de passe)
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const messageEl = document.getElementById('login-message');

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (response.ok) {
      window.location.href = `/mot-du-jour?email=${encodeURIComponent(email)}`;
    } else {
      messageEl.style.color = '#c0392b';
      messageEl.textContent = result.error || 'Une erreur est survenue.';
    }
  } catch (err) {
    messageEl.style.color = '#c0392b';
    messageEl.textContent = 'Erreur de connexion au serveur.';
  }
});

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
