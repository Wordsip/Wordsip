const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendWordEmail(user, wordEntry) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[SIMULATION] Email non envoyé (pas de clé SendGrid configurée) à ${user.email} : ${wordEntry.word}`);
    return;
  }

  const msg = {
    to: user.email,
    from: process.env.SENDER_EMAIL || 'noreply@wordsip.example.com',
    subject: `Ton mot du jour WordSip : ${wordEntry.word}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h1 style="color: #2b7a78;">${wordEntry.word}</h1>
        <p style="font-style: italic; color: #666;">${wordEntry.phonetic}</p>
        <p><strong>Traduction :</strong> ${wordEntry.translation}</p>
        <p><strong>Exemple :</strong> ${wordEntry.example}</p>
        <p><strong>Grammaire :</strong> ${wordEntry.grammar}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">
          Bonjour ${user.pseudo}, voici ton mot du jour WordSip !<br>
          Une question ? Écris-nous à ${process.env.CONTACT_EMAIL || 'wordsip@protonmail.com'}
        </p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email envoyé à ${user.email}`);
  } catch (error) {
    console.error(`Erreur lors de l'envoi à ${user.email} :`, error.message);
  }
}

module.exports = { sendWordEmail };
