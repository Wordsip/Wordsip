const { nanoid } = require('nanoid');
const { getDB } = require('./db');
const { encryptField, decryptField, hashForLookup } = require('./crypto');

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
  track,
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
    level: level || 'beginner',
    wordDays: finalDays,
    // Conservé pour compatibilité avec le reste du code / d'anciens comptes ;
    // dérivé directement du nombre de jours choisis.
    wordsPerWeek: finalDays.length,
    notificationTime: notificationTime || '08:00',
    channel: channel || 'email',
    revealMode: revealMode || 'manual',
    revealSeconds: revealSeconds || 10,
    track: track === 'complet' ? 'complet' : 'rapide',
    wordsValidated: 0,
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

module.exports = {
  addUser,
  getAllUsers,
  findByEmail,
  incrementWordsValidated,
  normalizeEmail,
  deleteUser,
};
