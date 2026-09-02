require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const { connectDB } = require('./services/db');
const wordService = require('./services/wordService');
const expressionService = require('./services/expressionService');
const jokeService = require('./services/jokeService');
const routes = require('./routes/index');
const { startDailySender } = require('./cron/dailySender');
const { startWeeklyVideoGenerator } = require('./cron/weeklyVideo');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

async function start() {
  try {
    await connectDB();
    await wordService.seedIfEmpty();
    await expressionService.seedIfEmpty();
    await jokeService.seedIfEmpty();
  } catch (err) {
    console.error('Erreur de connexion à la base de données :', err.message);
    console.error('Vérifie que MONGODB_URI est bien configurée dans les variables d\'environnement.');
  }

  app.listen(PORT, () => {
    console.log(`WordSip est en ligne sur le port ${PORT}`);
    startDailySender();
    startWeeklyVideoGenerator();
  });
}

start();
