const fs = require('fs');
const path = require('path');
const { LANGUAGES } = require('./weekGameService');
const { mergeLessons } = require('./lessonContentService');
const cache = new Map();
const key = (text) => String(text).normalize('NFC').toLocaleLowerCase().replace(/^[🔊\s]+|[.!?\s]+$/gu, '').trim();
function read(name) { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', name), 'utf8')); }

function getGlossary(language) {
  if (!LANGUAGES.includes(language)) throw new Error('Langue non reconnue.');
  if (cache.has(language)) return cache.get(language);
  const entries = new Map();
  function add(term, translation, definition = '') {
    if (!term || !translation) return;
    const id = key(term);
    if (!id) return;
    const previous = entries.get(id);
    if (previous && previous.translation !== translation) {
      previous.translation = [...new Set([previous.translation, translation])].join(' ; ');
      if (definition && !previous.definition.includes(definition)) previous.definition += `${previous.definition ? ' ' : ''}${definition}`;
    } else entries.set(id, { term: String(term), translation: String(translation), definition: String(definition) });
  }
  for (const levels of Object.values(read('words.seed.json')[language] || {})) for (const w of levels) {
    add(w.word, w.translation, w.grammar?.nature);
    if (w.slang) add(w.slang.expression, w.slang.meaning, w.slang.warning);
  }
  for (const v of read('irregular-verbs.seed.json')[language] || []) {
    add(v.base, v.translation, 'Verbe à l’infinitif.');
    for (const t of String(v.past).split('/')) add(t, v.translation, 'Forme conjuguée : le temps dépend du contexte.');
    for (const t of String(v.participle).split('/')) add(t, v.translation, 'Participe passé.');
  }
  for (const lesson of mergeLessons(language, read('lessons.seed.json')[language] || [])) {
    for (const item of lesson.vocabulary || []) {
      add(item.term,item.translation,item.definition);
      for(const variant of item.term.split(' / '))add(variant,item.translation,item.definition);
    }
    for (const marker of lesson.timeMarkers || []) {
      add(marker.expression, marker.translation, 'Marqueur de temps.');
      const terms = marker.expression.split(' / '), meanings = marker.translation.split(' / ');
      if (terms.length === meanings.length) terms.forEach((t, i) => add(t, meanings[i], 'Marqueur de temps.'));
    }
    for (const section of lesson.sections || []) add(section.title, section.rule, 'Règle de la fiche.');
  }
  for (const group of read('comparisons.seed.json')[language] || []) for (const item of group.items || []) add(item.word, item.rule, 'Sens et usage dans cette structure.');
  const characters = read('characters.seed.json')[language];
  if (characters) for (const list of Object.values(characters)) for (const c of list) add(c.char, c.meaning || `Lecture : ${c.romaji || c.pinyin}`, 'Caractère de référence.');
  for (const item of read('vocabulary-help.extra.json')[language] || []) add(item.term, item.translation, item.definition || 'Sens courant ; peut varier selon la phrase.');
  const result = [...entries.values()];
  cache.set(language, result);
  return result;
}
module.exports = { getGlossary };
