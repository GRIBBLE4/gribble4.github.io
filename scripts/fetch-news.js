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
  try {
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
      
      // Extract and append videos
      $post.find('.tgme_widget_message_video').each((_, video) => {
        postHtml += $(video).prop('outerHTML').trim();
      });
      
      posts.push(postHtml);
    });

    return posts;
  } catch (error) {
    console.error('Direct fetch error:', error);
    return null;
  }
}

async function fetchTelegramViaRSS() {
  try {
    const rssUrl = `https://t.me/s/${CONFIG.TELEGRAM_CHANNEL}?embed=1&mode=rss`;
    const response = await axios.get(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&api_key=${CONFIG.RSS2JSON_API_KEY}&count=${CONFIG.MAX_POSTS}`
    );
    
    return response.data.items.map(item => ({
      ...item,
      content: item.description // Use description as it contains full HTML
    }));
  } catch (error) {
    console.error('RSS fetch error:', error);
    return null;
  }
}

async function main() {
  try {
    // Try both methods
    const [directPosts, rssPosts] = await Promise.all([
      fetchTelegramDirect(),
      fetchTelegramViaRSS()
    ]);

    // Use whichever method worked
    let posts = directPosts || rssPosts || [];
    let fetchMethod = directPosts ? 'direct' : 'rss';
    
    const result = {
      lastUpdated: new Date().toISOString(),
      fetchMethod,
      postsCount: posts.length,
      posts: posts.slice(0, CONFIG.MAX_POSTS).reverse() // Ensure we don't exceed MAX_POSTS
    };
    
    fs.writeFileSync(CONFIG.NEWS_PATH, JSON.stringify(result, null, 2));
    console.log(`Saved ${result.posts.length} posts to ${CONFIG.NEWS_PATH}`);
  } catch (error) {
    console.error('Main error:', error);
    fs.writeFileSync('error.log', JSON.stringify({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, null, 2));
    process.exit(1);
  }
}

main();
