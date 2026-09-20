const fs = require('fs');
const path = require('path');
const { getDB } = require('./db');

const SEED_FILE = path.join(__dirname, '..', 'data', 'lessons.seed.json');

function lessonsCollection() {
  return getDB().collection('lessons');
}

async function seedIfEmpty() {
  const count = await lessonsCollection().countDocuments();
  if (count > 0) return;

  if (!fs.existsSync(SEED_FILE)) return;
  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));

  const documents = Object.entries(seedData).map(([language, lessons]) => ({
    _id: language,
    lessons,
  }));

  if (documents.length > 0) {
    await lessonsCollection().insertMany(documents);
    console.log(`Fiches de cours initialisées pour ${documents.length} langue(s).`);
  }
}

async function reseedFromFile() {
  if (!fs.existsSync(SEED_FILE)) {
    throw new Error('Fichier data/lessons.seed.json introuvable.');
  }
  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  const languages = Object.keys(seedData);

  for (const [language, lessons] of Object.entries(seedData)) {
    await lessonsCollection().replaceOne(
      { _id: language },
      { _id: language, lessons },
      { upsert: true }
    );
  }
  return { languages, count: languages.length };
}

async function getLessonsForLanguage(language) {
  const doc = await lessonsCollection().findOne({ _id: language });
  return doc?.lessons || [];
}

module.exports = { seedIfEmpty, reseedFromFile, getLessonsForLanguage };
