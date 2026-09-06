const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const userService = require('../services/userService');
const wordService = require('../services/wordService');
const scheduledTasks = require('../services/scheduledTasks');
const { checkEmailDomain } = require('../services/emailDomainCheck');
const blacklistService = require('../services/blacklistService');
const ttsService = require('../services/ttsService');
const expressionService = require('../services/expressionService');
const emailService = require('../services/emailService');

// Page d'accueil
router.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Page "mon mot du jour"
router.get('/mot-du-jour', (req, res) => {
  res.sendFile('mot-du-jour.html', { root: 'public' });
});

// Page vidéo de fin de semaine
router.get('/video-semaine', (req, res) => {
  res.sendFile('video-semaine.html', { root: 'public' });
});

// Page guide de prononciation
router.get('/phonetique', (req, res) => {
  res.sendFile('phonetique.html', { root: 'public' });
});

// Page admin
router.get('/admin', (req, res) => {
  res.sendFile('admin.html', { root: 'public' });
});

// Audio de prononciation (relayé depuis le serveur pour ne jamais exposer
// l'URL Google directement au navigateur, et éviter les soucis de CORS)
router.get('/api/tts', (req, res) => {
  const { text, lang } = req.query;
  if (!text) return res.status(400).json({ error: 'Texte requis.' });
  ttsService.streamTTS(text, lang || 'en', res);
});

// Dernière vidéo hebdomadaire générée + quiz associé
router.get('/api/latest-video', (req, res) => {
  const filePath = path.join(__dirname, '..', 'data', 'latest-video.json');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Aucune vidéo générée pour le moment.' });
  }
  res.json(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
});

// Expression de la semaine, pour la langue apprise par l'utilisateur connecté
router.get('/api/expression-of-week', async (req, res) => {
  try {
    const language = req.query.language || 'en';
    const expression = await expressionService.getExpressionOfWeek(language);
    if (!expression) return res.status(404).json({ error: 'Aucune expression disponible pour cette langue.' });
    res.json(expression);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Connexion (retrouver son compte existant par email, sans mot de passe)
router.post('/api/login', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userService.findByEmail(email);
    if (!user) return res.status(404).json({ error: 'Aucun compte trouvé avec cet email.' });
    res.json({ email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Tâches planifiées déclenchées en externe (cron-job.org) ---

function checkCronSecret(req, res) {
  const provided = req.query.key;
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    res.status(403).json({ error: 'Clé secrète manquante ou incorrecte.' });
    return false;
  }
  return true;
}

router.get('/api/cron/check-emails', async (req, res) => {
  if (!checkCronSecret(req, res)) return;
  try {
    const result = await scheduledTasks.checkAndSendDueEmails();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/cron/post-tweet', async (req, res) => {
  if (!checkCronSecret(req, res)) return;
  try {
    const result = await scheduledTasks.postDailyTweetTask();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/cron/weekly-video', async (req, res) => {
  if (!checkCronSecret(req, res)) return;
  try {
    const result = await scheduledTasks.generateWeeklyVideoTask();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Compte utilisateur ---

// Validation simple de format email (pas une vérification d'existence réelle,
// mais bloque au moins les formats manifestement invalides)
function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email || '');
}

router.post('/api/signup', async (req, res) => {
  const {
    pseudo, email, language, level, wordDays,
    notificationTime, channel, revealMode, revealSeconds, track,
  } = req.body;

  if (!pseudo || !email || !language) {
    return res.status(400).json({ error: 'Pseudo, email et langue sont requis.' });
  }

  if (!isValidEmailFormat(email)) {
    return res.status(400).json({ error: "Le format de l'email ne semble pas valide." });
  }

  // Le pseudo "wordsip" est réservé à l'admin (identifié par son email officiel)
  const ADMIN_EMAIL_FOR_PSEUDO = 'wordsip@protonmail.com';
  if (pseudo.trim().toLowerCase() === 'wordsip' && email.trim().toLowerCase() !== ADMIN_EMAIL_FOR_PSEUDO) {
    return res.status(403).json({ error: 'Ce pseudo est réservé.' });
  }

  // Vérifie que le domaine n'est pas une adresse jetable connue, et qu'il a
  // de vrais serveurs de messagerie configurés — sans envoyer de mail ni
  // bloquer l'utilisateur plus longtemps.
  const domainCheck = await checkEmailDomain(email);
  if (!domainCheck.valid) {
    return res.status(400).json({ error: domainCheck.reason });
  }

  // Vérifie que cette adresse précise n'a pas été bloquée manuellement par l'admin
  const isBlacklisted = await blacklistService.isBlacklisted(email);
  if (isBlacklisted) {
    return res.status(403).json({ error: 'Cette adresse email ne peut pas être utilisée.' });
  }

  try {
    const user = await userService.addUser({
      pseudo,
      email,
      language,
      level: level || 'beginner',
      wordDays,
      notificationTime: notificationTime || '08:00',
      channel: channel || 'email',
      revealMode: revealMode || 'manual',
      revealSeconds: parseInt(revealSeconds, 10) || 10,
      track: track || 'rapide',
    });

    res.status(201).json({ message: 'Inscription réussie !', user });

    // Envoi de l'email de bienvenue en arrière-plan, sans bloquer la réponse
    // ni faire échouer l'inscription si l'envoi rencontre un souci.
    emailService.sendWelcomeEmail(user).catch((err) =>
      console.error('Erreur email de bienvenue (non bloquant) :', err.message)
    );
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

router.get('/api/my-word', async (req, res) => {
  try {
    const { email } = req.query;
    const user = await userService.findByEmail(email);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const word = await wordService.getWordForUser(user);
    if (!word) return res.status(404).json({ error: 'Aucun mot disponible pour ce profil.' });

    res.json({ user, word });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/validate-word', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userService.incrementWordsValidated(email);
    res.json({ wordsValidated: user.wordsValidated });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.get('/api/preview/:language/:level', async (req, res) => {
  try {
    const { language, level } = req.params;
    const word = await wordService.getWordForUser({ language, level, wordsValidated: 0 });
    if (!word) return res.status(404).json({ error: 'Langue ou niveau non trouvé.' });
    res.json(word);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Suppression de compte par l'utilisateur lui-même — efface définitivement
// toutes ses données. Cohérent avec le reste du site : pas de mot de passe,
// juste l'email comme identifiant (comme pour la connexion).
router.delete('/api/account', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis.' });
    await userService.deleteUser(email);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// --- Administration (mots) ---

const ADMIN_EMAIL = 'wordsip@protonmail.com';

function checkAdminSecret(req, res) {
  const provided = req.query.secret || req.body.secret;
  if (!process.env.ADMIN_SECRET || provided !== process.env.ADMIN_SECRET) {
    res.status(403).json({ error: 'Accès refusé.' });
    return false;
  }
  return true;
}

// Connexion admin : vérifie l'email ET le code secret
router.post('/api/admin/login', (req, res) => {
  const { email, secret } = req.body;

  if (email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Cet email n\'a pas les droits admin.' });
  }
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Code secret incorrect.' });
  }

  res.json({ ok: true });
});

// Récupère tous les mots (pour affichage dans la page admin)
router.get('/api/admin/words', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;
  try {
    const words = await wordService.getAllWords();
    res.json(words);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajoute un nouveau mot
router.post('/api/admin/words', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;
  try {
    const { language, subLevel, wordEntry } = req.body;
    await wordService.addWord(language, subLevel, wordEntry);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modifie un mot existant
router.put('/api/admin/words', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;
  try {
    const { language, subLevel, index, wordEntry } = req.body;
    await wordService.updateWord(language, subLevel, index, wordEntry);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprime un mot
router.delete('/api/admin/words', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;
  try {
    const { language, subLevel, index } = req.body;
    await wordService.deleteWord(language, subLevel, index);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bloque/débloque un mot (sans le supprimer) — il n'est plus/plus diffusé
router.patch('/api/admin/words/toggle', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;
  try {
    const { language, subLevel, index } = req.body;
    const result = await wordService.toggleWordDisabled(language, subLevel, index);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Administration (utilisateurs) ---

// Liste tous les comptes (pour que l'admin puisse les gérer/supprimer)
router.get('/api/admin/users', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;
  try {
    const users = await userService.getAllUsers();
    // On ne renvoie que les champs utiles à l'admin, jamais les données
    // chiffrées brutes ni le détail technique interne.
    const safeUsers = users.map((u) => ({
      pseudo: u.pseudo,
      email: u.email,
      language: u.language,
      level: u.level,
      track: u.track,
      wordsValidated: u.wordsValidated,
      createdAt: u.createdAt,
    }));
    res.json(safeUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprime un compte utilisateur (admin) — efface définitivement ses données
router.delete('/api/admin/users', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;
  try {
    const { email } = req.body;
    await userService.deleteUser(email);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// --- Administration (liste noire d'emails) ---

router.get('/api/admin/blacklist', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;
  try {
    const list = await blacklistService.getBlacklist();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/admin/blacklist', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis.' });
    await blacklistService.addToBlacklist(email);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/admin/blacklist', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;
  try {
    const { email } = req.body;
    await blacklistService.removeFromBlacklist(email);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
