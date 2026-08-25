const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const wordService = require('../services/wordService');

// Page d'accueil
router.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Page "mon mot du jour" (après inscription, ou en mode invité côté front)
router.get('/mot-du-jour', (req, res) => {
  res.sendFile('mot-du-jour.html', { root: 'public' });
});

// Page vidéo de fin de semaine
router.get('/video-semaine', (req, res) => {
  res.sendFile('video-semaine.html', { root: 'public' });
});

// Dernière vidéo hebdomadaire générée + quiz associé
router.get('/api/latest-video', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '..', 'data', 'latest-video.json');

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Aucune vidéo générée pour le moment.' });
  }

  res.json(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
});

// Inscription
router.post('/api/signup', (req, res) => {
  const {
    pseudo, email, language, level, wordsPerWeek,
    notificationTime, channel, revealMode, revealSeconds, track,
  } = req.body;

  if (!pseudo || !email || !language) {
    return res.status(400).json({ error: 'Pseudo, email et langue sont requis.' });
  }

  try {
    const user = userService.addUser({
      pseudo,
      email,
      language,
      level: level || 'beginner',
      wordsPerWeek: parseInt(wordsPerWeek, 10) || 3,
      notificationTime: notificationTime || '08:00',
      channel: channel || 'email',
      revealMode: revealMode || 'manual',
      revealSeconds: parseInt(revealSeconds, 10) || 10,
      track: track || 'rapide',
    });
    res.status(201).json({ message: 'Inscription réussie !', user });
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

// Mot du jour + infos de progression pour un utilisateur inscrit
router.get('/api/my-word', (req, res) => {
  const { email } = req.query;
  const user = userService.findByEmail(email);

  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

  const word = wordService.getWordForUser(user);
  if (!word) return res.status(404).json({ error: 'Aucun mot disponible pour ce profil.' });

  res.json({ user, word });
});

// Validation d'une tentative de l'exercice d'écriture (fait progresser le sous-niveau)
router.post('/api/validate-word', (req, res) => {
  const { email } = req.body;

  try {
    const user = userService.incrementWordsValidated(email);
    res.json({ wordsValidated: user.wordsValidated });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Aperçu du mot du jour pour le mode invité (sans inscription, langue/niveau fixes)
router.get('/api/preview/:language/:level', (req, res) => {
  const { language, level } = req.params;
  const word = wordService.getWordForUser({ language, level, wordsValidated: 0 });

  if (!word) {
    return res.status(404).json({ error: 'Langue ou niveau non trouvé.' });
  }

  res.json(word);
});

module.exports = router;
