// Chiffrement des données sensibles (email, futur numéro de téléphone) avec
// les outils natifs de Node.js (module "crypto"), donc aucune dépendance
// supplémentaire et aucun risque de vulnérabilité tierce.
//
// Comme l'email sert aussi d'identifiant pour retrouver un compte (connexion,
// envoi des mots du jour...), on ne peut pas juste le chiffrer et le
// rechercher directement : le chiffrement AES change de résultat à chaque
// fois même pour la même valeur (à cause d'un vecteur aléatoire). La solution
// standard : on stocke DEUX choses côté email —
//   - un "hash" déterministe (toujours identique pour le même email) qui sert
//     UNIQUEMENT à le retrouver en base, sans jamais révéler l'email en clair
//   - la version chiffrée (réversible) qui sert à récupérer le vrai email
//     quand on a besoin de l'utiliser (ex. envoyer un mail)
const crypto = require('crypto');

function getKey() {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY manquante ou invalide (doit faire 64 caractères hexadécimaux = 32 octets).');
  }
  return Buffer.from(keyHex, 'hex');
}

// Chiffrement réversible (AES-256-GCM) — pour stocker une donnée qu'on doit
// pouvoir relire en clair plus tard (email à utiliser, futur numéro de tél.)
function encryptField(plainText) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // On stocke iv + authTag + données chiffrées ensemble, encodés en base64
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decryptField(encryptedBase64) {
  const key = getKey();
  const data = Buffer.from(encryptedBase64, 'base64');
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

// Hash déterministe (HMAC-SHA256) — sert uniquement à retrouver un compte par
// email en base, sans jamais stocker ni exposer l'email en clair pour ça.
function hashForLookup(value) {
  const key = getKey();
  return crypto.createHmac('sha256', key).update(String(value).trim().toLowerCase()).digest('hex');
}

module.exports = { encryptField, decryptField, hashForLookup };
