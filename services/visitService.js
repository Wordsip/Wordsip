const { getDB } = require('./db');
const { hashForLookup } = require('./crypto');

function visitsCollection() {
  return getDB().collection('visits');
}

// Enregistre une visite : une IP hachée (jamais stockée en clair, même
// méthode que pour les emails) = un document unique. Le compte de documents
// dans la collection donne directement le nombre de visiteurs uniques
// (au sens "IP jamais vue avant"), et visitCount le nombre total de visites.
async function trackVisit(ip) {
  if (!ip) return;
  const ipHash = hashForLookup(ip);
  const now = new Date().toISOString();

  await visitsCollection().updateOne(
    { _id: ipHash },
    {
      $set: { lastSeen: now },
      $setOnInsert: { firstSeen: now },
      $inc: { visitCount: 1 },
    },
    { upsert: true }
  );
}

// Stats globales pour le panneau admin : visiteurs uniques (nb de documents)
// et total de visites cumulées (somme de visitCount).
async function getVisitStats() {
  const uniqueVisitors = await visitsCollection().countDocuments();
  const agg = await visitsCollection()
    .aggregate([{ $group: { _id: null, total: { $sum: '$visitCount' } } }])
    .toArray();
  const totalVisits = agg[0]?.total || 0;
  return { uniqueVisitors, totalVisits };
}

module.exports = { trackVisit, getVisitStats };
