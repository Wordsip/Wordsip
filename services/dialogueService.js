const wordService = require('./wordService');

// Construit le dialogue de la vidéo hebdomadaire à partir des mots
// RÉELLEMENT montrés du lundi au dimanche de la semaine (même calcul que le
// mot du jour affiché sur le site) — pas un tirage indépendant. Chaque
// réplique reprend l'exemple du mot, et son expression argotique est
// affichée en incrustation texte (sans coût audio supplémentaire) pour
// couvrir "mots + expressions" sans doubler le nombre de clips à générer.
async function buildWeeklyDialogue(language, level = 'niveau1') {
  const weekWords = await wordService.getWeekWords(language, level);
  if (weekWords.length === 0) return null;

  // Dédoublonne (un pool très restreint pourrait répéter un mot sur 7 jours)
  const seen = new Set();
  const uniqueDays = weekWords.filter((d) => {
    if (seen.has(d.word)) return false;
    seen.add(d.word);
    return true;
  });

  const lines = uniqueDays.map((day, i) => ({
    speaker: i % 2 === 0 ? 'A' : 'B',
    text: day.examples?.[0] || day.word,
    highlightWord: day.word,
    hint: day.slang?.expression ? `Argot : "${day.slang.expression}"` : null,
  }));

  return {
    lines,
    correctWords: uniqueDays.map((d) => d.word),
    // Options pour le quiz "quels mots as-tu reconnus ?" : tous les mots de
    // la semaine + quelques leurres du même niveau.
    quizOptions: await buildQuizOptions(language, level, uniqueDays.map((d) => d.word)),
  };
}

async function buildQuizOptions(language, level, correctWords) {
  const languageWords = await wordService.getWordsForLanguage(language);
  const pool = (languageWords?.[level] || []).map((w) => w.word);
  const distractors = pool
    .filter((w) => !correctWords.includes(w))
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.max(2, correctWords.length));
  const options = [...correctWords, ...distractors];
  return options.sort(() => Math.random() - 0.5);
}

module.exports = { buildWeeklyDialogue };
