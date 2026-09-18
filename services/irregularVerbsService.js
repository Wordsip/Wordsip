const fs = require('fs');
const path = require('path');
const { getDB } = require('./db');

const SEED_FILE = path.join(__dirname, '..', 'data', 'irregular-verbs.seed.json');

function verbsCollection() {
  return getDB().collection('irregular_verbs');
}

async function seedIfEmpty() {
  const count = await verbsCollection().countDocuments();
  if (count > 0) return;

  if (!fs.existsSync(SEED_FILE)) return;
  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));

  const documents = Object.entries(seedData).map(([language, verbs]) => ({
    _id: language,
    verbs,
  }));

  if (documents.length > 0) {
    await verbsCollection().insertMany(documents);
    console.log(`Verbes irréguliers initialisés pour ${documents.length} langue(s).`);
  }
}

async function reseedFromFile() {
  if (!fs.existsSync(SEED_FILE)) {
    throw new Error('Fichier data/irregular-verbs.seed.json introuvable.');
  }
  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  const languages = Object.keys(seedData);

  for (const [language, verbs] of Object.entries(seedData)) {
    await verbsCollection().replaceOne(
      { _id: language },
      { _id: language, verbs },
      { upsert: true }
    );
  }
  return { languages, count: languages.length };
}

async function getVerbsForLanguage(language) {
  const doc = await verbsCollection().findOne({ _id: language });
  return doc?.verbs || [];
}

module.exports = { seedIfEmpty, reseedFromFile, getVerbsForLanguage };
