const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const CONFIG = {
  TELEGRAM_CHANNEL: 'ordendog',
  MAX_POSTS: 7,
  NEWS_PATH: path.resolve(__dirname, '../news.json'),
  RETRY_COUNT: 3,
  RETRY_DELAY: 2000
};

async function fetchWithRetry(url, retries = CONFIG.RETRY_COUNT) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 30000
    });
    return response;
  } catch (error) {
    if (retries <= 0) throw error;
    console.log(`Retrying... (${CONFIG.RETRY_COUNT - retries + 1}/${CONFIG.RETRY_COUNT})`);
    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
    return fetchWithRetry(url, retries - 1);
  }
}

async function fetchTelegramDirect() {
  try {
    const response = await fetchWithRetry(`https://t.me/s/${CONFIG.TELEGRAM_CHANNEL}`);
    const $ = cheerio.load(response.data);
    const posts = [];

    $('.tgme_widget_message').each((i, el) => {
      if (i >= CONFIG.MAX_POSTS) return;
      
      const $post = $(el);
      let postHtml = $post.prop('outerHTML').trim();
      
      // Add video support if needed
      const $video = $post.find('video');
      if ($video.length > 0) {
        const videoSrc = $video.attr('src');
        const videoType = $video.attr('type') || 'video/mp4';
        const poster = $video.attr('poster') || '';
        
        const videoHTML = `
          <div class="telegram-video">
            <video controls playsinline width="100%" ${poster ? `poster="${poster}"` : ''}>
              <source src="${videoSrc}" type="${videoType}">
              Ваш браузер не поддерживает видео тег.
            </video>
          </div>
        `;
        
        postHtml = videoHTML + postHtml;
      }
      
      posts.push(postHtml);
    });

    return posts;
  } catch (error) {
    console.error('Failed to fetch Telegram posts:', error.message);
    // If we have a cached version, return empty array to keep the existing data
    if (fs.existsSync(CONFIG.NEWS_PATH)) {
      try {
        const cached = JSON.parse(fs.readFileSync(CONFIG.NEWS_PATH, 'utf8'));
        console.log('Using cached posts due to fetch error');
        return cached.posts.slice(0, CONFIG.MAX_POSTS); // Return cached posts
      } catch (e) {
        console.error('Failed to read cached posts:', e.message);
      }
    }
    throw error; // Re-throw if we have no fallback
  }
}

async function main() {
  try {
    const posts = await fetchTelegramDirect();
    const result = {
      lastUpdated: new Date().toISOString(),
      fetchMethod: 'direct',
      postsCount: posts.length,
      posts: posts.reverse()
    };
    
    fs.writeFileSync(CONFIG.NEWS_PATH, JSON.stringify(result, null, 2));
    console.log(`✅ Successfully saved ${posts.length} posts`);
  } catch (error) {
    console.error('❌ Critical error:', error.message);
    
    const errorData = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          data: typeof error.response.data === 'string' 
            ? error.response.data.substring(0, 200) + '...' 
            : error.response.data
        } : undefined
      }
    };
    
    fs.writeFileSync('error.log', JSON.stringify(errorData, null, 2));
    process.exit(1);
  }
}

main();
