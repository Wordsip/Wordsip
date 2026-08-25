const fs = require('fs');
const path = require('path');

const WORDS_FILE = path.join(__dirname, '..', 'data', 'words.json');

// Seuil de mots validés pour passer au sous-niveau suivant
const WORDS_PER_SUBLEVEL = 33;

// Deux parcours possibles, choisis par l'utilisateur à l'inscription :
// - "rapide" : 6 sous-niveaux (198 mots) — amène à un niveau débutant solide plus vite
// - "complet" : 15 sous-niveaux (~500 mots) — amène à un vrai niveau conversationnel, plus long
const TRACKS = {
  rapide: { beginnerLevels: 3, intermediateLevels: 3 },
  complet: { beginnerLevels: 5, intermediateLevels: 10 },
};

function getAllWords() {
  const raw = fs.readFileSync(WORDS_FILE, 'utf-8');
  return JSON.parse(raw);
}

// Détermine le sous-niveau réel (beginner1/2/3..., intermediate1/2/3...) en fonction
// du nombre de mots déjà validés et du parcours choisi (rapide ou complet).
function getSubLevel(user) {
  const validated = user.wordsValidated || 0;
  const track = TRACKS[user.track] || TRACKS.rapide;
  const base = (user.level || 'beginner').startsWith('intermediate') ? 'intermediate' : 'beginner';
  const maxLevels = base === 'intermediate' ? track.intermediateLevels : track.beginnerLevels;

  const rawIndex = Math.floor(validated / WORDS_PER_SUBLEVEL) + 1;
  const index = Math.min(rawIndex, maxLevels);

  return `${base}${index}`;
}

function getWordForUser(user) {
  const allWords = getAllWords();
  const languageWords = allWords[user.language];
  if (!languageWords) return null;

  const subLevel = getSubLevel(user);
  let levelWords = languageWords[subLevel];

  // Si le sous-niveau demandé n'a pas encore de mots (base en cours de remplissage,
  // notamment pour le parcours complet dont le contenu avancé reste à créer),
  // on retombe sur beginner1 pour ne jamais laisser l'utilisateur sans mot du jour.
  if (!levelWords || levelWords.length === 0) {
    levelWords = languageWords.beginner1 || languageWords.beginner || [];
  }
  if (levelWords.length === 0) return null;

  // Choix basé sur le jour de l'année, pour varier chaque jour sans répétition immédiate
  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  const index = dayOfYear % levelWords.length;

  return { ...levelWords[index], subLevel };
}

module.exports = { getAllWords, getWordForUser, getSubLevel, WORDS_PER_SUBLEVEL, TRACKS };
