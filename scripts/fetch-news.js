const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

async function fetchNews() {
  try {
    console.log('Fetching Telegram news...');
    const response = await axios.get('https://t.me/s/ordendog', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    });
    fs.writeFileSync('debug.html', response.data);
    
    const $ = cheerio.load(response.data);
    const posts = [];
    
    // Исправленный селектор
    $('.tgme_channel_history.js-messages_history').find('.tgme_widget_message_wrap').slice(0, 5).each((i, el) => {
      const postHtml = $(el).html();
      if (postHtml) posts.push(postHtml.trim());
    });

    const data = {
      lastUpdated: new Date().toISOString(),
      posts: posts.reverse()
    };

    fs.writeFileSync('news.json', JSON.stringify(data, null, 2));
    console.log('News updated successfully!');
    console.log(`Found ${posts.length} posts`);
    
  } catch (error) {
    console.error('Full error:', error);
    fs.writeFileSync('error.txt', JSON.stringify(error, null, 2));
    process.exit(1);
    
  }
}

fetchNews();
