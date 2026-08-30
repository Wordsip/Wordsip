const fs = require('fs');
const path = require('path');
const { getDB } = require('./db');

const SEED_FILE = path.join(__dirname, '..', 'data', 'words.seed.json');

// Seuil de mots validés pour passer au sous-niveau suivant
const WORDS_PER_SUBLEVEL = 33;

const TRACKS = {
  rapide: { beginnerLevels: 3, intermediateLevels: 3 },
  complet: { beginnerLevels: 5, intermediateLevels: 10 },
};

function wordsCollection() {
  return getDB().collection('words');
}

// Au tout premier démarrage (collection vide), on importe le contenu de départ
// depuis le fichier fourni avec le projet, pour ne pas repartir de zéro.
async function seedIfEmpty() {
  const count = await wordsCollection().countDocuments();
  if (count > 0) return;

  if (!fs.existsSync(SEED_FILE)) {
    console.log('Aucun fichier de départ trouvé pour les mots (data/words.seed.json).');
    return;
  }

  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  const documents = Object.entries(seedData).map(([language, levels]) => ({
    _id: language,
    ...levels,
  }));

  if (documents.length > 0) {
    await wordsCollection().insertMany(documents);
    console.log(`Base de mots initialisée avec ${documents.length} langue(s).`);
  }
}

async function getAllWords() {
  const docs = await wordsCollection().find({}).toArray();
  const result = {};
  docs.forEach((doc) => {
    const { _id, ...levels } = doc;
    result[_id] = levels;
  });
  return result;
}

async function getWordsForLanguage(language) {
  const doc = await wordsCollection().findOne({ _id: language });
  if (!doc) return null;
  const { _id, ...levels } = doc;
  return levels;
}

function getSubLevel(user) {
  const validated = user.wordsValidated || 0;
  const track = TRACKS[user.track] || TRACKS.rapide;
  const base = (user.level || 'beginner').startsWith('intermediate') ? 'intermediate' : 'beginner';
  const maxLevels = base === 'intermediate' ? track.intermediateLevels : track.beginnerLevels;

  const rawIndex = Math.floor(validated / WORDS_PER_SUBLEVEL) + 1;
  const index = Math.min(rawIndex, maxLevels);

  return `${base}${index}`;
}

async function getWordForUser(user) {
  const languageWords = await getWordsForLanguage(user.language);
  if (!languageWords) return null;

  const subLevel = getSubLevel(user);
  let levelWords = languageWords[subLevel];

  if (!levelWords || levelWords.length === 0) {
    levelWords = languageWords.beginner1 || languageWords.beginner || [];
  }
  if (levelWords.length === 0) return null;

  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  const index = dayOfYear % levelWords.length;

  return { ...levelWords[index], subLevel };
}

// Ajoute un mot à un sous-niveau donné d'une langue (utilisé par la page admin)
async function addWord(language, subLevel, wordEntry) {
  await wordsCollection().updateOne(
    { _id: language },
    { $push: { [subLevel]: wordEntry } },
    { upsert: true }
  );
}

// Remplace un mot existant à un index donné (utilisé par la page admin)
async function updateWord(language, subLevel, index, wordEntry) {
  const setKey = `${subLevel}.${index}`;
  const result = await wordsCollection().updateOne(
    { _id: language },
    { $set: { [setKey]: wordEntry } }
  );
  if (result.matchedCount === 0) throw new Error('Langue introuvable.');
}

// Supprime un mot à un index donné (utilisé par la page admin)
async function deleteWord(language, subLevel, index) {
  // MongoDB ne permet pas de retirer directement un élément par index en une
  // étape simple : on le met à null puis on le retire du tableau.
  await wordsCollection().updateOne(
    { _id: language },
    { $unset: { [`${subLevel}.${index}`]: 1 } }
  );
  await wordsCollection().updateOne(
    { _id: language },
    { $pull: { [subLevel]: null } }
  );
}

// Ordre des sous-niveaux du plus avancé au plus simple, pour toujours choisir
// le mot le plus intéressant disponible pour une langue donnée (utilisé pour
// le tweet et la vidéo publics, qui ne sont liés à aucun utilisateur précis).
const SUBLEVEL_PRIORITY = [
  'intermediate5', 'intermediate4', 'intermediate3', 'intermediate2', 'intermediate1', 'intermediate',
  'beginner5', 'beginner4', 'beginner3', 'beginner2', 'beginner1', 'beginner',
];

// Choisit le mot "vedette" du jour pour une langue donnée : prend le
// sous-niveau le plus avancé qui a déjà du contenu (pour éviter de tomber
// systématiquement sur les mots les plus basiques comme "Thank you"), et
// fait varier le mot choisi chaque jour dans ce sous-niveau.
async function getFeaturedWordOfDay(language) {
  const languageWords = await getWordsForLanguage(language);
  if (!languageWords) return null;

  let bestSubLevel = null;
  let bestWords = null;
  for (const level of SUBLEVEL_PRIORITY) {
    const words = languageWords[level];
    if (Array.isArray(words) && words.length > 0) {
      bestSubLevel = level;
      bestWords = words;
      break;
    }
  }
  if (!bestWords) return null;

  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  const index = dayOfYear % bestWords.length;

  return { ...bestWords[index], subLevel: bestSubLevel };
}

module.exports = {
  getAllWords,
  getWordsForLanguage,
  getWordForUser,
  getFeaturedWordOfDay,
  getSubLevel,
  addWord,
  updateWord,
  deleteWord,
  seedIfEmpty,
  WORDS_PER_SUBLEVEL,
  TRACKS,
};
