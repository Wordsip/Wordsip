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
  const { passwordHash, emailHash, emailEncrypted, ...safe } = user;
  return safe;
}

const VALID_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

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

  let result = await usersCollection().findOneAndUpdate(
    { emailHash },
    { $inc: { wordsValidated: 1 } },
    { returnDocument: 'after' }
  );

  if (!result) {
    result = await usersCollection().findOneAndUpdate(
      { email: normalizedEmail },
      { $inc: { wordsValidated: 1 } },
      { returnDocument: 'after' }
    );
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

  let result = await usersCollection().findOneAndUpdate(
    { emailHash },
    { $addToSet: { [setKey]: word } },
    { returnDocument: 'after' }
  );

  if (!result) {
    result = await usersCollection().findOneAndUpdate(
      { email: normalizedEmail },
      { $addToSet: { [setKey]: word } },
      { returnDocument: 'after' }
    );
  }

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

module.exports = {
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
};
