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
const twitterService = require('../services/twitterService');
const { rateLimit } = require('../services/rateLimiter');

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
// Limité en débit + en longueur car cette route est ouverte (pas d'auth) :
// sans ça, n'importe qui pourrait s'en servir comme proxy TTS gratuit et
// épuiser le quota de l'API non officielle de Google.
const ttsRateLimit = rateLimit({ windowMs: 60_000, max: 20 });

router.get('/api/tts', ttsRateLimit, (req, res) => {
  const { text, lang } = req.query;
  if (!text) return res.status(400).json({ error: 'Texte requis.' });
  if (text.length > 200) {
    return res.status(400).json({ error: 'Texte trop long (200 caractères max).' });
  }
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

// Indique si un compte existe et s'il a déjà un mot de passe — sert
// uniquement à afficher (ou non) le champ mot de passe sur le formulaire de
// connexion. Réservé au même compte que /api/create-password
// (wordsip@protonmail.com) : pour tout autre email, on répond toujours
// "non concerné" sans révéler si le compte existe ou a un mot de passe —
// la connexion par email seul continue de fonctionner normalement pour eux,
// juste sans jamais afficher de champ mot de passe.
router.get('/api/account-status', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email requis.' });
    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      return res.json({ exists: false, hasPassword: false });
    }
    const user = await userService.findByEmail(email);
    res.json({ exists: !!user, hasPassword: !!(user && user.passwordHash) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Permet à la personne de créer elle-même le mot de passe de son compte, la
// toute première fois seulement (si le compte n'en a pas déjà un) — pour ne
// pas avoir à passer par l'admin/la console. Réservé exclusivement au compte
// wordsip@protonmail.com : les autres comptes (s'il y en a un jour) ne
// passent que par /api/admin/set-password, décidé par l'admin, pas en
// libre-service.
router.post('/api/create-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }
    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Cette fonctionnalité est réservée à ce compte.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères.' });
    }
    const user = await userService.findByEmail(email);
    if (!user) return res.status(404).json({ error: 'Aucun compte trouvé avec cet email.' });
    if (user.passwordHash) {
      return res.status(409).json({ error: 'Ce compte a déjà un mot de passe.' });
    }
    await userService.setPassword(email, password);
    res.json({ ok: true, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Connexion (retrouver son compte existant par email). Le mot de passe n'est
// requis QUE si le compte en a un (via /api/admin/set-password) — la
// majorité des comptes restent accessibles par email seul, comme prévu.
router.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userService.findByEmail(email);
    if (!user) return res.status(404).json({ error: 'Aucun compte trouvé avec cet email.' });

    const passwordOk = await userService.verifyPassword(user, password);
    if (!passwordOk) return res.status(403).json({ error: 'Mot de passe incorrect.' });

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

// Route de test réservée à l'admin : force une tentative de publication
// immédiate, sans tenir compte du jour (contrairement à /api/cron/post-tweet
// qui ne poste que lundi/vendredi). Utile pour diagnostiquer une erreur
// Twitter/X (ex. 403) sans attendre le prochain jour de publication.
// Exemple : /api/admin/test-tweet?secret=TON_ADMIN_SECRET
router.get('/api/admin/test-tweet', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;
  try {
    const code = 'en';
    const label = 'English';
    const featuredWord = await wordService.getFeaturedWordOfDay(code);
    if (!featuredWord) return res.status(404).json({ error: `Aucun mot disponible pour ${label}.` });

    const result = await twitterService.postDailyTweet(featuredWord, label, code);
    res.json({ language: code, word: featuredWord.word, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Migration ponctuelle : réimporte data/words.seed.json dans MongoDB,
// nécessaire une seule fois après le passage à la structure à 3 niveaux
// (niveau1/niveau2/niveau3) puisque la base existante gardait l'ancienne
// structure (beginner1/beginner2...). ⚠️ Écrase les mots ajoutés depuis
// l'admin qui ne seraient pas dans le fichier seed local.
// Exemple : /api/admin/reseed-words?secret=TON_ADMIN_SECRET
router.get('/api/admin/reseed-words', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;
  try {
    const result = await wordService.reseedFromFile();
    res.json({ success: true, ...result });
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

router.get('/api/signup-status', (req, res) => {
  res.json({ open: process.env.ALLOW_SIGNUPS === 'true' });
});

router.post('/api/signup', async (req, res) => {
  // Inscriptions fermées par défaut (site personnel, un seul compte prévu) :
  // pour rouvrir un jour, définir ALLOW_SIGNUPS=true sur Render.
  if (process.env.ALLOW_SIGNUPS !== 'true') {
    return res.status(403).json({ error: 'Les inscriptions sont actuellement fermées.' });
  }

  const {
    pseudo, email, language, level, wordDays,
    notificationTime, channel, revealMode, revealSeconds,
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
      level: level || 'niveau1',
      wordDays,
      notificationTime: notificationTime || '08:00',
      channel: channel || 'email',
      revealMode: revealMode || 'manual',
      revealSeconds: parseInt(revealSeconds, 10) || 10,
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

    const levelWordCounts = await wordService.getLevelWordCounts(user.language);
    const progress = userService.computeProgress(user, levelWordCounts);
    const adjacent = await wordService.getAdjacentWordsForUser(user);

    res.json({ user: userService.toSafeUser(user), word, progress, adjacent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/validate-word', async (req, res) => {
  try {
    const { email, level, word } = req.body;
    await userService.incrementWordsValidated(email);
    // level/word sont fournis par le client à partir du mot affiché à
    // l'écran : si absents (anciens clients non mis à jour), on garde
    // seulement le compteur global sans casser la validation.
    let user;
    if (level && word) {
      user = await userService.markWordValidated(email, level, word);
    } else {
      user = await userService.findByEmail(email);
    }
    const levelWordCounts = await wordService.getLevelWordCounts(user.language);
    const progress = userService.computeProgress(user, levelWordCounts);
    res.json({ wordsValidated: user.wordsValidated, progress });
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

// Caractères disponibles pour le clavier virtuel d'une langue (japonais et
// chinois surtout, où l'utilisateur n'a généralement pas de clavier physique
// adapté). Ne renvoie que ce qui est effectivement utilisé dans la base de
// mots, pour rester un clavier compact et pertinent plutôt qu'un IME complet.
router.get('/api/keyboard/:language', async (req, res) => {
  try {
    const chars = await wordService.getUniqueCharacters(req.params.language);
    res.json({ chars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Suppression de compte par l'utilisateur lui-même — efface définitivement
// toutes ses données. Cohérent avec le reste du site : pas de mot de passe,
// juste l'email comme identifiant (comme pour la connexion).
router.delete('/api/account', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis.' });

    // Si le compte a un mot de passe (protection manuelle par l'admin), il
    // est requis pour supprimer le compte — pas seulement pour se connecter.
    // Sans ça, n'importe qui devinant l'email pourrait supprimer un compte
    // protégé sans jamais avoir besoin du mot de passe.
    const user = await userService.findByEmail(email);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    const passwordOk = await userService.verifyPassword(user, password);
    if (!passwordOk) return res.status(403).json({ error: 'Mot de passe incorrect.' });

    await userService.deleteUser(email);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// --- Administration (mots) ---

const ADMIN_EMAIL = 'wordsip@protonmail.com';

// Le secret admin est lu depuis un header (x-admin-secret), jamais depuis
// l'URL : les query strings finissent dans les logs du serveur/du proxy et
// dans l'historique du navigateur, ce qu'on veut éviter pour un secret.
// On garde une compatibilité avec l'ancien format (query/body) le temps que
// tout le monde recharge la page admin, mais le header est la méthode
// recommandée et c'est ce que public/admin.js utilise désormais.
function checkAdminSecret(req, res) {
  const provided = req.get('x-admin-secret') || req.query.secret || req.body.secret;
  if (!process.env.ADMIN_SECRET || provided !== process.env.ADMIN_SECRET) {
    res.status(403).json({ error: 'Accès refusé.' });
    return false;
  }
  return true;
}

// Recrée un compte de A à Z en un seul appel admin, sans passer par le
// formulaire public ni toucher ALLOW_SIGNUPS sur Render : réutilise l'ancien
// compte s'il existe (garde sa progression : wordsValidated/validatedWords),
// sinon en crée un nouveau, puis applique les préférences et pose le mot de
// passe. Contourne intentionnellement la fermeture des inscriptions puisque
// c'est toi qui l'appelles avec le secret admin.
// Exemple : POST /api/admin/recreate-account
// { "pseudo":"wordsip", "email":"wordsip@protonmail.com", "language":"en",
//   "level":"niveau1", "wordDays":["mon","tue","wed","thu","fri"],
//   "password":"..." }
router.post('/api/admin/recreate-account', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;
  try {
    const {
      pseudo, email, language, level, wordDays,
      notificationTime, channel, revealMode, revealSeconds, password,
    } = req.body;

    if (!pseudo || !email || !language || !password) {
      return res.status(400).json({ error: 'pseudo, email, language et password sont requis.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères.' });
    }

    // Garde la progression de l'ancien compte s'il existe, avant de le
    // supprimer — pour ne jamais silencieusement remettre l'utilisateur à
    // 0% comme c'est arrivé une fois avant ce correctif.
    const existing = await userService.findByEmail(email);
    const previousProgress = existing
      ? { wordsValidated: existing.wordsValidated || 0, validatedWords: existing.validatedWords || {} }
      : null;

    await userService.deleteUser(email).catch(() => {});

    const user = await userService.addUser({
      pseudo,
      email,
      language,
      level: level || 'niveau1',
      wordDays: wordDays || ['mon', 'tue', 'wed', 'thu', 'fri'],
      notificationTime: notificationTime || '08:00',
      channel: channel || 'email',
      revealMode: revealMode || 'manual',
      revealSeconds: parseInt(revealSeconds, 10) || 10,
    });

    if (previousProgress) {
      await userService.restoreProgress(email, previousProgress);
    }

    await userService.setPassword(email, password);

    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Définit ou change le mot de passe d'un compte — réservé à l'admin, pas de
// flux public. Sert notamment à protéger le compte wordsip@protonmail.com
// (email facile à deviner puisqu'il est visible partout dans l'app) contre
// une connexion par une autre personne que toi.
// Exemple : POST /api/admin/set-password  { "email": "...", "password": "..." }
router.post('/api/admin/set-password', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères.' });
    }
    await userService.setPassword(email, password);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

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
