const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

const CHANNEL_NAME = 'ordendog';
const MAX_POSTS = 5;

async function fetchNews() {
  try {
    const response = await axios.get(`https://t.me/s/${CHANNEL_NAME}`);
    const $ = cheerio.load(response.data);
    
    const posts = [];
    $('.tgme_widget_message_wrap').slice(0, MAX_POSTS).each((i, el) => {
      posts.push($(el).html());
    });

    fs.writeFileSync('news.json', JSON.stringify({
      lastUpdated: new Date().toISOString(),
      posts: posts.reverse() // Реверсируем порядок для правильного отображения
    }));
  } catch (error) {
    console.error('Error fetching news:', error);
  }
}

fetchNews();
