const { nanoid } = require('nanoid');
const { getDB } = require('./db');

function usersCollection() {
  return getDB().collection('users');
}

// Normalise l'email (espaces + majuscules) pour éviter les doublons du type
// "Test@Test.com" vs "test@test.com" qui passeraient à travers une comparaison stricte.
function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

async function addUser({
  pseudo,
  email,
  language,
  level,
  wordsPerWeek,
  notificationTime,
  channel,
  revealMode,
  revealSeconds,
  track,
}) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await usersCollection().findOne({ email: normalizedEmail });
  if (existing) {
    throw new Error('Cet email est déjà inscrit.');
  }

  const newUser = {
    id: nanoid(10),
    pseudo: (pseudo || '').trim(),
    email: normalizedEmail,
    language,
    level: level || 'beginner',
    wordsPerWeek: wordsPerWeek || 3,
    notificationTime: notificationTime || '08:00',
    channel: channel || 'email',
    revealMode: revealMode || 'manual',
    revealSeconds: revealSeconds || 10,
    track: track === 'complet' ? 'complet' : 'rapide',
    wordsValidated: 0,
    createdAt: new Date().toISOString(),
  };

  await usersCollection().insertOne(newUser);
  return newUser;
}

async function getAllUsers() {
  return usersCollection().find({}).toArray();
}

async function findByEmail(email) {
  return usersCollection().findOne({ email: normalizeEmail(email) });
}

async function incrementWordsValidated(email) {
  const normalizedEmail = normalizeEmail(email);
  const result = await usersCollection().findOneAndUpdate(
    { email: normalizedEmail },
    { $inc: { wordsValidated: 1 } },
    { returnDocument: 'after' }
  );

  if (!result) throw new Error('Utilisateur introuvable.');
  return result;
}

module.exports = { addUser, getAllUsers, findByEmail, incrementWordsValidated, normalizeEmail };
