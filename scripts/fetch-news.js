const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

async function fetchNews() {
  try {
    console.log('Fetching Telegram news...');
    
    const response = await axios.get('https://t.me/s/ordendog', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
        'Cache-Control': 'no-cache'
      },
      timeout: 20000
    });
    
    // Сохраняем raw HTML для отладки
    fs.writeFileSync('debug.html', response.data);
    
    const $ = cheerio.load(response.data);
    const posts = [];
    
    // Альтернативный селектор
    $('div.tgme_widget_message').each((index, element) => {
      if (index >= 5) return;
      
      const post = $(element).clone();
      // Удаляем ненужные элементы
      post.find('.tgme_widget_message_views, .tgme_widget_message_buttons').remove();
      
      posts.push(post.prop('outerHTML').trim());
    });

    const data = {
      lastUpdated: new Date().toISOString(),
      posts: posts.reverse()
    };
    
    fs.writeFileSync('news.json', JSON.stringify(data, null, 2));
    console.log('Successfully fetched', posts.length, 'posts');
    
  } catch (error) {
    console.error('Fetch error:', error.message);
    fs.writeFileSync('error.txt', `Error: ${error.message}\n${error.stack || ''}`);
    
    // Создаем пустой файл новостей при ошибке
    fs.writeFileSync('news.json', JSON.stringify({
      lastUpdated: new Date().toISOString(),
      posts: []
    }));
  }
}

fetchNews();
