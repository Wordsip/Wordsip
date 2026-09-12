const { TwitterApi } = require('twitter-api-v2');
const { formatPhonetic } = require('./phoneticFormat');

// La librairie twitter-api-v2 met le vrai détail renvoyé par X dans
// error.data (title/detail/type), mais error.message seul ne montre souvent
// que "Request failed with code 403" — inutile pour diagnostiquer. Cette
// fonction récupère le détail exploitable quand il existe.
function describeTwitterError(error) {
  const detail = error?.data?.detail || error?.data?.title || error?.error;
  return detail ? `${error.message} — ${detail}` : error.message;
}

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
  const firstExample = (wordEntry.examples && wordEntry.examples[0]) || wordEntry.example || '';
  const slang = wordEntry.slang || {};
  const siteUrl = process.env.SITE_URL || 'https://wordsip.onrender.com';

  let text = `📚 Mot du jour WordSip :\n\n${wordEntry.word}`;
  if (wordEntry.phonetic) text += ` ${formatPhonetic(wordEntry.phonetic)}`;
  text += `\n🇫🇷 ${wordEntry.translation}`;
  if (firstExample) text += `\n\n💬 "${firstExample}"`;
  if (slang.expression) text += `\n\n🗣️ Argot : "${slang.expression}"`;
  text += `\n\n${siteUrl}`;
  text += `\n${hashtag} #WordOfTheDay`;

  // Sécurité : Twitter/X limite à 280 caractères
  if (text.length > 280) {
    text = text.slice(0, 277) + '...';
  }

  return text;
}

// Publie le tweet quotidien en texte seul. La version avec vidéo jointe
// (image + prononciation) a été testée mais retirée temporairement : elle
// consommait trop de ressources pour le plan gratuit de Render et a provoqué
// des plantages en cascade ayant aussi affecté l'envoi des emails. À
// réintroduire plus tard avec un traitement moins lourd (ex. génération à
// l'avance, en dehors du chemin critique de la requête).
async function postDailyTweet(wordEntry, languageLabel) {
  const client = getClient();
  const text = composeTweetText(wordEntry, languageLabel);

  if (!client) {
    console.log('[SIMULATION] Clés Twitter non configurées, tweet non publié.');
    return { simulated: true, text };
  }

  try {
    const result = await client.v2.tweet(text);
    console.log('Tweet publié avec succès :', result.data.id);
    return { simulated: false, text, tweetId: result.data.id };
  } catch (error) {
    console.error('Erreur lors de la publication du tweet :', describeTwitterError(error));
    return { simulated: false, error: describeTwitterError(error), text };
  }
}

function composeExpressionTweetText(expressionEntry, languageLabel) {
  const hashtag = `#Learn${languageLabel.replace(/\s/g, '')}`;
  const siteUrl = process.env.SITE_URL || 'https://wordsip.onrender.com';

  let text = `💡 Expression de la semaine WordSip :\n\n"${expressionEntry.expression}"`;
  if (expressionEntry.phonetic) text += ` ${formatPhonetic(expressionEntry.phonetic)}`;
  text += `\n🇫🇷 Sens : ${expressionEntry.meaning}`;
  if (expressionEntry.literalMeaning) text += `\n(Littéralement : ${expressionEntry.literalMeaning})`;
  text += `\n\n${siteUrl}`;
  text += `\n${hashtag} #ExpressionOfTheWeek`;

  if (text.length > 280) {
    text = text.slice(0, 277) + '...';
  }

  return text;
}

async function postExpressionTweet(expressionEntry, languageLabel) {
  const client = getClient();
  const text = composeExpressionTweetText(expressionEntry, languageLabel);

  if (!client) {
    console.log('[SIMULATION] Clés Twitter non configurées, tweet non publié.');
    return { simulated: true, text };
  }

  try {
    const result = await client.v2.tweet(text);
    console.log('Tweet expression publié avec succès :', result.data.id);
    return { simulated: false, text, tweetId: result.data.id };
  } catch (error) {
    console.error('Erreur lors de la publication du tweet expression :', describeTwitterError(error));
    return { simulated: false, error: describeTwitterError(error), text };
  }
}

module.exports = { postDailyTweet, composeTweetText, postExpressionTweet, composeExpressionTweetText, postJokeTweet, composeJokeTweetText };

function composeJokeTweetText(jokeEntry, languageLabel) {
  const hashtag = `#Learn${languageLabel.replace(/\s/g, '')}`;
  const siteUrl = process.env.SITE_URL || 'https://wordsip.onrender.com';

  let text = `😄 La blague du dimanche WordSip :\n\n${jokeEntry.joke}`;
  if (jokeEntry.phonetic) text += ` (${formatPhonetic(jokeEntry.phonetic)})`;
  if (jokeEntry.punchline) text += `\n${jokeEntry.punchline}`;
  text += `\n\n🇫🇷 ${jokeEntry.translation}`;
  text += `\n\n${siteUrl}`;
  text += `\n${hashtag} #JokeOfTheWeek`;

  if (text.length > 280) {
    text = text.slice(0, 277) + '...';
  }

  return text;
}

async function postJokeTweet(jokeEntry, languageLabel) {
  const client = getClient();
  const text = composeJokeTweetText(jokeEntry, languageLabel);

  if (!client) {
    console.log('[SIMULATION] Clés Twitter non configurées, tweet non publié.');
    return { simulated: true, text };
  }

  try {
    const result = await client.v2.tweet(text);
    console.log('Tweet blague publié avec succès :', result.data.id);
    return { simulated: false, text, tweetId: result.data.id };
  } catch (error) {
    console.error('Erreur lors de la publication du tweet blague :', describeTwitterError(error));
    return { simulated: false, error: describeTwitterError(error), text };
  }
}
