const crypto = require('crypto');
const { getDB } = require('./db');

function sessionsCollection() {
  return getDB().collection('sessions');
}

// Durée de vie d'une session : 30 jours glissants (chaque visite avec cookie
// valide pourrait la prolonger, mais on garde simple pour l'instant — une
// session dure 30 jours depuis la connexion, puis il faut se reconnecter).
const SESSION_DAYS = 30;

// Crée une nouvelle session pour cet email et renvoie un jeton aléatoire
// (256 bits) à stocker dans un cookie — jamais l'email en clair côté client.
async function createSession(email) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86400000);
  await sessionsCollection().insertOne({
    token,
    email: email.trim().toLowerCase(),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
  return { token, expiresAt };
}

// Résout un jeton de cookie en email, ou null si absent/expiré/invalide.
// Nettoie au passage les sessions expirées qu'elle rencontre.
async function getEmailFromToken(token) {
  if (!token) return null;
  const session = await sessionsCollection().findOne({ token });
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    await sessionsCollection().deleteOne({ token });
    return null;
  }
  return session.email;
}

async function deleteSession(token) {
  if (!token) return;
  await sessionsCollection().deleteOne({ token });
}

// Invalide toutes les sessions d'un compte — utile si on veut forcer une
// déconnexion partout (pas branché à une action précise pour l'instant,
// disponible pour plus tard, ex. "se déconnecter de tous les appareils").
async function deleteAllSessionsForEmail(email) {
  await sessionsCollection().deleteMany({ email: email.trim().toLowerCase() });
}

module.exports = {
  createSession,
  getEmailFromToken,
  deleteSession,
  deleteAllSessionsForEmail,
  SESSION_DAYS,
};
