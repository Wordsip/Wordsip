const fs = require('fs');
const path = require('path');
const { getDB } = require('./db');

const SEED_FILE = path.join(__dirname, '..', 'data', 'words.seed.json');

// 3 niveaux fixes, choisis par l'utilisateur à l'inscription (plus de
// parcours rapide/complet ni de progression automatique par mots validés).
const LEVELS = {
  niveau1: 'Niveau 1 — Collège (6e-5e-4e)',
  niveau2: 'Niveau 2 — Lycée (3e-2nde-1re-Tle)',
  niveau3: 'Niveau 3 — Fac / Master / Pro',
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

// Le niveau est directement celui choisi par l'utilisateur (niveau1/2/3),
// sans progression automatique. On retombe sur niveau1 si la valeur stockée
// n'est pas (ou plus) l'un des 3 niveaux valides.
function getSubLevel(user) {
  return LEVELS[user.level] ? user.level : 'niveau1';
}

async function getWordForUser(user) {
  const languageWords = await getWordsForLanguage(user.language);
  if (!languageWords) return null;

  const subLevel = getSubLevel(user);
  let levelWords = languageWords[subLevel];

  if (!levelWords || levelWords.length === 0) {
    levelWords = languageWords.niveau1 || [];
  }

  // Les mots bloqués par l'admin ne sont jamais diffusés, sans être supprimés
  const activeWords = levelWords.filter((w) => !w.disabled);
  if (activeWords.length === 0) return null;

  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  const index = dayOfYear % activeWords.length;

  return { ...activeWords[index], subLevel };
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

// Ordre des niveaux du plus avancé au plus simple, pour toujours choisir le
// mot le plus intéressant disponible pour une langue donnée (utilisé pour le
// tweet et la vidéo publics, qui ne sont liés à aucun utilisateur précis).
const SUBLEVEL_PRIORITY = ['niveau3', 'niveau2', 'niveau1'];

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
    const words = (languageWords[level] || []).filter((w) => !w.disabled);
    if (words.length > 0) {
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

// Bloque ou débloque un mot à un index donné, sans le supprimer — il reste
// visible dans la page admin mais n'est plus jamais diffusé aux utilisateurs
// tant qu'il est bloqué.
async function toggleWordDisabled(language, subLevel, index) {
  const doc = await wordsCollection().findOne({ _id: language });
  if (!doc || !doc[subLevel] || !doc[subLevel][index]) {
    throw new Error('Mot introuvable.');
  }

  const currentlyDisabled = !!doc[subLevel][index].disabled;
  const setKey = `${subLevel}.${index}.disabled`;

  await wordsCollection().updateOne(
    { _id: language },
    { $set: { [setKey]: !currentlyDisabled } }
  );

  return { disabled: !currentlyDisabled };
}

// Compte, pour une langue donnée, le nombre de mots actifs (non bloqués par
// l'admin) disponibles à chaque niveau — sert de dénominateur pour calculer
// le % d'avancement d'un utilisateur dans ce niveau.
async function getLevelWordCounts(language) {
  const languageWords = await getWordsForLanguage(language);
  if (!languageWords) return { niveau1: 0, niveau2: 0, niveau3: 0 };
  const counts = {};
  for (const level of Object.keys(LEVELS)) {
    counts[level] = (languageWords[level] || []).filter((w) => !w.disabled).length;
  }
  return counts;
}

// Calcule, pour une langue donnée, l'ensemble des caractères distincts
// utilisés dans tous ses mots (tous niveaux confondus) — sert à construire
// le clavier virtuel pour le japonais/chinois, où un clavier standard n'a
// pas de sens (script logographique/syllabique), contrairement aux langues
// latines qui ont un alphabet fixe connu à l'avance.
async function getUniqueCharacters(language) {
  const languageWords = await getWordsForLanguage(language);
  if (!languageWords) return [];
  const chars = new Set();
  for (const level of Object.keys(LEVELS)) {
    for (const w of languageWords[level] || []) {
      for (const ch of w.word) {
        // On exclut les espaces et la ponctuation latine basique : ils sont
        // déjà accessibles depuis n'importe quel clavier physique.
        if (ch.trim() && !/[.,!?'"()-]/.test(ch)) chars.add(ch);
      }
    }
  }
  return Array.from(chars).sort((a, b) => a.localeCompare(b, language));
}

module.exports = {
  getAllWords,
  getWordsForLanguage,
  getWordForUser,
  getFeaturedWordOfDay,
  getSubLevel,
  getLevelWordCounts,
  getUniqueCharacters,
  addWord,
  updateWord,
  deleteWord,
  toggleWordDisabled,
  seedIfEmpty,
  LEVELS,
};
