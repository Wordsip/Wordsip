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

// Ordre des niveaux du plus simple au plus avancé — sert à trouver "le
// niveau suivant" pour la dictée mensuelle (mots déjà appris + avant-goût du
// niveau à venir). Renvoie null si l'utilisateur est déjà au niveau le plus
// avancé (niveau3) : dans ce cas la dictée pioche uniquement dans niveau3.
const LEVEL_ORDER = ['niveau1', 'niveau2', 'niveau3'];
function getNextLevel(level) {
  const index = LEVEL_ORDER.indexOf(level);
  if (index === -1 || index === LEVEL_ORDER.length - 1) return null;
  return LEVEL_ORDER[index + 1];
}

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

// Donne le lundi de la semaine d'une date donnée (utilisé pour reconstituer
// "les mots de la semaine" pour la vidéo hebdomadaire, générée le dimanche).
function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=dimanche ... 6=samedi
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Reconstitue les mots effectivement montrés du lundi au dimanche de la
// semaine en cours (même calcul que le mot du jour affiché sur le site,
// jour par jour) — pas une sélection à part, donc ce sont vraiment "les mots
// appris cette semaine" pour ce niveau/cette langue, pas un tirage séparé.
async function getWeekWords(language, level) {
  const languageWords = await getWordsForLanguage(language);
  if (!languageWords) return [];

  let levelWords = languageWords[level] || languageWords.niveau1 || [];
  const activeWords = levelWords.filter((w) => !w.disabled);
  if (activeWords.length === 0) return [];

  const monday = getMondayOfWeek(new Date());
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({ date: d, ...getWordForDateSync(activeWords, d) });
  }
  return days;
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

// Calcule le mot du jour pour une date précise (pas seulement "aujourd'hui"),
// pour pouvoir aussi donner le mot de la veille et du lendemain — utile pour
// l'aperçu "mot d'avant / mot d'après" sur la page. Généraliser par date
// plutôt que de juste faire index±1 gère correctement le changement d'année
// (le 31 décembre, le calcul repart à dayOfYear=1 le 1er janvier, pas 366).
function getWordForDateSync(activeWords, date) {
  const dayOfYear = Math.floor(
    (date - new Date(date.getFullYear(), 0, 0)) / 86400000
  );
  const index = dayOfYear % activeWords.length;
  return activeWords[index];
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

  return { ...getWordForDateSync(activeWords, new Date()), subLevel };
}

// Donne le mot de la veille (déjà "passé", pas de spoil) et celui du
// lendemain (à flouter côté front tant que l'utilisateur ne clique pas
// dessus) — même liste de mots actifs et même logique que getWordForUser,
// juste appliquée à hier/demain plutôt qu'aujourd'hui.
async function getAdjacentWordsForUser(user) {
  const languageWords = await getWordsForLanguage(user.language);
  if (!languageWords) return { previous: null, next: null };

  const subLevel = getSubLevel(user);
  let levelWords = languageWords[subLevel];
  if (!levelWords || levelWords.length === 0) {
    levelWords = languageWords.niveau1 || [];
  }
  const activeWords = levelWords.filter((w) => !w.disabled);
  if (activeWords.length === 0) return { previous: null, next: null };

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const previous = getWordForDateSync(activeWords, yesterday);
  const next = getWordForDateSync(activeWords, tomorrow);

  return {
    previous: { word: previous.word, translation: previous.translation },
    next: { word: next.word, translation: next.translation },
  };
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

// Réimporte le fichier data/words.seed.json dans MongoDB en écrasant chaque
// langue existante (upsert par _id=langue). Contrairement à seedIfEmpty
// (qui ne s'exécute qu'au tout premier démarrage, base vide), cette fonction
// est destinée à migrer une base déjà peuplée vers une nouvelle structure —
// utile après un changement de schéma comme le passage aux 3 niveaux fixes.
// ⚠️ Écrase tout mot ajouté depuis l'admin qui ne serait pas déjà dans le
// fichier seed local.
async function reseedFromFile() {
  if (!fs.existsSync(SEED_FILE)) {
    throw new Error('Fichier data/words.seed.json introuvable.');
  }
  const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  const languages = Object.keys(seedData);

  for (const [language, levels] of Object.entries(seedData)) {
    await wordsCollection().replaceOne(
      { _id: language },
      { _id: language, ...levels },
      { upsert: true }
    );
  }
  return { languages, count: languages.length };
}

// Mélange un tableau sur place (Fisher-Yates) — utilisé pour tirer une
// sélection aléatoire de mots à chaque nouvelle dictée.
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Construit une dictée courte (4 lignes maximum) : moitié mots déjà appris
// (pour réviser l'orthographe — mis en surbrillance côté front) et moitié
// nouveaux mots piochés dans le niveau suivant (avant-goût de ce qui
// arrive). Débloquée à partir de 6 mots appris (vérifié côté route, pas
// ici) — cette fonction se charge seulement du contenu une fois qu'on sait
// que l'utilisateur y a droit.
// Une vraie dictée doit être un texte suivi à écouter et transcrire — pas
// une liste de mots isolés. On la construit avec les phrases d'exemple déjà
// écrites pour les mots que l'utilisateur a réellement appris (jamais de
// texte inventé), en s'arrêtant autour de 4 lignes pour rester courte.
// Débloquée à partir de DICTEE_UNLOCK_WORDS mots appris (voir la route) —
// le contenu reflète donc ce seuil : jusqu'à ce nombre de mots piochés
// parmi les mots validés, pas juste 2 comme avant.
const DICTEE_MAX_WORDS = 6;
const DICTEE_MAX_CHARS = 320; // ~4 lignes à l'écran

async function buildDictee(user) {
  const languageWords = await getWordsForLanguage(user.language);
  if (!languageWords) return null;

  const level = getSubLevel(user);
  const validatedAtLevel = (user.validatedWords && user.validatedWords[level]) || [];
  const levelActiveWords = (languageWords[level] || []).filter((w) => !w.disabled);

  // Mots déjà validés par l'utilisateur — seuls ceux encore présents et
  // actifs dans la base sont utilisables (un mot a pu être supprimé ou
  // bloqué par l'admin depuis sa validation).
  const learnedPool = levelActiveWords.filter((w) => validatedAtLevel.includes(w.word));
  if (learnedPool.length === 0) return { level, text: '', words: [] };

  const picks = shuffle(learnedPool).slice(0, DICTEE_MAX_WORDS);

  // Assemble les phrases d'exemple une par une, sans dépasser la longueur
  // visée — s'arrête dès qu'ajouter la phrase suivante ferait déborder les
  // 4 lignes, plutôt que de tout mettre puis couper au milieu d'une phrase.
  const used = [];
  let text = '';
  for (const w of picks) {
    const sentence = (w.examples && w.examples[0]) || w.word;
    const candidate = text ? `${text} ${sentence}` : sentence;
    if (candidate.length > DICTEE_MAX_CHARS && used.length > 0) break;
    text = candidate;
    used.push({ word: w.word, translation: w.translation });
    if (text.length > DICTEE_MAX_CHARS) break;
  }

  return { level, text, words: used };
}

module.exports = {
  getAllWords,
  getWordsForLanguage,
  getWordForUser,
  getAdjacentWordsForUser,
  getWeekWords,
  getFeaturedWordOfDay,
  getSubLevel,
  getNextLevel,
  getLevelWordCounts,
  getUniqueCharacters,
  buildDictee,
  addWord,
  updateWord,
  deleteWord,
  toggleWordDisabled,
  seedIfEmpty,
  reseedFromFile,
  LEVELS,
};
