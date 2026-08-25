const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

function readUsers() {
  const raw = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function addUser({
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
  const users = readUsers();

  const existing = users.find((u) => u.email === email);
  if (existing) {
    throw new Error('Cet email est déjà inscrit.');
  }

  const newUser = {
    id: nanoid(10),
    pseudo,
    email,
    language,
    level: level || 'beginner',
    wordsPerWeek: wordsPerWeek || 3,
    // Heure choisie par l'utilisateur (format "HH:MM", heure du serveur)
    notificationTime: notificationTime || '08:00',
    // "email", "whatsapp" ou "site" (pas de notification, pratique sur le site uniquement)
    channel: channel || 'email',
    // "manual" (bouton "je suis prêt") ou "timer" (minuteur automatique)
    revealMode: revealMode || 'manual',
    revealSeconds: revealSeconds || 10,
    // "rapide" (198 mots, 6 sous-niveaux) ou "complet" (~500 mots, 15 sous-niveaux)
    track: track === 'complet' ? 'complet' : 'rapide',
    // Progression : nombre de mots validés à l'exercice d'écriture (fait avancer le sous-niveau)
    wordsValidated: 0,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);
  return newUser;
}

function getAllUsers() {
  return readUsers();
}

function findByEmail(email) {
  const users = readUsers();
  return users.find((u) => u.email === email) || null;
}

function incrementWordsValidated(email) {
  const users = readUsers();
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error('Utilisateur introuvable.');

  user.wordsValidated = (user.wordsValidated || 0) + 1;
  writeUsers(users);
  return user;
}

module.exports = { addUser, getAllUsers, findByEmail, incrementWordsValidated };
