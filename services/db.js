const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function connectDB() {
  if (db) return db;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI non configurée.');
  }

  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db('wordsip');
  console.log('Connexion à MongoDB établie.');
  return db;
}

function getDB() {
  if (!db) throw new Error('Base de données non initialisée — appelle connectDB() au démarrage du serveur.');
  return db;
}

module.exports = { connectDB, getDB };
