const fs = require('fs');
const path = require('path');
const { getDB } = require('./db');

const SEED_FILE = path.join(__dirname, '..', 'data', 'jokes.seed.json');

function jokesCollection() {
  return getDB().collection('jokes');
}

async function seedIfEmpty() {
  const count = await jokesCollection().countDocuments();
  if (count > 0) return;

  if (!fs.existsSync(SEED_FILE)) return;

  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  const documents = Object.entries(seedData).map(([language, jokes]) => ({
    _id: language,
    jokes,
  }));

  if (documents.length > 0) {
    await jokesCollection().insertMany(documents);
    console.log(`Base de blagues initialisée avec ${documents.length} langue(s).`);
  }
}

async function getJokesForLanguage(language) {
  const doc = await jokesCollection().findOne({ _id: language });
  return doc ? doc.jokes : null;
}

// Choisit la blague de la semaine pour une langue donnée — stable sur toute
// la semaine, change chaque semaine (même logique que l'expression).
async function getJokeOfWeek(language) {
  const jokes = await getJokesForLanguage(language);
  if (!jokes || jokes.length === 0) return null;

  const weekOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / (7 * 86400000)
  );
  const index = weekOfYear % jokes.length;

  return jokes[index];
}

module.exports = { getJokesForLanguage, getJokeOfWeek, seedIfEmpty };
