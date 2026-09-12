// Formate le champ "phonetic" d'un mot pour l'affichage, qu'il s'agisse
// d'une simple chaîne (it/ja/zh), ou d'un objet à variantes régionales —
// {us, uk} pour l'anglais, {es, latam} pour l'espagnol, etc. Générique : on
// affiche chaque paire clé/valeur présente, dans l'ordre où elle apparaît.
const REGION_LABELS = { us: 'US', uk: 'UK', es: 'ES', latam: 'LATAM' };

function formatPhonetic(phonetic) {
  if (!phonetic) return '';
  if (typeof phonetic === 'string') return phonetic;
  const parts = [];
  for (const [region, value] of Object.entries(phonetic)) {
    if (value) parts.push(`${REGION_LABELS[region] || region.toUpperCase()} ${value}`);
  }
  return parts.join('  ·  ');
}

module.exports = { formatPhonetic };
