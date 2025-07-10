const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

async function fetchNews() {
  try {
    console.log('Fetching Telegram news...');
    const response = await axios.get('https://t.me/s/ordendog');
    const $ = cheerio.load(response.data);
    
    const posts = [];
    $('.tgme_widget_message_wrap').slice(0, 5).each((i, el) => {
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
    console.error('Error fetching news:', error.message);
    process.exit(1);
  }
}

fetchNews();
