const SibApiV3Sdk = require('@sendinblue/client');

let apiInstance = null;
if (process.env.BREVO_API_KEY) {
  apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
}

async function sendWordEmail(user, wordEntry) {
  if (!apiInstance) {
    console.log(`[SIMULATION] Email non envoyé (pas de clé Brevo configurée) à ${user.email} : ${wordEntry.word}`);
    return;
  }

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

  const email = {
    to: [{ email: user.email }],
    sender: { email: process.env.SENDER_EMAIL || 'noreply@wordsip.example.com', name: 'WordSip' },
    subject: `Ton mot du jour WordSip : ${wordEntry.word}`,
    htmlContent,
  };

  try {
    await apiInstance.sendTransacEmail(email);
    console.log(`Email envoyé à ${user.email}`);
  } catch (error) {
    console.error(`Erreur lors de l'envoi à ${user.email} :`, error.message);
  }
}

module.exports = { sendWordEmail };
