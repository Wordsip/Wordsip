// Logique des tâches planifiées, extraite dans des fonctions réutilisables :
// - appelées en interne par node-cron quand le site est réveillé (bonus)
// - appelées via une route HTTP par un service externe gratuit (cron-job.org),
//   ce qui réveille aussi le site s'il était en veille (plan gratuit Render)
const userService = require('./userService');
const wordService = require('./wordService');
const emailService = require('./emailService');
const twitterService = require('./twitterService');
const dialogueService = require('./dialogueService');
const videoService = require('./videoService');
const fs = require('fs');
const path = require('path');

const FEATURED_LANGUAGE = 'en';
const FEATURED_LANGUAGE_LABEL = 'English';
const FEATURED_LEVEL = 'beginner';
const LATEST_VIDEO_FILE = path.join(__dirname, '..', 'data', 'latest-video.json');

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function getCurrentTimeString() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getCurrentDayKey() {
  return DAY_KEYS[new Date().getDay()];
}

// Envoie le mot du jour à tous les utilisateurs dont l'heure ET le jour
// choisis correspondent à maintenant.
async function checkAndSendDueEmails() {
  const currentTime = getCurrentTimeString();
  const currentDay = getCurrentDayKey();
  const users = await userService.getAllUsers();
  const usersToNotify = users.filter((u) => {
    const timeMatches = (u.notificationTime || '08:00') === currentTime;
    const dayMatches = Array.isArray(u.wordDays) ? u.wordDays.includes(currentDay) : true;
    return timeMatches && dayMatches;
  });

  if (usersToNotify.length === 0) {
    return { sent: 0, currentTime, currentDay };
  }

  for (const user of usersToNotify) {
    const word = await wordService.getWordForUser(user);
    if (word) {
      await emailService.sendWordEmail(user, word);
    }
  }

  return { sent: usersToNotify.length, currentTime, currentDay };
}

async function postDailyTweetTask() {
  const featuredWord = await wordService.getWordForUser({
    language: FEATURED_LANGUAGE,
    level: FEATURED_LEVEL,
  });

  if (!featuredWord) return { posted: false, reason: 'Aucun mot disponible.' };

  const tweetResult = await twitterService.postDailyTweet(featuredWord, FEATURED_LANGUAGE_LABEL);
  return { posted: !tweetResult.simulated && !tweetResult.error, ...tweetResult };
}

async function generateWeeklyVideoTask() {
  const dialogue = await dialogueService.buildWeeklyDialogue(FEATURED_LANGUAGE);
  if (!dialogue) return { generated: false, reason: 'Pas assez de mots disponibles.' };

  const videoUrl = await videoService.generateWeeklyVideo(dialogue, FEATURED_LANGUAGE);
  fs.writeFileSync(LATEST_VIDEO_FILE, JSON.stringify({
    videoUrl,
    quizOptions: dialogue.quizOptions,
    correctWords: dialogue.correctWords,
    generatedAt: new Date().toISOString(),
  }, null, 2));

  return { generated: true, videoUrl };
}

module.exports = { checkAndSendDueEmails, postDailyTweetTask, generateWeeklyVideoTask };
