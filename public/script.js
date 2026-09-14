let step1Data = {};

// Compteur de visiteurs uniques pour le panneau admin — silencieux si ça
// échoue, ne doit jamais gêner le reste de la page.
fetch('/api/track-visit', { method: 'POST' }).catch(() => {});

// Basculer entre le formulaire de connexion et le formulaire d'inscription
const loginToggle = document.getElementById('login-toggle');
const loginCard = document.getElementById('login-card');
const signupCard = document.getElementById('signup-card');
const guestOption = document.getElementById('guest-option');

// Inscriptions fermées par défaut : si c'est le cas, on cache directement le
// formulaire plutôt que de laisser quelqu'un le remplir en entier pour se
// faire rejeter à la fin. La connexion reste possible (pour le seul compte
// existant), donc on affiche seulement l'écran de connexion.
fetch('/api/signup-status').then((r) => r.json()).then(({ open }) => {
  if (!open) {
    signupCard.style.display = 'none';
    guestOption.style.display = 'none';
    loginToggle.style.display = 'none';
    loginCard.style.display = 'block';
  }
}).catch(() => {});

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

// Connexion par email : le champ mot de passe apparaît dynamiquement selon
// l'état réel du compte, détecté dès que l'email est saisi — pas besoin de
// deviner si un mot de passe existe. Si le compte n'en a pas encore, on
// propose de le créer directement ici (avec confirmation) au lieu de passer
// par la console ou l'admin.
let loginAccountStatus = null;

async function checkLoginAccountStatus() {
  const email = document.getElementById('login-email').value.trim();
  const passwordArea = document.getElementById('login-password-area');
  const confirmArea = document.getElementById('login-password-confirm-area');
  const label = document.getElementById('login-password-label');
  const passwordInput = document.getElementById('login-password');

  if (!email || !email.includes('@')) {
    passwordArea.style.display = 'none';
    loginAccountStatus = null;
    return;
  }

  try {
    const res = await fetch(`/api/account-status?email=${encodeURIComponent(email)}`);
    loginAccountStatus = await res.json();
  } catch (err) {
    loginAccountStatus = null;
    return;
  }

  if (!loginAccountStatus.exists) {
    passwordArea.style.display = 'none';
    return;
  }

  passwordArea.style.display = 'block';
  passwordInput.value = '';

  // La proposition "crée ton mot de passe toi-même" n'apparaît que pour le
  // compte wordsip@protonmail.com (seul compte concerné pour l'instant) —
  // pour un autre compte sans mot de passe, la connexion reste par email
  // seul comme avant, sans rien proposer de plus.
  const isReservedAccount = email.toLowerCase() === 'wordsip@protonmail.com';

  if (loginAccountStatus.hasPassword) {
    label.textContent = 'Mot de passe';
    confirmArea.style.display = 'none';
  } else if (isReservedAccount) {
    label.textContent = 'Crée ton mot de passe (première connexion, 8 caractères min.)';
    confirmArea.style.display = 'block';
    document.getElementById('login-password-confirm').value = '';
  } else {
    // Compte sans mot de passe et non concerné par la création en
    // libre-service : on repasse en connexion par email seul, comme avant.
    passwordArea.style.display = 'none';
  }
}
document.getElementById('login-email').addEventListener('blur', checkLoginAccountStatus);

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const messageEl = document.getElementById('login-message');
  messageEl.style.color = '';
  messageEl.textContent = '';

  // Le compte existe mais n'a pas encore de mot de passe, et le champ de
  // création est affiché : on le crée d'abord, avant la connexion elle-même.
  const creatingPassword = loginAccountStatus && loginAccountStatus.exists && !loginAccountStatus.hasPassword
    && document.getElementById('login-password-area').style.display !== 'none';

  if (creatingPassword) {
    const confirmPassword = document.getElementById('login-password-confirm').value;
    if (!password || password.length < 8) {
      messageEl.style.color = '#c0392b';
      messageEl.textContent = 'Le mot de passe doit faire au moins 8 caractères.';
      return;
    }
    if (password !== confirmPassword) {
      messageEl.style.color = '#c0392b';
      messageEl.textContent = 'Les deux mots de passe ne correspondent pas.';
      return;
    }
    try {
      const createRes = await fetch('/api/create-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const createResult = await createRes.json();
      if (!createRes.ok) {
        messageEl.style.color = '#c0392b';
        messageEl.textContent = createResult.error || 'Erreur lors de la création du mot de passe.';
        return;
      }
    } catch (err) {
      messageEl.style.color = '#c0392b';
      messageEl.textContent = 'Erreur de connexion au serveur.';
      return;
    }
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
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
  // Les jours cochés doivent être récupérés à part : getAll() renvoie bien
  // toutes les valeurs cochées, contrairement à Object.fromEntries qui n'en
  // garderait qu'une seule vu qu'elles partagent le même nom "wordDays".
  step2Data.wordDays = formData.getAll('wordDays');

  const data = { ...step1Data, ...step2Data };

  const messageEl = document.getElementById('form-message');

  if (data.wordDays.length === 0) {
    messageEl.style.color = '#c0392b';
    messageEl.textContent = 'Sélectionne au moins un jour de réception.';
    return;
  }

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
