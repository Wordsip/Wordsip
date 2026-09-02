const fs = require('fs');
const path = require('path');
const { getDB } = require('./db');

const SEED_FILE = path.join(__dirname, '..', 'data', 'expressions.seed.json');

function expressionsCollection() {
  return getDB().collection('expressions');
}

async function seedIfEmpty() {
  const count = await expressionsCollection().countDocuments();
  if (count > 0) return;

  if (!fs.existsSync(SEED_FILE)) return;

  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  const documents = Object.entries(seedData).map(([language, expressions]) => ({
    _id: language,
    expressions,
  }));

  if (documents.length > 0) {
    await expressionsCollection().insertMany(documents);
    console.log(`Base d'expressions initialisée avec ${documents.length} langue(s).`);
  }
}

async function getExpressionsForLanguage(language) {
  const doc = await expressionsCollection().findOne({ _id: language });
  return doc ? doc.expressions : null;
}

// Choisit l'expression de la semaine pour une langue donnée — stable sur
// toute la semaine (même expression du lundi au dimanche), change chaque
// semaine grâce à la rotation par numéro de semaine dans l'année.
async function getExpressionOfWeek(language) {
  const expressions = await getExpressionsForLanguage(language);
  if (!expressions || expressions.length === 0) return null;

  const weekOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / (7 * 86400000)
  );
  const index = weekOfYear % expressions.length;

  return expressions[index];
}

module.exports = { getExpressionsForLanguage, getExpressionOfWeek, seedIfEmpty };
