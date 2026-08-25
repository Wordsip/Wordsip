const { TwitterApi } = require('twitter-api-v2');

function getClient() {
  if (
    !process.env.TWITTER_API_KEY ||
    !process.env.TWITTER_API_SECRET ||
    !process.env.TWITTER_ACCESS_TOKEN ||
    !process.env.TWITTER_ACCESS_SECRET
  ) {
    return null;
  }

  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });
}

function composeTweetText(wordEntry, languageLabel) {
  const hashtag = `#Learn${languageLabel.replace(/\s/g, '')}`;

  let text = `📚 Mot du jour WordSip :\n\n${wordEntry.word}`;
  if (wordEntry.phonetic) text += ` ${wordEntry.phonetic}`;
  text += `\n🇫🇷 ${wordEntry.translation}`;
  text += `\n\n💬 "${wordEntry.example}"`;
  text += `\n\nApprends un mot par jour 🥤`;
  text += `\n${hashtag} #WordOfTheDay`;

  // Sécurité : Twitter/X limite à 280 caractères
  if (text.length > 280) {
    text = text.slice(0, 277) + '...';
  }

  return text;
}

async function postDailyTweet(wordEntry, languageLabel) {
  const client = getClient();

  if (!client) {
    console.log('[SIMULATION] Clés Twitter non configurées, tweet non publié.');
    return { simulated: true, text: composeTweetText(wordEntry, languageLabel) };
  }

  const text = composeTweetText(wordEntry, languageLabel);

  try {
    const result = await client.v2.tweet(text);
    console.log('Tweet publié avec succès :', result.data.id);
    return { simulated: false, text, tweetId: result.data.id };
  } catch (error) {
    console.error('Erreur lors de la publication du tweet :', error.message);
    return { simulated: false, error: error.message, text };
  }
}

module.exports = { postDailyTweet, composeTweetText };
