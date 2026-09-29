const fs = require('fs');
const path = require('path');
const { getWordsForLanguage } = require('./wordService');

// Histoires pré-écrites (data/stories.seed.json), 100 % gratuites : aucun
// appel externe. Chaque histoire est liée à des mots précis de la banque de
// mots (balisés [[forme|Mot]] dans le texte) — donc à une étape précise de
// l'apprentissage : elle se débloque quand l'utilisateur a validé assez de
// ses mots-clés. Le fichier est lu directement (pas de base de données, donc
// pas de "reseed" à faire après une mise à jour).
const STORIES_FILE = path.join(__dirname, '..', 'data', 'stories.seed.json');
const UNLOCK_RATIO = 0.5; // part des mots-clés à connaître pour débloquer une histoire

let cache = null;
function loadAll() {
  if (!cache) cache = JSON.parse(fs.readFileSync(STORIES_FILE, 'utf-8'));
  return cache;
}

const TAG_REGEX = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;

// Découpe "Hello! My [[name|Name]] is Anna." en morceaux de texte / mots-clés,
// pour que le front puisse surligner les mots appris (vert) ou nouveaux (orange).
function parseSentence(text) {
  const parts = [];
  let last = 0;
  let plain = '';
  for (const m of text.matchAll(TAG_REGEX)) {
    if (m.index > last) {
      const t = text.slice(last, m.index);
      parts.push({ text: t });
      plain += t;
    }
    parts.push({ text: m[1], word: m[2] });
    plain += m[1];
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    const t = text.slice(last);
    parts.push({ text: t });
    plain += t;
  }
  return { parts, plain };
}

function keywordsOf(story) {
  const set = new Set();
  for (const s of story.sentences) {
    for (const m of s.text.matchAll(TAG_REGEX)) set.add(m[2]);
  }
  return [...set];
}

function neededToUnlock(story, index) {
  if (index === 0) return 0; // le chapitre 1 est toujours ouvert
  return Math.ceil(keywordsOf(story).length * UNLOCK_RATIO);
}

function summarize(story, index, validated, preview) {
  const keywords = keywordsOf(story);
  const known = keywords.filter((w) => validated.has(w)).length;
  const needed = neededToUnlock(story, index);
  return {
    id: story.id,
    chapter: index + 1,
    title: story.title,
    titleFr: story.titleFr,
    keywordCount: keywords.length,
    knownCount: known,
    needed,
    unlocked: preview || known >= needed,
  };
}

async function listStories({ language, level, validatedWords = [], preview = false }) {
  const all = loadAll();
  const validated = new Set(validatedWords);
  const levels = preview ? ['niveau1', 'niveau2', 'niveau3'] : [level];
  const result = [];
  for (const lv of levels) {
    const stories = (all[language] && all[language][lv]) || [];
    stories.forEach((s, i) => result.push({ level: lv, ...summarize(s, i, validated, preview) }));
  }
  return result;
}

// Renvoie l'histoire complète (phrases découpées + glossaire), ou null si
// elle n'existe pas / n'appartient pas à la langue ; { locked: true } si
// l'utilisateur n'a pas encore appris assez de mots pour l'ouvrir.
async function getStory(id, { language, level, validatedWords = [], preview = false }) {
  const all = loadAll();
  const validated = new Set(validatedWords);
  const levels = preview ? ['niveau1', 'niveau2', 'niveau3'] : [level];

  for (const lv of levels) {
    const stories = (all[language] && all[language][lv]) || [];
    const index = stories.findIndex((s) => s.id === id);
    if (index === -1) continue;

    const story = stories[index];
    const summary = summarize(story, index, validated, preview);
    if (!summary.unlocked) return { locked: true, ...summary };

    const bank = (await getWordsForLanguage(language)) || {};
    const translations = {};
    (bank[lv] || []).forEach((w) => { translations[w.word] = w.translation; });

    return {
      ...summary,
      level: lv,
      sentences: story.sentences.map((s) => ({ ...parseSentence(s.text), fr: s.fr })),
      glossary: keywordsOf(story).map((w) => ({
        word: w,
        translation: translations[w] || '',
        known: validated.has(w),
      })),
    };
  }
  return null;
}

module.exports = { listStories, getStory };
