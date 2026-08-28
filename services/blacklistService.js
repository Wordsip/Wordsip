// Liste noire manuelle d'adresses email précises, gérée par l'admin —
// s'ajoute à la liste noire automatique des domaines jetables.
const { getDB } = require('./db');
const { normalizeEmail } = require('./userService');

function blacklistCollection() {
  return getDB().collection('emailBlacklist');
}

async function isBlacklisted(email) {
  const doc = await blacklistCollection().findOne({ email: normalizeEmail(email) });
  return !!doc;
}

async function addToBlacklist(email) {
  const normalizedEmail = normalizeEmail(email);
  await blacklistCollection().updateOne(
    { email: normalizedEmail },
    { $set: { email: normalizedEmail, addedAt: new Date().toISOString() } },
    { upsert: true }
  );
}

async function removeFromBlacklist(email) {
  await blacklistCollection().deleteOne({ email: normalizeEmail(email) });
}

async function getBlacklist() {
  return blacklistCollection().find({}).toArray();
}

module.exports = { isBlacklisted, addToBlacklist, removeFromBlacklist, getBlacklist };
