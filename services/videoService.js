const fs = require('fs');
const path = require('path');
const https = require('https');
const ffmpegPath = require('ffmpeg-static');
const { execFile } = require('child_process');
const googleTTS = require('google-tts-api');
const sharp = require('sharp');

const TMP_DIR = path.join(__dirname, '..', 'tmp');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'videos');

function ensureDirs() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Télécharge l'audio TTS gratuit (Google Translate) pour une phrase donnée
function downloadTTS(text, lang, outputPath) {
  return new Promise((resolve, reject) => {
    const url = googleTTS.getAudioUrl(text, { lang, slow: false });
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

// Échappe le texte pour un usage sûr en SVG (caractères spéciaux XML)
function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Coupe le texte en plusieurs lignes pour qu'il rentre dans la bulle
function wrapText(text, maxCharsPerLine) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxCharsPerLine) {
      lines.push(current.trim());
      current = word;
    } else {
      current += ' ' + word;
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

// Génère l'image de la bulle de dialogue (fond coloré + texte centré)
async function generateBubbleImage(speaker, text, outputPath) {
  const bgColor = speaker === 'A' ? '#2b7a78' : '#3aafa9';
  const lines = wrapText(text, 26);
  const lineHeight = 44;
  const startY = 360 - ((lines.length - 1) * lineHeight) / 2;

  const textElements = lines
    .map((line, i) => `<text x="360" y="${startY + i * lineHeight}" font-family="sans-serif" font-size="34" fill="white" text-anchor="middle">${escapeXml(line)}</text>`)
    .join('\n');

  const svg = `
    <svg width="720" height="720" xmlns="http://www.w3.org/2000/svg">
      <rect width="720" height="720" fill="${bgColor}"/>
      <circle cx="360" cy="230" r="50" fill="white" opacity="0.15"/>
      <text x="360" y="245" font-family="sans-serif" font-size="48" fill="white" text-anchor="middle" font-weight="bold">${speaker}</text>
      ${textElements}
    </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  return outputPath;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath, args, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr));
      else resolve();
    });
  });
}

// Génère la vidéo complète : pour chaque réplique, une image de bulle + sa voix,
// assemblées bout à bout en une seule vidéo courte (~10 secondes au total).
async function generateWeeklyVideo(dialogue, language) {
  ensureDirs();
  const sessionId = Date.now();
  const clipPaths = [];

  for (let i = 0; i < dialogue.lines.length; i++) {
    const line = dialogue.lines[i];
    const audioPath = path.join(TMP_DIR, `line-${sessionId}-${i}.mp3`);
    await downloadTTS(line.text, language, audioPath);

    const imagePath = path.join(TMP_DIR, `bubble-${sessionId}-${i}.png`);
    await generateBubbleImage(line.speaker, line.text, imagePath);

    const clipPath = path.join(TMP_DIR, `clip-${sessionId}-${i}.mp4`);
    await runFfmpeg([
      '-loop', '1', '-i', imagePath,
      '-i', audioPath,
      '-c:v', 'libx264', '-tune', 'stillimage',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k',
      '-shortest', '-y', clipPath,
    ]);

    clipPaths.push(clipPath);
    fs.unlinkSync(audioPath);
    fs.unlinkSync(imagePath);
  }

  // Concatène les clips en une seule vidéo finale
  const finalPath = path.join(OUTPUT_DIR, `weekly-${sessionId}.mp4`);
  const concatListPath = path.join(TMP_DIR, `concat-${sessionId}.txt`);
  fs.writeFileSync(concatListPath, clipPaths.map((p) => `file '${p}'`).join('\n'));

  await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', '-y', finalPath]);

  [...clipPaths, concatListPath].forEach((p) => {
    try { fs.unlinkSync(p); } catch (e) { /* ignore */ }
  });

  return `/videos/weekly-${sessionId}.mp4`;
}

module.exports = { generateWeeklyVideo };
