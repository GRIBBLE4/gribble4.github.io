const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

const CHANNEL_NAME = 'ordendog';  // Ваш Telegram-канал
const MAX_POSTS = 5;             // Сколько новостей сохранять

async function fetchNews() {
  try {
    console.log('Fetching Telegram news...');
    const response = await axios.get(`https://t.me/s/${CHANNEL_NAME}`);
    const $ = cheerio.load(response.data);
    
    const posts = [];
    $('.tgme_widget_message_wrap').slice(0, MAX_POSTS).each((i, el) => {
      posts.push($(el).html());
    });

    fs.writeFileSync('news.json', JSON.stringify({
      lastUpdated: new Date().toISOString(),
      posts: posts.reverse()  // Новые сверху
    }, null, 2));

    console.log('News updated successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);  // Завершить с ошибкой для GitHub Actions
  }
}

fetchNews();
