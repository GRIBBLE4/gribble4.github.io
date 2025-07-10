const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

// Конфигурация
const CONFIG = {
  TELEGRAM_CHANNEL: 'ordendog',
  MAX_POSTS: 5,
  USE_RSS_BACKUP: true, // Использовать RSS если прямой парсинг не работает
  RSS_API_KEY: '5zbmvrnmrsac40ivodbyasxlwtqenx9f7bflsrzd', // Получить на rss2json.com
  TIMEOUT: 30000
};

async function fetchTelegramDirect() {
  console.log('Пытаемся получить новости напрямую...');
  const response = await axios.get(`https://t.me/s/${CONFIG.TELEGRAM_CHANNEL}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    timeout: CONFIG.TIMEOUT
  });

  const $ = cheerio.load(response.data);
  const posts = [];

  // Улучшенный селектор для 2024
  $('.tgme_channel_history').find('.tgme_widget_message').each((i, el) => {
    if (i >= CONFIG.MAX_POSTS) return;
    
    const post = $(el).clone();
    // Очищаем от ненужных элементов
    post.find('.tgme_widget_message_views, .message_media_not_supported_label').remove();
    
    posts.push(post.prop('outerHTML').trim());
  });

  return posts;
}

async function fetchTelegramRSS() {
  console.log('Пытаемся получить новости через RSS...');
  const response = await axios.get(
    `https://api.rss2json.com/v1/api.json?rss_url=https://t.me/s/${CONFIG.TELEGRAM_CHANNEL}&api_key=${CONFIG.RSS_API_KEY}&count=${CONFIG.MAX_POSTS}`,
    { timeout: CONFIG.TIMEOUT }
  );

  return response.data.items.map(item => `
    <div class="rss-post">
      <div class="post-date">${new Date(item.pubDate).toLocaleString('ru-RU')}</div>
      <div class="post-content">${item.description}</div>
    </div>
  `);
}

async function saveDebugFiles(html, error) {
  try {
    if (html) fs.writeFileSync('debug.html', html);
    if (error) {
      fs.writeFileSync('error.txt', `[${new Date().toISOString()}] ${error.message}\n${error.stack || ''}`);
    }
  } catch (e) {
    console.error('Ошибка сохранения отладочных файлов:', e);
  }
}

async function main() {
  let posts = [];
  let methodUsed = 'none';

  try {
    // Пробуем прямой парсинг
    posts = await fetchTelegramDirect();
    methodUsed = 'direct';
    
    // Если не получили посты и разрешён RSS fallback
    if (posts.length === 0 && CONFIG.USE_RSS_BACKUP) {
      posts = await fetchTelegramRSS();
      methodUsed = 'rss';
    }
  } catch (error) {
    await saveDebugFiles(error.response?.data, error);
    
    // Пробуем RSS если прямая загрузка не удалась
    if (CONFIG.USE_RSS_BACKUP) {
      try {
        posts = await fetchTelegramRSS();
        methodUsed = 'rss_fallback';
      } catch (rssError) {
        await saveDebugFiles(null, rssError);
      }
    }
  }

  // Сохраняем результат
  const result = {
    lastUpdated: new Date().toISOString(),
    fetchMethod: methodUsed,
    postsCount: posts.length,
    posts: posts.reverse()
  };

  fs.writeFileSync('news.json', JSON.stringify(result, null, 2));
  console.log(`Успешно получено ${posts.length} постов (метод: ${methodUsed})`);

  // Дополнительная отладка
  if (posts.length === 0) {
    fs.writeFileSync('empty_fetch.log', JSON.stringify({
      timestamp: new Date().toISOString(),
      config: CONFIG
    }, null, 2));
  }
}

// Запуск
main().catch(console.error);
