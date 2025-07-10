const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const CONFIG = {
  TELEGRAM_CHANNEL: 'ordendog',
  MAX_POSTS: 16,
  NEWS_PATH: path.resolve(__dirname, '../news.json'),
  RETRIES: 2,
  RETRY_DELAY: 1000,
  TIMEOUT: 10000
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTelegramDirect() {
  let attempts = 0;
  
  while (attempts < CONFIG.RETRIES) {
    try {
      const response = await axios.get(`https://t.me/s/${CONFIG.TELEGRAM_CHANNEL}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: CONFIG.TIMEOUT
      });

      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const $ = cheerio.load(response.data);
      const posts = [];
      let count = 0;

      $('.tgme_widget_message').each((i, el) => {
        if (count >= CONFIG.MAX_POSTS) return false;
        
        try {
          const html = $(el).prop('outerHTML').trim();
          // Простая проверка, что пост не пустой
          if (html.length > 100) {
            posts.push(html);
            count++;
          }
        } catch (error) {
          console.error(`Error processing post ${i}: ${error.message}`);
        }
      });

      return posts;
    } catch (error) {
      attempts++;
      console.error(`Attempt ${attempts} failed: ${error.message}`);
      
      if (attempts < CONFIG.RETRIES) {
        await sleep(CONFIG.RETRY_DELAY);
      } else {
        console.log('Returning empty posts after all attempts failed');
        return [];
      }
    }
  }
  return [];
}

async function main() {
  try {
    console.log('Starting news fetch...');
    const newPosts = await fetchTelegramDirect();
    console.log(`Fetched ${newPosts.length} new posts`);
    
    let existingPosts = [];
    if (fs.existsSync(CONFIG.NEWS_PATH)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(CONFIG.NEWS_PATH, 'utf8'));
        existingPosts = existingData.posts || [];
        console.log(`Found ${existingPosts.length} existing posts`);
      } catch (e) {
        console.error('Error reading existing news:', e.message);
      }
    }

    // Используем новые посты, если они есть, иначе оставляем старые
    const finalPosts = newPosts.length > 0 ? newPosts.reverse() : existingPosts;
    
    const result = {
      lastUpdated: new Date().toISOString(),
      fetchMethod: 'direct',
      postsCount: finalPosts.length,
      posts: finalPosts
    };
    
    fs.writeFileSync(CONFIG.NEWS_PATH, JSON.stringify(result, null, 2));
    console.log(`Saved ${finalPosts.length} posts to ${CONFIG.NEWS_PATH}`);
    
    return 0;
  } catch (error) {
    console.error('Final error:', error.message);
    return 1;
  }
}

// Запускаем и завершаем процесс с правильным кодом
main().then(code => {
  process.exit(code);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
