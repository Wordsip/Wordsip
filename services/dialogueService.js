const wordService = require('./wordService');

// Construit un mini-dialogue à 2 répliques entre deux personnages (A et B),
// en utilisant deux mots appris récemment. Volontairement très court
// (le but est une vidéo de ~10 secondes maximum).
async function buildWeeklyDialogue(language) {
  const languageWords = await wordService.getWordsForLanguage(language);
  if (!languageWords) return null;

  const pool = [
    ...(languageWords.beginner1 || []),
    ...(languageWords.beginner2 || []),
  ];
  if (pool.length < 2) return null;

  // Sélection simple : les 2 premiers mots de la semaine (basé sur la semaine de l'année,
  // pour varier automatiquement chaque semaine)
  const weekOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / (7 * 86400000)
  );
  const wordA = pool[weekOfYear % pool.length];
  const wordB = pool[(weekOfYear + 1) % pool.length];

  // Utilise le premier exemple de chaque mot comme réplique du dialogue
  const lineA = wordA.examples?.[0] || wordA.word;
  const lineB = wordB.examples?.[0] || wordB.word;

  return {
    lines: [
      { speaker: 'A', text: lineA, highlightWord: wordA.word },
      { speaker: 'B', text: lineB, highlightWord: wordB.word },
    ],
    correctWords: [wordA.word, wordB.word],
    // Options pour le quiz "quel mot as-tu reconnu ?" (2 bons + 2 leurres du même pool)
    quizOptions: shuffleAndPick(pool, wordA.word, wordB.word),
  };
}

function shuffleAndPick(pool, correctA, correctB) {
  const distractors = pool
    .map((w) => w.word)
    .filter((w) => w !== correctA && w !== correctB);
  const shuffledDistractors = distractors.sort(() => Math.random() - 0.5).slice(0, 2);
  const options = [correctA, correctB, ...shuffledDistractors];
  return options.sort(() => Math.random() - 0.5);
}

module.exports = { buildWeeklyDialogue };
