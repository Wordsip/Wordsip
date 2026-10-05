const { nanoid } = require('nanoid');
const bcrypt = require('bcryptjs');
const { getDB } = require('./db');
const { encryptField, decryptField, hashForLookup } = require('./crypto');
const { LEVELS } = require('./wordService');

function usersCollection() {
  return getDB().collection('users');
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

// Reconstruit un objet utilisateur "utilisable" à partir du document stocké
// en base : déchiffre l'email pour l'attacher en clair (ex. pour l'envoi de
// mails), et reste compatible avec d'anciens comptes qui auraient été créés
// avant la mise en place du chiffrement (email encore en clair dans "email").
function toUsableUser(doc) {
  if (!doc) return null;
  let email = doc.email;
  if (doc.emailEncrypted) {
    try {
      email = decryptField(doc.emailEncrypted);
    } catch (err) {
      email = doc.email || null;
    }
  }
  return { ...doc, email };
}

// Retire les champs internes/sensibles avant d'envoyer un utilisateur au
// client (jamais le hash du mot de passe, ni les artefacts de chiffrement
// internes de l'email — le client n'en a pas besoin et ça ne doit pas
// pouvoir être exfiltré depuis le navigateur).
function toSafeUser(user) {
  if (!user) return null;
  const { passwordHash, emailHash, emailEncrypted, wordHistory, lessonHistory, ...safe } = user;
  return safe;
}

const VALID_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Langues proposées à l'inscription et pour "ajouter une langue" — même
// liste que les <select> du formulaire d'inscription et du panneau admin.
const SUPPORTED_LANGUAGES = ['en', 'es', 'it', 'ja', 'zh'];

// Réservé à l'admin (wordsip@protonmail.com) — personne d'autre ne peut
// s'inscrire avec ce pseudo, qui identifie le créateur du site.
const RESERVED_PSEUDO = 'wordsip';
const ADMIN_EMAIL = 'wordsip@protonmail.com';

async function addUser({
  pseudo,
  email,
  language,
  level,
  wordDays,
  notificationTime,
  channel,
  revealMode,
  revealSeconds,
}) {
  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashForLookup(normalizedEmail);

  const existing = await usersCollection().findOne({ emailHash });
  if (existing) {
    throw new Error('Cet email est déjà inscrit.');
  }

  const trimmedPseudo = (pseudo || '').trim();
  if (trimmedPseudo.toLowerCase() === RESERVED_PSEUDO && normalizedEmail !== ADMIN_EMAIL) {
    throw new Error('Ce pseudo est réservé.');
  }

  // Filtre pour ne garder que des jours valides, avec un jour par défaut
  // (lundi) si jamais rien n'est fourni, pour ne pas laisser un compte
  // sans aucun jour d'envoi.
  const cleanDays = Array.isArray(wordDays)
    ? wordDays.filter((d) => VALID_DAYS.includes(d))
    : [];
  const finalDays = cleanDays.length > 0 ? cleanDays : ['mon'];

  const newUser = {
    id: nanoid(10),
    pseudo: (pseudo || '').trim(),
    emailHash,
    emailEncrypted: encryptField(normalizedEmail),
    language,
    // Un des 3 niveaux fixes (niveau1/niveau2/niveau3) ; on retombe sur
    // niveau1 si une valeur inattendue est envoyée.
    level: LEVELS[level] ? level : 'niveau1',
    wordDays: finalDays,
    // Conservé pour compatibilité avec le reste du code / d'anciens comptes ;
    // dérivé directement du nombre de jours choisis.
    wordsPerWeek: finalDays.length,
    notificationTime: notificationTime || '08:00',
    channel: channel || 'email',
    revealMode: revealMode || 'manual',
    revealSeconds: revealSeconds || 10,
    wordsValidated: 0,
    // Mots distincts validés par niveau (niveau1/niveau2/niveau3), pour
    // calculer un % d'avancement précis par niveau plutôt qu'un simple
    // compteur global. Vide à l'inscription.
    validatedWords: {},
    // Apprentissage multi-langues : chaque langue ajoutée a sa propre entrée
    // (niveau + progression), pour ne rien perdre en changeant de langue
    // active. Les champs `language`/`level`/`wordsValidated`/`validatedWords`
    // ci-dessus restent en miroir de l'entrée active — tout le reste du code
    // (mot du jour, dictée, progression, cron...) continue de les lire tels
    // quels sans rien savoir du multi-langues.
    languages: [{
      language,
      level: LEVELS[level] ? level : 'niveau1',
      wordsValidated: 0,
      validatedWords: {},
    }],
    activeLanguage: language,
    createdAt: new Date().toISOString(),
  };

  await usersCollection().insertOne(newUser);
  return toUsableUser(newUser);
}

async function getAllUsers() {
  const docs = await usersCollection().find({}).toArray();
  return docs.map(toUsableUser);
}

async function findByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashForLookup(normalizedEmail);

  let doc = await usersCollection().findOne({ emailHash });

  // Compatibilité avec d'éventuels comptes créés avant le chiffrement
  if (!doc) {
    doc = await usersCollection().findOne({ email: normalizedEmail });
  }

  return toUsableUser(doc);
}

async function incrementWordsValidated(email) {
  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashForLookup(normalizedEmail);

  // Sait quelle langue est active pour aussi incrémenter son compteur dans
  // le tableau `languages` (si le compte l'a déjà — comptes migrés/multi-
  // langues) et ne pas perdre ce point de progression en changeant de langue
  // ensuite. Sur un compte "ancienne structure" sans tableau, on incrémente
  // seulement le champ miroir comme avant.
  const existing = await findByEmail(email);
  const activeLanguage = existing && (existing.activeLanguage || existing.language);
  const hasLanguageEntry = existing && Array.isArray(existing.languages)
    && existing.languages.some((l) => l.language === activeLanguage);

  const update = { $inc: { wordsValidated: 1 } };
  const options = { returnDocument: 'after' };
  if (hasLanguageEntry) {
    update.$inc['languages.$[elem].wordsValidated'] = 1;
    options.arrayFilters = [{ 'elem.language': activeLanguage }];
  }

  let result = await usersCollection().findOneAndUpdate({ emailHash }, update, options);

  if (!result) {
    result = await usersCollection().findOneAndUpdate({ email: normalizedEmail }, update, options);
  }

  if (!result) throw new Error('Utilisateur introuvable.');
  return toUsableUser(result);
}

// Enregistre qu'un mot précis a été validé avec succès dans un niveau donné
// (en plus du compteur global). On utilise $addToSet pour ne compter chaque
// mot qu'une seule fois même s'il revient dans la rotation quotidienne et
// est revalidé plusieurs fois — le % d'avancement reflète des mots distincts,
// pas un nombre brut de bonnes réponses.
async function markWordValidated(email, level, word) {
  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashForLookup(normalizedEmail);
  const setKey = `validatedWords.${level}`;

  // Même principe que ci-dessus : mirroir dans le tableau `languages` pour
  // la langue active, quand le compte en a un.
  const existing = await findByEmail(email);
  const activeLanguage = existing && (existing.activeLanguage || existing.language);
  const hasLanguageEntry = existing && Array.isArray(existing.languages)
    && existing.languages.some((l) => l.language === activeLanguage);

  const update = { $addToSet: { [setKey]: word } };
  const options = { returnDocument: 'after' };
  if (hasLanguageEntry) {
    update.$addToSet[`languages.$[elem].validatedWords.${level}`] = word;
    options.arrayFilters = [{ 'elem.language': activeLanguage }];
  }

  let result = await usersCollection().findOneAndUpdate({ emailHash }, update, options);

  if (!result) {
    result = await usersCollection().findOneAndUpdate({ email: normalizedEmail }, update, options);
  }

  if (!result) throw new Error('Utilisateur introuvable.');
  return toUsableUser(result);
}

// Donne le tableau `languages` de l'utilisateur, en migrant à la volée les
// comptes créés avant le multi-langues (pas encore de tableau) : on
// reconstruit une entrée unique à partir des champs miroir existants, sans
// rien écrire en base tant que l'utilisateur n'ajoute pas vraiment de langue.
function effectiveLanguages(user) {
  if (Array.isArray(user.languages) && user.languages.length > 0) return user.languages;
  return [{
    language: user.language,
    level: user.level,
    wordsValidated: user.wordsValidated || 0,
    validatedWords: user.validatedWords || {},
  }];
}

async function getUserLanguages(email) {
  const user = await findByEmail(email);
  if (!user) throw new Error('Utilisateur introuvable.');
  return {
    languages: effectiveLanguages(user),
    activeLanguage: user.activeLanguage || user.language,
  };
}

// Ajoute une nouvelle langue à l'apprentissage de l'utilisateur (progression
// vierge, niveau choisi) et bascule dessus tout de suite pour qu'il puisse
// commencer à apprendre sans étape supplémentaire.
async function addLanguageToUser(email, language, level) {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    throw new Error('Langue non reconnue.');
  }
  const user = await findByEmail(email);
  if (!user) throw new Error('Utilisateur introuvable.');

  const languages = effectiveLanguages(user);
  if (languages.some((l) => l.language === language)) {
    throw new Error('Cette langue est déjà dans ton apprentissage.');
  }

  languages.push({
    language,
    level: LEVELS[level] ? level : 'niveau1',
    wordsValidated: 0,
    validatedWords: {},
  });

  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashForLookup(normalizedEmail);
  await usersCollection().updateOne({ emailHash }, { $set: { languages } });

  // Bascule directement dessus, pour ne pas laisser l'utilisateur sur une
  // langue qu'il vient tout juste de quitter mentalement.
  return switchActiveLanguage(email, language);
}

// Change la langue actuellement affichée sur le site (mot du jour, dictée,
// grammaire...) — sauvegarde d'abord la progression courante dans son
// entrée du tableau `languages` (au cas où elle aurait divergé sur un compte
// migré à la volée), puis remet les champs miroir à jour pour la nouvelle
// langue choisie.
async function switchActiveLanguage(email, language) {
  const user = await findByEmail(email);
  if (!user) throw new Error('Utilisateur introuvable.');

  const currentActive = user.activeLanguage || user.language;
  let languages = effectiveLanguages(user).map((l) => (
    l.language === currentActive
      ? {
        ...l,
        level: user.level,
        wordsValidated: user.wordsValidated || 0,
        validatedWords: user.validatedWords || {},
      }
      : l
  ));

  const target = languages.find((l) => l.language === language);
  if (!target) {
    throw new Error('Cette langue n\'a pas encore été ajoutée à ton apprentissage.');
  }

  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashForLookup(normalizedEmail);

  const result = await usersCollection().findOneAndUpdate(
    { emailHash },
    {
      $set: {
        languages,
        activeLanguage: language,
        language: target.language,
        level: target.level,
        wordsValidated: target.wordsValidated || 0,
        validatedWords: target.validatedWords || {},
      },
    },
    { returnDocument: 'after' }
  );

  if (!result) throw new Error('Utilisateur introuvable.');
  return toUsableUser(result);
}

// Calcule le % d'avancement de l'utilisateur pour chaque niveau, à partir des
// mots distincts déjà validés et du nombre total de mots actifs disponibles
// à ce niveau pour sa langue (fourni par wordService.getLevelWordCounts).
function computeProgress(user, levelWordCounts) {
  const validated = user.validatedWords || {};
  const progress = {};
  for (const level of Object.keys(levelWordCounts)) {
    const total = levelWordCounts[level] || 0;
    const done = (validated[level] || []).length;
    progress[level] = {
      validated: done,
      total,
      percent: total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0,
    };
  }
  return progress;
}

// Définit (ou change) le mot de passe d'un compte existant. Réservé à
// l'admin (voir la route /api/admin/set-password) — il n'y a pas de flux
// public pour ça, seulement toi qui peux protéger un compte via le secret
// admin. bcrypt gère le sel automatiquement, pas besoin de le stocker à part.
async function setPassword(email, plainPassword) {
  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashForLookup(normalizedEmail);
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  let result = await usersCollection().findOneAndUpdate(
    { emailHash },
    { $set: { passwordHash } },
    { returnDocument: 'after' }
  );

  if (!result) {
    result = await usersCollection().findOneAndUpdate(
      { email: normalizedEmail },
      { $set: { passwordHash } },
      { returnDocument: 'after' }
    );
  }

  if (!result) throw new Error('Utilisateur introuvable.');
  return toUsableUser(result);
}

// Vérifie un mot de passe pour un compte. Si le compte n'a pas de mot de
// passe défini (cas normal pour tous les comptes sauf ceux protégés à la
// main via l'admin), on considère qu'aucun mot de passe n'est requis — pour
// ne pas casser la connexion "par email seul" qui reste le mode par défaut.
async function verifyPassword(user, plainPassword) {
  if (!user.passwordHash) return true;
  if (!plainPassword) return false;
  return bcrypt.compare(plainPassword, user.passwordHash);
}

// Supprime définitivement un compte et toutes ses données — utilisé à la
// fois par l'utilisateur lui-même (suppression volontaire) et par l'admin.
async function deleteUser(email) {
  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashForLookup(normalizedEmail);

  const result = await usersCollection().deleteOne({
    $or: [{ emailHash }, { email: normalizedEmail }],
  });

  if (result.deletedCount === 0) throw new Error('Utilisateur introuvable.');
  return true;
}

// Restaure la progression (compteur global + mots validés par niveau) sur
// un compte — utilisé par /api/admin/recreate-account pour ne pas perdre la
// progression d'un utilisateur quand son compte doit être recréé.
async function restoreProgress(email, { wordsValidated, validatedWords }) {
  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashForLookup(normalizedEmail);
  const update = { $set: { wordsValidated: wordsValidated || 0, validatedWords: validatedWords || {} } };

  let result = await usersCollection().findOneAndUpdate({ emailHash }, update, { returnDocument: 'after' });
  if (!result) {
    result = await usersCollection().findOneAndUpdate({ email: normalizedEmail }, update, { returnDocument: 'after' });
  }
  if (!result) throw new Error('Utilisateur introuvable.');
  return toUsableUser(result);
}

// Enregistre une connexion (accès à /api/my-word) — incrémente un compteur
// et met à jour la date de dernière connexion, pour le suivi admin. Volontai-
// rement silencieux en cas d'erreur (ne doit jamais bloquer l'affichage du
// mot du jour pour un souci de comptage).
async function trackLogin(email) {
  try {
    const normalizedEmail = normalizeEmail(email);
    const emailHash = hashForLookup(normalizedEmail);
    const update = { $inc: { loginCount: 1 }, $set: { lastLoginAt: new Date().toISOString() } };

    let result = await usersCollection().updateOne({ emailHash }, update);
    if (result.matchedCount === 0) {
      await usersCollection().updateOne({ email: normalizedEmail }, update);
    }
  } catch (err) {
    // silencieux, voir commentaire ci-dessus
  }
}

async function recordWordSeen(email, entry, now = new Date()) {
  const existing = await findByEmail(email);
  if (!existing) throw new Error('Utilisateur introuvable.');
  const date = now.toISOString().slice(0, 10);
  const same = (existing.wordHistory || []).some((h) => h.language === entry.language && h.level === entry.level && h.word === entry.word && String(h.seenAt).slice(0, 10) === date);
  if (same) return;
  const update = { $push: { wordHistory: { $each: [{ ...entry, seenAt: now.toISOString() }], $slice: -1000 } } };
  const result = await usersCollection().updateOne({ emailHash: hashForLookup(normalizeEmail(email)) }, update);
  if (!result.matchedCount) await usersCollection().updateOne({ email: normalizeEmail(email) }, update);
}

async function recordLessonSeen(email, entry, now=new Date()) {
  const existing=await findByEmail(email);if(!existing)throw new Error('Utilisateur introuvable.');
  const day=now.toISOString().slice(0,10);
  if((existing.lessonHistory||[]).some(h=>h.language===entry.language&&h.level===entry.level&&h.lessonId===entry.lessonId&&String(h.seenAt).slice(0,10)===day))return;
  const update={$push:{lessonHistory:{$each:[{...entry,seenAt:now.toISOString()}],$slice:-1000}}};
  const result=await usersCollection().updateOne({emailHash:hashForLookup(normalizeEmail(email))},update);
  if(!result.matchedCount)await usersCollection().updateOne({email:normalizeEmail(email)},update);
}

module.exports = {
  recordLessonSeen,
  recordWordSeen,
  addUser,
  getAllUsers,
  findByEmail,
  incrementWordsValidated,
  markWordValidated,
  computeProgress,
  restoreProgress,
  setPassword,
  verifyPassword,
  toSafeUser,
  normalizeEmail,
  deleteUser,
  trackLogin,
  getUserLanguages,
  addLanguageToUser,
  switchActiveLanguage,
  SUPPORTED_LANGUAGES,
};
