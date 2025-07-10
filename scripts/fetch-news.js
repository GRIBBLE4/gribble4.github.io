const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

// Конфигурация
const CONFIG = {
  TELEGRAM_CHANNEL: 'ordendog',
  MAX_POSTS: 5,
  USE_RSS_BACKUP: false,
  RSS_API_KEY: '5zbmvrnmrsac40ivodbyasxlwtqenx9f7bflsrzd',
  TIMEOUT: 30000,
  NEWS_PATH: path.join(__dirname, '../news.json') // Путь в корень репозитория
};

// Функция для очистки HTML от ненужных элементов
function cleanTelegramPost(html) {
  const $ = cheerio.load(html);
  $('.tgme_widget_message_views, .message_media_not_supported_label').remove();
  return $.html();
}

async function fetchTelegramDirect() {
  console.log('Fetching Telegram posts directly...');
  const response = await axios.get(`https://t.me/s/${CONFIG.TELEGRAM_CHANNEL}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    timeout: CONFIG.TIMEOUT
  });

  const $ = cheerio.load(response.data);
  const posts = [];

  $('.tgme_widget_message').each((i, el) => {
    if (i >= CONFIG.MAX_POSTS) return;
    const postHtml = cleanTelegramPost($(el).html());
    posts.push(postHtml);
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
      posts: posts
    };

    // Сохраняем с чеком директории
    if (!fs.existsSync(path.dirname(CONFIG.NEWS_PATH))) {
      fs.mkdirSync(path.dirname(CONFIG.NEWS_PATH), { recursive: true });
    }
    
    fs.writeFileSync(CONFIG.NEWS_PATH, JSON.stringify(result, null, 2));
    console.log(`Successfully saved ${posts.length} posts to ${CONFIG.NEWS_PATH}`);

  } catch (error) {
    console.error('Error:', error);
    // Сохраняем ошибку для отладки
    fs.writeFileSync('error.log', JSON.stringify({
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    }, null, 2));
    process.exit(1);
  }
}

main();
