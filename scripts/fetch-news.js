const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const CONFIG = {
  TELEGRAM_CHANNEL: 'ordendog',
  MAX_POSTS: 5,
  NEWS_PATH: path.resolve(__dirname, '../news.json')
};

async function fetchTelegramDirect() {
  const response = await axios.get(`https://t.me/s/${CONFIG.TELEGRAM_CHANNEL}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    timeout: 30000
  });

  const $ = cheerio.load(response.data);
  const posts = [];

  $('.tgme_widget_message').each((i, el) => {
    if (i >= CONFIG.MAX_POSTS) return;
    posts.push($(el).prop('outerHTML').trim());
  });

  return posts;
}

async function main() {
  try {
    const posts = await fetchTelegramDirect();
    const result = {
      lastUpdated: new Date().toISOString(),
      fetchMethod: 'direct',
      postsCount: posts.length,
      posts: posts.reverse()
    };
    
    fs.writeFileSync(CONFIG.NEWS_PATH, JSON.stringify(result, null, 2));
    console.log(`Saved ${posts.length} posts to ${CONFIG.NEWS_PATH}`);
  } catch (error) {
    console.error('Fetch error:', error);
    fs.writeFileSync('error.log', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

main();
