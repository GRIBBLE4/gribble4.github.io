const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const CONFIG = {
  TELEGRAM_CHANNEL: 'ordendog',
  MAX_POSTS: 5,
  NEWS_PATH: path.resolve(__dirname, '../news.json'),
  CACHE_BUSTER: Date.now() // Для избежания кэширования
};

async function fetchPosts() {
  try {
    console.log(`Fetching ${CONFIG.TELEGRAM_CHANNEL}...`);
    const { data } = await axios.get(`https://t.me/s/${CONFIG.TELEGRAM_CHANNEL}?_=${CONFIG.CACHE_BUSTER}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(data);
    const posts = [];

    // Собираем все посты и сортируем по дате
    $('.tgme_widget_message').each((i, el) => {
      const $el = $(el);
      const dateStr = $el.find('.tgme_widget_message_date time').attr('datetime');
      posts.push({
        html: $el.prop('outerHTML').trim(),
        date: dateStr ? new Date(dateStr) : new Date()
      });
    });

    // Сортировка от новых к старым
    posts.sort((a, b) => b.date - a.date);

    // Берем N самых свежих
    const latestPosts = posts.slice(0, CONFIG.MAX_POSTS).map(p => p.html);

    return {
      lastUpdated: new Date().toISOString(),
      fetchMethod: 'direct',
      postsCount: latestPosts.length,
      posts: latestPosts
    };

  } catch (error) {
    console.error('Ошибка при получении постов:', error);
    throw error;
  }
}

async function main() {
  try {
    const result = await fetchPosts();
    fs.writeFileSync(CONFIG.NEWS_PATH, JSON.stringify(result, null, 2));
    console.log(`✅ Успешно сохранено ${result.postsCount} постов`);
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

main();
