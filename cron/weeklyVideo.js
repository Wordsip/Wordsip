const cron = require('node-cron');
const scheduledTasks = require('../services/scheduledTasks');

function startWeeklyVideoGenerator() {
  cron.schedule('0 18 * * 0', () => {
    scheduledTasks.generateWeeklyVideoTask().catch((err) =>
      console.error('Erreur génération vidéo planifiée :', err.message)
    );
  });
  console.log('Tâche vidéo hebdomadaire interne démarrée (filet de sécurité) — le déclenchement externe via cron-job.org reste nécessaire pour la fiabilité.');
}

module.exports = { startWeeklyVideoGenerator };
