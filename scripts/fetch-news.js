const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const CONFIG = {
  TELEGRAM_CHANNEL: 'ordendog',
  MAX_POSTS: 7,
  NEWS_PATH: path.resolve(__dirname, '../news.json'),
  RSS2JSON_API_KEY: '5zbmvrnmrsac40ivodbyasxlwtqenx9f7bflsrzd'
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
    const postHtml = $(el).prop('outerHTML').trim();
    
    // Извлекаем видео из постов
    const $post = $(el);
    const videoElements = $post.find('.tgme_widget_message_video');
    if (videoElements.length > 0) {
      videoElements.each((_, videoEl) => {
        const videoHtml = $(videoEl).prop('outerHTML').trim();
        posts.push(videoHtml);
      });
    }
    
    posts.push(postHtml);
  });

  return posts;
}

async function fetchTelegramViaRSS() {
  try {
    const rssUrl = `https://t.me/s/${CONFIG.TELEGRAM_CHANNEL}?embed=1&mode=rss`;
    const response = await axios.get(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&api_key=${CONFIG.RSS2JSON_API_KEY}&count=${CONFIG.MAX_POSTS}`);
    
    return response.data.items.map(item => {
      // Обрабатываем контент для извлечения видео и другого медиа
      const $ = cheerio.load(item.content);
      const videos = $('video').map((_, el) => $(el).prop('outerHTML')).get();
      
      // Добавляем видео к контенту поста
      return {
        ...item,
        content: item.content + videos.join('')
      };
    });
  } catch (error) {
    console.error('RSS fetch error:', error);
    return null;
  }
}

async function main() {
  try {
    // Пробуем оба метода и выбираем лучший результат
    const [directPosts, rssPosts] = await Promise.all([
      fetchTelegramDirect(),
      fetchTelegramViaRSS()
    ]);

    // Предпочитаем прямую выборку, но если есть RSS с более свежими постами - используем их
    let posts = directPosts;
    let fetchMethod = 'direct';
    
    if (rssPosts && rssPosts.length > 0) {
      // Проверяем даты последних постов
      const lastDirectPostDate = new Date($(directPosts[0]).find('.tgme_widget_message_date time').attr('datetime') || 0);
      const lastRssPostDate = new Date(rssPosts[0].pubDate || 0);
      
      if (lastRssPostDate > lastDirectPostDate) {
        posts = rssPosts;
        fetchMethod = 'rss';
      }
    }

    const result = {
      lastUpdated: new Date().toISOString(),
      fetchMethod,
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
