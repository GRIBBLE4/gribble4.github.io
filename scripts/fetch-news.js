const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const CONFIG = {
  TELEGRAM_CHANNEL: 'ordendog',
  MAX_POSTS: 10, // Уменьшаем до 10 постов
  NEWS_PATH: path.resolve(__dirname, '../news.json'),
  RETRIES: 2, // Уменьшаем количество попыток
  RETRY_DELAY: 1000, // Уменьшаем задержку
  TIMEOUT: 10000 // Уменьшаем таймаут запроса
};

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
        timeout: CONFIG.TIMEOUT
      });

      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const $ = cheerio.load(response.data);
      const posts = [];
      let count = 0;

      $('.tgme_widget_message').each((i, el) => {
        if (count >= CONFIG.MAX_POSTS) return false; // Прерываем цикл при достижении лимита
        
        try {
          const message = $(el);
          const html = message.prop('outerHTML').trim();
          
          // Простая проверка валидности поста
          const hasContent = html.includes('tgme_widget_message_text') || 
                            html.includes('tgme_widget_message_photo') ||
                            html.includes('tgme_widget_message_video');
          
          if (hasContent) {
            posts.push(html);
            count++;
          }
        } catch (error) {
          console.error(`Error processing post ${i}:`, error.message);
          // Пропускаем проблемный пост, но продолжаем обработку
        }
      });

      return posts;
    } catch (error) {
      attempts++;
      console.error(`Attempt ${attempts} failed: ${error.message}`);
      
      if (attempts < CONFIG.RETRIES) {
        console.log(`Retrying in ${CONFIG.RETRY_DELAY / 1000} seconds...`);
        await sleep(CONFIG.RETRY_DELAY);
      } else {
        // Возвращаем пустой массив вместо ошибки
        console.error(`All attempts failed, returning empty posts`);
        return [];
      }
    }
  }
}

async function main() {
  try {
    const posts = await fetchTelegramDirect();
    
    // Если не удалось получить посты, пробуем прочитать старые
    let existingPosts = [];
    if (posts.length === 0 && fs.existsSync(CONFIG.NEWS_PATH)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(CONFIG.NEWS_PATH, 'utf8'));
        existingPosts = existingData.posts || [];
        console.log(`Using existing ${existingPosts.length} posts from cache`);
      } catch (e) {
        console.error('Error reading existing news:', e.message);
      }
    }

    const result = {
      lastUpdated: new Date().toISOString(),
      fetchMethod: 'direct',
      postsCount: posts.length || existingPosts.length,
      posts: posts.length ? posts.reverse() : existingPosts
    };
    
    fs.writeFileSync(CONFIG.NEWS_PATH, JSON.stringify(result, null, 2));
    console.log(`Saved ${result.posts.length} posts to ${CONFIG.NEWS_PATH}`);
  } catch (error) {
    console.error('Final fetch error:', error);
    // Пишем в лог, но не прерываем процесс
    fs.writeFileSync('error.log', JSON.stringify({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, null, 2));
  }
}

main();
