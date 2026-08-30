// Service de synthèse vocale partagé — utilisé à la fois pour l'audio joué
// directement sur le site et pour les vidéos (hebdomadaire + tweet quotidien).
const fs = require('fs');
const https = require('https');

function buildGoogleTTSUrl(text, lang) {
  const encoded = encodeURIComponent(text);
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob`;
}

// Télécharge l'audio dans un fichier (utilisé pour assembler des vidéos)
function downloadTTS(text, lang, outputPath) {
  return new Promise((resolve, reject) => {
    const url = buildGoogleTTSUrl(text, lang);
    const file = fs.createWriteStream(outputPath);

    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(outputPath); });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// Relaie directement le flux audio (utilisé pour le bouton 🔊 du site, sans
// jamais exposer l'URL Google directement au navigateur)
function streamTTS(text, lang, res) {
  const url = buildGoogleTTSUrl(text, lang);
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (googleRes) => {
    res.setHeader('Content-Type', 'audio/mpeg');
    googleRes.pipe(res);
  }).on('error', () => {
    res.status(500).end();
  });
}

module.exports = { buildGoogleTTSUrl, downloadTTS, streamTTS };
