const fs = require('fs');
const path = require('path');
const { getDB } = require('./db');

const SEED_FILE = path.join(__dirname, '..', 'data', 'characters.seed.json');

function charactersCollection() {
  return getDB().collection('characters');
}

async function seedIfEmpty() {
  const count = await charactersCollection().countDocuments();
  if (count > 0) return;

  if (!fs.existsSync(SEED_FILE)) return;
  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));

  const documents = Object.entries(seedData).map(([language, sets]) => ({
    _id: language,
    ...sets,
  }));

  if (documents.length > 0) {
    await charactersCollection().insertMany(documents);
    console.log(`Fiches de caractères initialisées pour ${documents.length} langue(s).`);
  }
}

async function reseedFromFile() {
  if (!fs.existsSync(SEED_FILE)) {
    throw new Error('Fichier data/characters.seed.json introuvable.');
  }
  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  const languages = Object.keys(seedData);

  for (const [language, sets] of Object.entries(seedData)) {
    await charactersCollection().replaceOne(
      { _id: language },
      { _id: language, ...sets },
      { upsert: true }
    );
  }
  return { languages, count: languages.length };
}

async function getCharactersForLanguage(language) {
  const doc = await charactersCollection().findOne({ _id: language });
  if (!doc) return null;
  const { _id, ...sets } = doc;
  return sets;
}

module.exports = { seedIfEmpty, reseedFromFile, getCharactersForLanguage };
