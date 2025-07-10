const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const CONFIG = {
  TELEGRAM_CHANNEL: 'ordendog',
  MAX_POSTS: 7,
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
    
    const $post = $(el);
    let postHtml = $post.prop('outerHTML').trim();
    
    // Добавляем поддержку видео
    const $video = $post.find('video');
    if ($video.length > 0) {
      const videoSrc = $video.attr('src');
      const videoType = $video.attr('type') || 'video/mp4';
      const poster = $video.attr('poster') || '';
      
      const videoHTML = `
        <div class="telegram-video">
          <video controls playsinline width="100%" ${poster ? `poster="${poster}"` : ''}>
            <source src="${videoSrc}" type="${videoType}">
            Ваш браузер не поддерживает видео тег.
          </video>
        </div>
      `;
      
      // Добавляем видео в начало поста
      postHtml = videoHTML + postHtml;
    }
    
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
      posts: posts.reverse()
    };
    
    fs.writeFileSync(CONFIG.NEWS_PATH, JSON.stringify(result, null, 2));
    console.log(`✅ Успешно сохранено ${posts.length} постов`);
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    
    // Сохраняем подробную информацию об ошибке
    const errorData = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : undefined
      }
    };
    
    fs.writeFileSync('error.log', JSON.stringify(errorData, null, 2));
    process.exit(1);
  }
}

main();
