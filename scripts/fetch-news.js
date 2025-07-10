const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

async function fetchNews() {
  try {
    console.log('Fetching Telegram news...');
    const response = await axios.get('https://t.me/s/ordendog', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 15000
    });
    
    // Сохраняем HTML для отладки
    fs.writeFileSync('debug.html', response.data);
    
    const $ = cheerio.load(response.data);
    const posts = [];
    
    // Улучшенный селектор
    $('.tgme_widget_message_wrap').each((i, el) => {
      if (i >= 5) return; // Ограничиваем 5 постами
      const postHtml = $(el).html();
      if (postHtml) posts.push(postHtml.trim());
    });

    const data = {
      lastUpdated: new Date().toISOString(),
      posts: posts.reverse()
    };

    fs.writeFileSync('news.json', JSON.stringify(data, null, 2));
    console.log('News updated successfully!');
    
  } catch (error) {
    console.error('Error fetching news:', error.message);
    // Сохраняем ошибку для отладки
    fs.writeFileSync('error.txt', `Error: ${error.message}\n${error.stack}`);
  }
}

fetchNews();
