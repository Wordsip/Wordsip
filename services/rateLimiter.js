// Limiteur de débit minimaliste, sans dépendance externe : suffisant pour
// protéger une route ouverte (comme /api/tts) contre un usage abusif en tant
// que proxy gratuit, sans avoir besoin d'un store partagé (Redis, etc.) —
// un seul process Render suffit pour ce projet.
const hits = new Map(); // ip -> [timestamps]

function cleanup(timestamps, windowMs, now) {
  return timestamps.filter((t) => now - t < windowMs);
}

// windowMs : durée de la fenêtre glissante ; max : nombre de requêtes max
// autorisées par IP sur cette fenêtre.
function rateLimit({ windowMs = 60_000, max = 20 } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();

    const existing = cleanup(hits.get(ip) || [], windowMs, now);
    if (existing.length >= max) {
      return res.status(429).json({ error: 'Trop de requêtes, réessaie dans un instant.' });
    }

    existing.push(now);
    hits.set(ip, existing);
    next();
  };
}

// Purge périodique pour ne pas accumuler indéfiniment des IP inactives en
// mémoire (le processus tourne en continu sur Render).
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of hits.entries()) {
    const kept = cleanup(timestamps, 5 * 60_000, now);
    if (kept.length === 0) hits.delete(ip);
    else hits.set(ip, kept);
  }
}, 5 * 60_000).unref();

module.exports = { rateLimit };
