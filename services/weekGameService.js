const LANGUAGES = ['en', 'es', 'it', 'ja', 'zh'];

function weekStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// Dates are attached to actual views, not guessed from the daily schedule.
function selectWeekWords(history, language, level, now = new Date()) {
  const start = weekStart(now).getTime();
  const end = now.getTime();
  const pairs = new Map();
  for (const entry of history || []) {
    const stamp = new Date(entry.seenAt).getTime();
    if (entry.language !== language || entry.level !== level || !Number.isFinite(stamp) || stamp < start || stamp > end) continue;
    if (!entry.word || !entry.translation) continue;
    const key = entry.word.normalize('NFC').trim().toLocaleLowerCase(language);
    pairs.set(key, { word: entry.word, translation: entry.translation });
  }
  return [...pairs.values()];
}

module.exports = { LANGUAGES, weekStart, selectWeekWords };
