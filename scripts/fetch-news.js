const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CONFIG = {
  TELEGRAM_CHANNEL: 'ordendog',
  MAX_POSTS: 7,
  NEWS_PATH: path.resolve(__dirname, '../news.json'),
  RSS_API_KEY: '5zbmvrnmrsac40ivodbyasxlwtqenx9f7bflsrzd'
};

async function fetchTelegramRSS() {
  const params = {
    rss_url: `https://t.me/s/${CONFIG.TELEGRAM_CHANNEL}?format=rss`,
    api_key: CONFIG.RSS_API_KEY,
    count: CONFIG.MAX_POSTS,
    order_dir: 'desc'
  };

  try {
    const response = await axios.get('https://api.rss2json.com/v1/api.json', { 
      params,
      timeout: 15000
    });
    
    if (response.data.status !== 'ok') {
      throw new Error(`RSS API Error: ${response.data.message || 'Unknown error'}`);
    }

    // Обработка постов с видео
    return response.data.items.map(item => {
      let content = item.description;
      
      // Проверка видео-вложений
      if (item.enclosure && item.enclosure.type.startsWith('video/')) {
        const videoHTML = `
          <div class="telegram-video">
            <video controls playsinline width="100%" ${item.thumbnail ? `poster="${item.thumbnail}"` : ''}>
              <source src="${item.enclosure.link}" type="${item.enclosure.type}">
              Ваш браузер не поддерживает видео тег.
            </video>
          </div>
        `;
        content = videoHTML + content;
      }
      
      // Проверка YouTube ссылок
      const youtubeRegex = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=)?([a-zA-Z0-9_-]{11})/g;
      const youtubeMatch = content.match(youtubeRegex);
      
      if (youtubeMatch) {
        youtubeMatch.forEach(link => {
          const videoId = link.split(/\/|=/).pop();
          const embedHTML = `
            <div class="youtube-embed">
              <iframe 
                width="100%" 
                height="315" 
                src="https://www.youtube.com/embed/${videoId}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
              </iframe>
            </div>
          `;
          content = content.replace(link, embedHTML);
        });
      }
      
      return content;
    });
  } catch (error) {
    console.error('RSS fetch failed:', error);
    throw error;
  }
}

async function main() {
  try {
    const posts = await fetchTelegramRSS();
    const result = {
      lastUpdated: new Date().toISOString(),
      fetchMethod: 'rss',
      postsCount: posts.length,
      posts
    };
    
    fs.writeFileSync(CONFIG.NEWS_PATH, JSON.stringify(result, null, 2));
    console.log(`✅ Успешно сохранено ${posts.length} постов с поддержкой видео`);
    
    // Возвращаем количество постов для CI проверок
    process.exitCode = 0;
    return posts.length;
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
    
    // Выход с кодом ошибки для CI
    process.exit(1);
  }
}

// Запуск скрипта
main();
