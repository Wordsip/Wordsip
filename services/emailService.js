// Appel direct à l'API Brevo via fetch (natif à Node.js 18+), sans dépendance
// tierce, pour éviter les vulnérabilités du SDK officiel (qui utilise une
// bibliothèque HTTP obsolète en interne).

async function sendRawEmail({ to, subject, htmlContent }) {
  if (!process.env.BREVO_API_KEY) {
    console.log(`[SIMULATION] Email non envoyé (pas de clé Brevo configurée) à ${to} : ${subject}`);
    return { simulated: true };
  }

  const body = {
    sender: { email: process.env.SENDER_EMAIL || 'wordsip@protonmail.com', name: 'WordSip' },
    to: [{ email: to }],
    subject,
    htmlContent,
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo API error (${response.status}): ${errorText}`);
  }

  return { simulated: false };
}

async function sendWordEmail(user, wordEntry) {
  const examplesHtml = (wordEntry.examples || [wordEntry.example])
    .filter(Boolean)
    .map((ex, i) => `<p>${i + 1}. ${ex}</p>`)
    .join('');

  const g = wordEntry.grammar || {};
  const s = wordEntry.slang || {};

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h1 style="color: #2b7a78;">${wordEntry.word}</h1>
      <p style="font-style: italic; color: #666;">${wordEntry.phonetic || ''}</p>
      <p><strong>Traduction :</strong> ${wordEntry.translation}</p>
      <div style="margin-top:12px;"><strong>Exemples :</strong>${examplesHtml}</div>
      <div style="margin-top:12px;">
        <strong>Grammaire :</strong>
        <p>${g.nature || ''}</p>
        <p>${g.position || ''}</p>
      </div>
      ${s.expression ? `<div style="margin-top:12px;background:#fff8e6;padding:10px;border-radius:8px;">
        <strong>Argot :</strong> "${s.expression}" — ${s.meaning || ''}
      </div>` : ''}
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #999;">
        Bonjour ${user.pseudo}, voici ton mot du jour WordSip !<br>
        Une question ? Écris-nous à ${process.env.CONTACT_EMAIL || 'wordsip@protonmail.com'}
      </p>
    </div>
  `;

  try {
    await sendRawEmail({
      to: user.email,
      subject: `Ton mot du jour WordSip : ${wordEntry.word}`,
      htmlContent,
    });
    console.log(`Email envoyé à ${user.email}`);
  } catch (error) {
    console.error(`Erreur lors de l'envoi à ${user.email} :`, error.message);
  }
}

module.exports = { sendWordEmail, sendWelcomeEmail };

// Email de bienvenue simple, purement informatif, envoyé juste après
// l'inscription — aucun lien à cliquer, aucun blocage d'accès. Sert
// uniquement à rassurer l'utilisateur que son inscription a bien fonctionné.
async function sendWelcomeEmail(user) {
  const languageLabels = { en: 'anglais', es: 'espagnol', it: 'italien', ja: 'japonais', zh: 'chinois' };
  const languageLabel = languageLabels[user.language] || user.language;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h1 style="color: #2b7a78;">Bienvenue sur WordSip 🎉</h1>
      <p>Bonjour ${user.pseudo},</p>
      <p>Ton inscription est bien confirmée ! Tu vas apprendre l'<strong>${languageLabel}</strong>, ${user.wordDays && user.wordDays.length ? `avec un mot livré ${user.wordDays.length} jour(s) par semaine` : 'à ton rythme'}.</p>
      <p>Ton premier mot arrive bientôt à l'heure choisie (${user.notificationTime || '08:00'}). En attendant, tu peux dès maintenant explorer ton espace sur le site.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #999;">
        Une question ? Écris-nous à ${process.env.CONTACT_EMAIL || 'wordsip@protonmail.com'}
      </p>
    </div>
  `;

  try {
    await sendRawEmail({
      to: user.email,
      subject: 'Bienvenue sur WordSip — ton inscription est confirmée !',
      htmlContent,
    });
    console.log(`Email de bienvenue envoyé à ${user.email}`);
  } catch (error) {
    console.error(`Erreur lors de l'envoi de l'email de bienvenue à ${user.email} :`, error.message);
  }
}
