// Double vérification du domaine email, sans jamais envoyer de mail ni
// faire attendre l'utilisateur avec une étape de confirmation :
// 1. Le domaine est-il dans la liste connue des emails jetables/temporaires
//    (Mailinator, Yopmail, 10minutemail...) ?
// 2. Le domaine a-t-il de vrais serveurs de messagerie configurés (MX) ?
//
// Note : une vérification SMTP directe (tenter d'envoyer un email et voir si
// ça échoue) a été envisagée mais écartée : de nombreux hébergeurs cloud
// (dont probablement Render) bloquent le port sortant nécessaire pour ça,
// et beaucoup de fournisseurs mail bloquent ou faussent ce genre de sonde.
// La combinaison liste noire + MX est l'approche fiable et sans friction.
const dns = require('dns').promises;
const disposableDomains = require('disposable-email-domains');
const disposableWildcards = require('disposable-email-domains/wildcard.json');

const disposableSet = new Set(disposableDomains);

function isDisposableDomain(domain) {
  if (disposableSet.has(domain)) return true;
  // Vérifie aussi les sous-domaines de wildcards connus (ex. *.33mail.com)
  return disposableWildcards.some((wildcard) => domain.endsWith(`.${wildcard}`) || domain === wildcard);
}

async function domainHasMailServer(domain) {
  try {
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch (err) {
    return false;
  }
}

// Retourne { valid: true } ou { valid: false, reason: '...' }
async function checkEmailDomain(email) {
  const domain = (email || '').split('@')[1]?.toLowerCase().trim();
  if (!domain) return { valid: false, reason: "Le format de l'email ne semble pas valide." };

  if (isDisposableDomain(domain)) {
    return { valid: false, reason: 'Les adresses email temporaires/jetables ne sont pas acceptées.' };
  }

  const hasMailServer = await domainHasMailServer(domain);
  if (!hasMailServer) {
    return { valid: false, reason: "Ce nom de domaine ne semble pas exister ou ne peut pas recevoir d'emails." };
  }

  return { valid: true };
}

module.exports = { checkEmailDomain, isDisposableDomain, domainHasMailServer };
