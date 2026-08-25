require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const routes = require('./routes/index');
const { startDailySender } = require('./cron/dailySender');
const { startWeeklyVideoGenerator } = require('./cron/weeklyVideo');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

app.listen(PORT, () => {
  console.log(`WordSip est en ligne sur le port ${PORT}`);
  startDailySender();
  startWeeklyVideoGenerator();
});
