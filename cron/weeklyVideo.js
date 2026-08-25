const cron = require('node-cron');
const dialogueService = require('../services/dialogueService');
const videoService = require('../services/videoService');
const fs = require('fs');
const path = require('path');

const LATEST_VIDEO_FILE = path.join(__dirname, '..', 'data', 'latest-video.json');
const FEATURED_LANGUAGE = 'en';

async function generateAndSaveWeeklyVideo() {
  console.log('Génération de la vidéo hebdomadaire en cours...');

  const dialogue = dialogueService.buildWeeklyDialogue(FEATURED_LANGUAGE);
  if (!dialogue) {
    console.log('Pas assez de mots disponibles pour générer le dialogue.');
    return;
  }

  try {
    const videoUrl = await videoService.generateWeeklyVideo(dialogue, FEATURED_LANGUAGE);
    fs.writeFileSync(LATEST_VIDEO_FILE, JSON.stringify({
      videoUrl,
      quizOptions: dialogue.quizOptions,
      correctWords: dialogue.correctWords,
      generatedAt: new Date().toISOString(),
    }, null, 2));
    console.log('Vidéo hebdomadaire générée avec succès :', videoUrl);
  } catch (err) {
    console.error('Erreur lors de la génération de la vidéo :', err.message);
  }
}

function startWeeklyVideoGenerator() {
  // Tous les dimanches à 18h00
  cron.schedule('0 18 * * 0', generateAndSaveWeeklyVideo);
  console.log('Tâche planifiée démarrée : vidéo hebdomadaire chaque dimanche à 18h00.');
}

module.exports = { startWeeklyVideoGenerator, generateAndSaveWeeklyVideo };
