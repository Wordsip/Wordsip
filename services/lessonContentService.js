const fs = require('fs');
const path = require('path');
const additions = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'lessons.v28.json'), 'utf8'));
const corrections = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'lessons.corrections.v28.json'), 'utf8'));

function mergeLessons(language, stored = []) {
  // Apply targeted teaching corrections without replacing the database document.
  const patches = corrections[language] || {};
  const rows = stored.map(lesson => patches[lesson.id] ? { ...lesson, ...patches[lesson.id] } : lesson);
  const byId = new Map(rows.map(lesson => [lesson.id, lesson]));
  for (const lesson of additions[language] || []) byId.set(lesson.id, lesson);
  return [...byId.values()];
}
module.exports = { mergeLessons };
