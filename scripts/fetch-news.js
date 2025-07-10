const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const CONFIG = {
  TELEGRAM_CHANNEL: 'ordendog',
  MAX_POSTS: 7, // Возвращаем к 7 постам
  NEWS_PATH: path.resolve(__dirname, '../news.json'),
  RETRIES: 3, // Количество повторных попыток
  RETRY_DELAY: 2000 // Задержка между попытками в мс
};

// Функция для задержки
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTelegramDirect() {
  let attempts = 0;
  
  while (attempts < CONFIG.RETRIES) {
    try {
      const response = await axios.get(`https://t.me/s/${CONFIG.TELEGRAM_CHANNEL}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        timeout: 15000
      });

      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const $ = cheerio.load(response.data);
      const posts = [];

      $('.tgme_widget_message').each((i, el) => {
        if (i >= CONFIG.MAX_POSTS) return;
        
        const message = $(el);
        const html = message.prop('outerHTML').trim();
        
        // Проверяем наличие видео
        const videoPlayer = message.find('.tgme_widget_message_video_player');
        if (videoPlayer.length > 0) {
          const video = videoPlayer.find('video');
          const videoSrc = video.attr('src') || '';
          const thumb = videoPlayer.css('background-image')
            .replace(/^url\(['"]?/, '')
            .replace(/['"]?\)$/, '');
          
          posts.push({
            type: 'video',
            html,
            videoSrc,
            thumb
          });
        } else {
          posts.push({
            type: 'text',
            html
          });
        }
      });

      return posts;
    } catch (error) {
      // ... обработка ошибок ...
    }
  }
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
    console.error('Final fetch error:', error);
    fs.writeFileSync('error.log', JSON.stringify({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, null, 2));
    process.exit(1);
  }
}

main();
