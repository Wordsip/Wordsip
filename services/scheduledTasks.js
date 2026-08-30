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

const FEATURED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
];
const LATEST_VIDEO_FILE = path.join(__dirname, '..', 'data', 'latest-video.json');

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function getDayOfYear() {
  return Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
}

// Choisit la langue du jour en tournant sur les 5 langues disponibles, pour
// que le tweet et la vidéo mettent en avant chaque langue à tour de rôle,
// pas seulement l'anglais.
function getFeaturedLanguageOfDay() {
  return FEATURED_LANGUAGES[getDayOfYear() % FEATURED_LANGUAGES.length];
}

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
  const { code, label } = getFeaturedLanguageOfDay();
  const featuredWord = await wordService.getFeaturedWordOfDay(code);

  if (!featuredWord) return { posted: false, reason: `Aucun mot disponible pour ${label}.` };

  const tweetResult = await twitterService.postDailyTweet(featuredWord, label, code);
  return { posted: !tweetResult.simulated && !tweetResult.error, language: code, ...tweetResult };
}

async function generateWeeklyVideoTask() {
  const { code } = getFeaturedLanguageOfDay();
  const dialogue = await dialogueService.buildWeeklyDialogue(code);
  if (!dialogue) return { generated: false, reason: 'Pas assez de mots disponibles.' };

  const videoUrl = await videoService.generateWeeklyVideo(dialogue, code);
  fs.writeFileSync(LATEST_VIDEO_FILE, JSON.stringify({
    videoUrl,
    quizOptions: dialogue.quizOptions,
    correctWords: dialogue.correctWords,
    generatedAt: new Date().toISOString(),
  }, null, 2));

  return { generated: true, videoUrl };
}

module.exports = { checkAndSendDueEmails, postDailyTweetTask, generateWeeklyVideoTask };
