const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

// Конфигурация
const CONFIG = {
  TELEGRAM_CHANNEL: 'ordendog',
  MAX_POSTS: 7,
  NEWS_PATH: path.resolve(__dirname, '../news.json'),
  RETRY_COUNT: 3,
  RETRY_DELAY: 2000,
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
};

// Функция для повторных попыток запроса
async function fetchWithRetry(url, retries = CONFIG.RETRY_COUNT) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': CONFIG.USER_AGENT,
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 30000
    });
    return response;
  } catch (error) {
    if (retries <= 0) throw error;
    console.log(`Повторная попытка... (${CONFIG.RETRY_COUNT - retries + 1}/${CONFIG.RETRY_COUNT})`);
    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
    return fetchWithRetry(url, retries - 1);
  }
}

// Получение постов напрямую из HTML Telegram
async function fetchTelegramPosts() {
  try {
    const url = `https://t.me/s/${CONFIG.TELEGRAM_CHANNEL}`;
    const response = await fetchWithRetry(url);
    const $ = cheerio.load(response.data);
    const posts = [];

    // Извлекаем сообщения
    $('.tgme_widget_message').each((i, el) => {
      if (i >= CONFIG.MAX_POSTS) return;
      
      const $post = $(el);
      let postHtml = $post.prop('outerHTML').trim();
      
      // Обработка видео
      const $video = $post.find('video');
      if ($video.length > 0) {
        const videoSrc = $video.attr('src');
        const poster = $video.attr('poster') || '';
        
        const videoHTML = `
          <div class="telegram-video">
            <video controls playsinline width="100%" ${poster ? `poster="${poster}"` : ''}>
              <source src="${videoSrc}" type="video/mp4">
              Ваш браузер не поддерживает видео тег.
            </video>
          </div>
        `;
        
        postHtml = videoHTML + postHtml;
      }
      
      posts.push(postHtml);
    });

    return posts;
  } catch (error) {
    console.error('Ошибка при загрузке постов:', error.message);
    
    // Используем кэшированные данные при наличии
    if (fs.existsSync(CONFIG.NEWS_PATH)) {
      try {
        const cached = JSON.parse(fs.readFileSync(CONFIG.NEWS_PATH, 'utf8'));
        console.log('Используем кэшированные посты');
        return cached.posts.slice(0, CONFIG.MAX_POSTS);
      } catch (e) {
        console.error('Ошибка чтения кэша:', e.message);
      }
    }
    
    // Если кэша нет, возвращаем пустой массив
    return [];
  }
}

// Основная функция
async function main() {
  try {
    const posts = await fetchTelegramPosts();
    
    // Формируем результат
    const result = {
      lastUpdated: new Date().toISOString(),
      fetchMethod: 'direct',
      postsCount: posts.length,
      posts: posts.reverse()
    };
    
    // Сохраняем результат
    fs.writeFileSync(CONFIG.NEWS_PATH, JSON.stringify(result, null, 2));
    console.log(`✅ Успешно сохранено ${posts.length} постов`);
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    
    // Логируем ошибку
    const errorData = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      }
    };
    
    fs.writeFileSync('error.log', JSON.stringify(errorData, null, 2));
    process.exit(1);
  }
}

// Запускаем скрипт
main();
