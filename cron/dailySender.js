const cron = require('node-cron');
const scheduledTasks = require('../services/scheduledTasks');

// Ces tâches internes servent de filet de sécurité si le site est déjà
// réveillé au bon moment, mais la méthode fiable reste le déclenchement
// externe via cron-job.org (voir routes /api/cron/*), car Render met le
// site en veille par inactivité et une tâche interne ne peut pas se
// déclencher pendant que le site dort.

function startDailySender() {
  cron.schedule('*/15 * * * *', () => {
    scheduledTasks.checkAndSendDueEmails().catch((err) =>
      console.error('Erreur envoi mails planifiés :', err.message)
    );
  });

  cron.schedule('0 9 * * *', () => {
    scheduledTasks.postDailyTweetTask().catch((err) =>
      console.error('Erreur publication tweet planifié :', err.message)
    );
  });

  console.log('Tâches planifiées internes démarrées (filet de sécurité) — le déclenchement externe via cron-job.org reste nécessaire pour la fiabilité.');
}

module.exports = { startDailySender };
