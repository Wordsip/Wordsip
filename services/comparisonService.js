const fs = require('fs');
const path = require('path');
const { getDB } = require('./db');

const SEED_FILE = path.join(__dirname, '..', 'data', 'comparisons.seed.json');

function comparisonsCollection() {
  return getDB().collection('comparisons');
}

// Même logique que wordService.seedIfEmpty : ne peuple la base qu'au tout
// premier démarrage, pour ne jamais écraser du contenu déjà en place.
async function seedIfEmpty() {
  const count = await comparisonsCollection().countDocuments();
  if (count > 0) return;

  if (!fs.existsSync(SEED_FILE)) return;
  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));

  const documents = Object.entries(seedData).map(([language, groups]) => ({
    _id: language,
    groups,
  }));

  if (documents.length > 0) {
    await comparisonsCollection().insertMany(documents);
    console.log(`Comparaisons grammaticales initialisées pour ${documents.length} langue(s).`);
  }
}

// Réimporte le fichier seed, quel que soit l'état actuel de la base — utile
// pour ajouter de nouveaux groupes de comparaison sans perdre les existants
// côté code (même logique que wordService.reseedFromFile).
async function reseedFromFile() {
  if (!fs.existsSync(SEED_FILE)) {
    throw new Error('Fichier data/comparisons.seed.json introuvable.');
  }
  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  const languages = Object.keys(seedData);

  for (const [language, groups] of Object.entries(seedData)) {
    await comparisonsCollection().replaceOne(
      { _id: language },
      { _id: language, groups },
      { upsert: true }
    );
  }
  return { languages, count: languages.length };
}

async function getGroupsForLanguage(language) {
  const doc = await comparisonsCollection().findOne({ _id: language });
  return doc?.groups || [];
}

// Choisit un groupe de comparaison de façon déterministe selon le jour de
// l'année, comme le mot du jour — même groupe pour tout le monde le même
// jour, change automatiquement quand plusieurs groupes existeront pour une
// langue donnée.
async function getComparisonOfDay(language) {
  const groups = await getGroupsForLanguage(language);
  if (groups.length === 0) return null;

  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  return groups[dayOfYear % groups.length];
}

module.exports = {
  seedIfEmpty,
  reseedFromFile,
  getGroupsForLanguage,
  getComparisonOfDay,
};
