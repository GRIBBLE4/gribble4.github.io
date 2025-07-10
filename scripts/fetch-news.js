const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CONFIG = {
  TELEGRAM_CHANNEL: 'ordendog',
  MAX_POSTS: 7,
  NEWS_PATH: path.resolve(__dirname, '../news.json')
};

async function fetchTelegramRSS() {
  const params = {
    rss_url: `https://t.me/s/${CONFIG.TELEGRAM_CHANNEL}?format=rss`,
    api_key: '5zbmvrnmrsac40ivodbyasxlwtqenx9f7bflsrzd',
    count: CONFIG.MAX_POSTS,
    order_dir: 'desc'
  };

  try {
    const response = await axios.get('https://api.rss2json.com/v1/api.json', { params });
    if (response.data.status !== 'ok') {
      throw new Error(`API Error: ${response.data.message}`);
    }

    return response.data.items.map(item => {
      let content = item.description;
      if (item.enclosure && item.enclosure.type.startsWith('video/')) {
        content = `
          <video controls width="100%" poster="${item.thumbnail || ''}">
            <source src="${item.enclosure.link}" type="${item.enclosure.type}">
          </video>
          ${content}
        `;
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
    console.log(`Saved ${posts.length} posts with video support`);
  } catch (error) {
    console.error('Final error:', error);
    process.exit(1);
  }
}

main();
