const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const CONFIG = {
  TELEGRAM_CHANNEL: 'ordendog',
  MAX_POSTS: 30, // Увеличиваем до 7 постов
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

  // Игнорируем закрепленные посты и ограничиваем выборку
  $('.tgme_widget_message:not(.tgme_widget_message_pinned)').each((i, el) => {
    if (i >= CONFIG.MAX_POSTS) return false; // Прерываем цикл при достижении лимита
    
    const messageHtml = $(el).prop('outerHTML').trim();
    
    // Проверяем наличие видео в посте
    const hasVideo = $(el).find('.tgme_widget_message_video').length > 0;
    if (hasVideo) {
      console.log(`Post ${i+1} contains video`);
    }
    
    posts.push(messageHtml);
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
      posts: posts.reverse() // Убрали reverse для сохранения исходного порядка
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
