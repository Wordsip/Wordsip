const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const { execFile } = require('child_process');
const sharp = require('sharp');
const { downloadTTS } = require('./ttsService');

const TMP_DIR = path.join(__dirname, '..', 'tmp');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'videos');

function ensureDirs() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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

// Génère l'image "carte mot du jour" (mot + phonétique + traduction), utilisée
// pour la petite vidéo jointe au tweet quotidien.
async function generateWordCardImage(wordEntry, outputPath) {
  const svg = `
    <svg width="720" height="720" xmlns="http://www.w3.org/2000/svg">
      <rect width="720" height="720" fill="#2b7a78"/>
      <text x="360" y="60" font-family="sans-serif" font-size="28" fill="white" opacity="0.8" text-anchor="middle">🥤 WordSip</text>
      <text x="360" y="340" font-family="sans-serif" font-size="64" fill="white" text-anchor="middle" font-weight="bold">${escapeXml(wordEntry.word)}</text>
      <text x="360" y="390" font-family="sans-serif" font-size="28" fill="white" opacity="0.85" text-anchor="middle">${escapeXml(wordEntry.phonetic || '')}</text>
      <text x="360" y="450" font-family="sans-serif" font-size="36" fill="white" text-anchor="middle">🇫🇷 ${escapeXml(wordEntry.translation)}</text>
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

// Génère la vidéo hebdomadaire complète : pour chaque réplique, une image de
// bulle + sa voix, assemblées bout à bout en une seule vidéo courte.
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

  const finalPath = path.join(OUTPUT_DIR, `weekly-${sessionId}.mp4`);
  const concatListPath = path.join(TMP_DIR, `concat-${sessionId}.txt`);
  fs.writeFileSync(concatListPath, clipPaths.map((p) => `file '${p}'`).join('\n'));

  await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', '-y', finalPath]);

  [...clipPaths, concatListPath].forEach((p) => {
    try { fs.unlinkSync(p); } catch (e) { /* ignore */ }
  });

  return `/videos/weekly-${sessionId}.mp4`;
}

// Génère une courte vidéo (image du mot + voix qui le prononce) pour
// l'attacher au tweet quotidien — X n'accepte pas l'audio seul, donc on
// l'habille en petite vidéo, comme pour la vidéo hebdomadaire.
async function generateWordClip(wordEntry, language) {
  ensureDirs();
  const sessionId = Date.now();

  const audioPath = path.join(TMP_DIR, `word-audio-${sessionId}.mp3`);
  await downloadTTS(wordEntry.word, language, audioPath);

  const imagePath = path.join(TMP_DIR, `word-card-${sessionId}.png`);
  await generateWordCardImage(wordEntry, imagePath);

  const clipPath = path.join(TMP_DIR, `word-clip-${sessionId}.mp4`);
  await runFfmpeg([
    '-loop', '1', '-i', imagePath,
    '-i', audioPath,
    '-c:v', 'libx264', '-tune', 'stillimage',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-shortest', '-y', clipPath,
  ]);

  fs.unlinkSync(audioPath);
  fs.unlinkSync(imagePath);

  return clipPath; // Chemin local temporaire (pas dans /public, car uploadé puis supprimé)
}

module.exports = { generateWeeklyVideo, generateWordClip };
