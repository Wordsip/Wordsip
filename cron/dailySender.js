const cron = require('node-cron');
const userService = require('../services/userService');
const wordService = require('../services/wordService');
const emailService = require('../services/emailService');
const twitterService = require('../services/twitterService');

// Mot "vedette" publié sur Twitter/X chaque jour (indépendant des préférences
// de chaque utilisateur inscrit, puisque le tweet est unique et public).
const FEATURED_LANGUAGE = 'en';
const FEATURED_LANGUAGE_LABEL = 'English';
const FEATURED_LEVEL = 'beginner';

// 9h00 : créneau où l'engagement est le plus fort sur X/Twitter en France
// (source : études Buffer/Sprout Social/Metricool 2026 sur les horaires de publication).
const TWITTER_CRON_SCHEDULE = '0 9 * * *';

function getCurrentTimeString() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function startDailySender() {
  // Vérifie toutes les 15 minutes si des utilisateurs doivent recevoir leur
  // mot du jour à ce créneau précis (chacun choisit son heure à l'inscription).
  cron.schedule('*/15 * * * *', async () => {
    const currentTime = getCurrentTimeString();
    const users = userService.getAllUsers();
    const usersToNotify = users.filter((u) => (u.notificationTime || '08:00') === currentTime);

    if (usersToNotify.length === 0) return;

    console.log(`Envoi du mot du jour pour le créneau ${currentTime} (${usersToNotify.length} utilisateur(s))...`);

    for (const user of usersToNotify) {
      const word = wordService.getWordForUser(user);
      if (word) {
        await emailService.sendWordEmail(user, word);
      }
    }
  });

  // Publication automatique du tweet quotidien à 9h00, l'heure de meilleure
  // activité sur X/Twitter en France.
  cron.schedule(TWITTER_CRON_SCHEDULE, async () => {
    const featuredWord = wordService.getWordForUser({
      language: FEATURED_LANGUAGE,
      level: FEATURED_LEVEL,
    });

    if (featuredWord) {
      const tweetResult = await twitterService.postDailyTweet(featuredWord, FEATURED_LANGUAGE_LABEL);
      if (tweetResult.simulated) {
        console.log('[SIMULATION] Tweet du jour :\n' + tweetResult.text);
      } else if (tweetResult.error) {
        console.error('Échec de la publication du tweet :', tweetResult.error);
      }
    }
  });

  console.log('Tâches planifiées démarrées : mails selon créneau choisi par chaque utilisateur, tweet quotidien à 9h00.');
}

module.exports = { startDailySender };
