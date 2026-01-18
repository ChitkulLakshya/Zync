const axios = require('axios');
const Parser = require('rss-parser');



const UNSPLASH_BASE = 'https://api.unsplash.com';
const PINTEREST_BASE = 'https://api.pinterest.com/v5';
const parser = new Parser();

const PLACEHOLDER_IMG = 'https://via.placeholder.com/600x400?text=No+Preview';

async function fetchUnsplash(query = 'web design', page = 1, per_page = 50) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) throw new Error('UNSPLASH_ACCESS_KEY missing');

  // Refine query to be design-specific: 'web design user interface' preferred
  const refinedQuery = query.toLowerCase().includes('web') || query.toLowerCase().includes('design')
    ? `${query} user interface`
    : `web design user interface ${query}`;

  const resp = await axios.get(`${UNSPLASH_BASE}/search/photos`, {
    params: {
      query: refinedQuery,
      page,
      per_page: 10, // Limit to 10 high-quality shots 
      orientation: 'landscape'
    },
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  return resp.data.results.map(r => ({
    id: `unsplash_${r.id}`,
    source: 'unsplash',
    title: r.alt_description || r.description || 'Untitled',
    // Use regular or small as requested
    image: r.urls?.regular || r.urls?.small || r.urls?.full || PLACEHOLDER_IMG,
    thumb: r.urls?.small || r.urls?.thumb,
    photographer: r.user?.name,
    photographerProfile: r.user?.links?.html,
    link: r.links?.html,
  }));
}



async function fetchBehance(query = 'web design', limit = 30) {
  try {
    // Fetch from Behance RSS feed filtered by Creative Field
    // Use 'field' parameter for web design projects (more targeted than tags)
    const field = 'web design'; // Primary creative field filter
    // Construct feed URL with field and sort by appreciated if possible, or just default (published_date filters apply implicitly in RSS)
    const feedUrl = `https://www.behance.net/feeds/projects?field=${encodeURIComponent(field)}&q=${encodeURIComponent(query)}`;
    const feed = await parser.parseURL(feedUrl);

    const results = [];
    feed.items.forEach((item, index) => {
      if (results.length >= limit) return;

      // Extract image URL from content or description
      let image = null;
      // 1. Try custom covers if RSS parser captured them (unlikely without custom fields, but harmless)
      if (item.covers && item.covers['404']) image = item.covers['404'];
      else if (item.covers && item.covers.original) image = item.covers.original;

      // 2. Regex fallback (standard RSS)
      if (!image) {
        const content = item.content || item.description || '';
        const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
        if (imgMatch && imgMatch[1]) {
          image = imgMatch[1];
        }
      }

      // Use GUID or Link + Index to ensure uniqueness
      const uniqueId = item.guid || item.link || `no-link-${index}`;

      results.push({
        id: `behance_${Buffer.from(uniqueId).toString('base64')}`,
        source: 'behance',
        title: item.title || 'Untitled',
        image: image || PLACEHOLDER_IMG,
        link: item.link,
        creator: item.creator || item.author || 'Unknown',
      });
    });

    return results;
  } catch (error) {
    console.error('Behance RSS fetch error:', error.message);
    return [];
  }
}

// Express controller

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// Helper to launch browser
async function launchBrowser() {
  console.log('DEBUG: Launching Stealth Puppeteer...');
  return await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process', '--no-zygote', '--window-size=1920,1080']
  });
}

async function scrapeDribbble(browser, query) {
  if (!browser) return [];


  try {
    const page = await browser.newPage();

    // Set User-Agent to mimic real Chrome
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // Use search URL if query exists, otherwise popular
    const targetUrl = query && query !== 'web design'
      ? `https://dribbble.com/search/${encodeURIComponent(query)}`
      : 'https://dribbble.com/shots/popular';

    console.log(`DEBUG: Navigating to ${targetUrl}`);

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try {
      // Robust selector wait (list item or grid container)
      await page.waitForSelector('li.shot-thumbnail, .shots-grid', { timeout: 15000 });
    } catch (e) {
      console.log('DEBUG: Timeout waiting for Dribbble selectors. Page might be blocked or empty.');
    }

    // Scroll down to trigger infinite scroll and load more shots
    console.log('DEBUG: Scrolling to load more shots...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      // Wait for new content to load
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    // Scroll back to top so all images are in a known state
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(resolve => setTimeout(resolve, 500));

    const shots = await page.evaluate(() => {
      const results = [];
      // Use the exact selectors from Dribbble's HTML structure
      const items = document.querySelectorAll('li.shot-thumbnail.js-thumbnail');

      items.forEach(item => {
        // Link is in the overlay or base
        const linkEl = item.querySelector('a.shot-thumbnail-link.dribbble-link');
        // Title is in the overlay content
        const titleEl = item.querySelector('div.shot-title');
        // Image is in the figure placeholder
        const imgEl = item.querySelector('figure.js-thumbnail-placeholder img');

        let image = null;

        if (imgEl) {
          // Dribbble uses lazy loading: data-srcset/data-src for most images
          // First few have srcset directly (fetchpriority="high")
          // Priority: data-srcset -> srcset -> data-src -> src (avoiding data: placeholders)
          const dataSrcset = imgEl.getAttribute('data-srcset');
          const srcset = imgEl.getAttribute('srcset');
          const dataSrc = imgEl.getAttribute('data-src');
          const src = imgEl.getAttribute('src');

          if (dataSrcset) {
            // Get highest quality from srcset (first entry is usually smallest, grab a middle one)
            const parts = dataSrcset.split(',');
            // Get ~400px version which is good quality but not huge
            const match400 = parts.find(p => p.includes('400x300'));
            image = match400 ? match400.trim().split(' ')[0] : parts[0].trim().split(' ')[0];
          } else if (srcset) {
            const parts = srcset.split(',');
            const match400 = parts.find(p => p.includes('400x300'));
            image = match400 ? match400.trim().split(' ')[0] : parts[0].trim().split(' ')[0];
          } else if (dataSrc && !dataSrc.startsWith('data:')) {
            image = dataSrc;
          } else if (src && !src.startsWith('data:')) {
            image = src;
          }
        }

        if (linkEl && image) {
          results.push({
            title: titleEl ? titleEl.innerText.trim() : 'Design Inspiration',
            link: linkEl.href,
            image: image,
            source: 'Dribbble'
          });
        }
      });
      return results; // Return all shots (Dribbble loads ~136 before "Load More")
    });

    console.log(`DEBUG: Scraped ${shots.length} shots.`);
    return shots.map((s, i) => ({ ...s, id: `dribbble_scraped_${i}` }));

  } catch (error) {
    console.error('DEBUG: Dribbble Scrape Error:', error.message);
    return [];
  }
  // Browser is closed by caller
}

async function scrapePinterest(browser, query) {
  if (!browser) return [];

  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    // Mimic real user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

    const encodedQuery = encodeURIComponent(query || 'web design ui');
    const targetUrl = `https://www.pinterest.com/search/pins/?q=${encodedQuery}`;

    console.log(`DEBUG: Navigating to Pinterest: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try {
      // Wait for the data script
      await page.waitForSelector('script#__PWS_INITIAL_PROPS__', { timeout: 15000 });
    } catch (e) {
      console.log('DEBUG: Timeout waiting for Pinterest data script [script#__PWS_INITIAL_PROPS__]');
    }

    const pins = await page.evaluate(() => {
      try {
        const script = document.getElementById('__PWS_INITIAL_PROPS__');
        if (!script) return [];

        const json = JSON.parse(script.textContent);
        const feeds = json?.initialReduxState?.feeds;
        if (!feeds) return [];

        // Find the key that contains 'results' (it's dynamic, usually search:...)
        const feedKey = Object.keys(feeds).find(key =>
          feeds[key]?.response?.data?.results && Array.isArray(feeds[key].response.data.results)
        );

        if (!feedKey) return [];

        const items = feeds[feedKey].response.data.results;

        return items.slice(0, 20).map(item => {
          // Robust checking for image
          let imageUrl = null;
          if (item.images?.orig?.url) imageUrl = item.images.orig.url;
          else if (item.images?.['736x']?.url) imageUrl = item.images['736x'].url;
          else if (item.images?.['474x']?.url) imageUrl = item.images['474x'].url;

          // Robust link construction
          let link = '#';
          if (item.link) link = item.link; // sometimes full url
          else if (item.id) link = `https://www.pinterest.com/pin/${item.id}/`;

          if (!link.startsWith('http')) {
            // Handle relative links if they appear
            link = `https://www.pinterest.com${link.startsWith('/') ? '' : '/'}${link}`;
          }

          return {
            title: item.title || item.grid_title || item.description || 'Pinterest Pin',
            link: link,
            image: imageUrl,
            source: 'Pinterest'
          };
        }).filter(p => p.image); // Filter out items without images

      } catch (e) {
        console.error('Pinterest Client-Side Parse Error:', e.message);
        return [];
      }
    });

    console.log(`DEBUG: Scraped ${pins.length} Pinterest pins via JSON.`);
    return pins.map((p, i) => ({ ...p, id: `pinterest_scraped_${i}` }));

  } catch (error) {
    console.error('DEBUG: Pinterest Scrape Error:', error.message);
    return [];
  } finally {
    // Close page, but NOT browser
    await page.close();
  }
}

async function getInspiration(req, res) {
  // Simple checkLog to verify keys safely
  console.log("Pinterest Config Loaded:", {
    id: !!process.env.PINTEREST_APP_ID,
    secret: !!process.env.PINTEREST_APP_SECRET,
    token: !!process.env.PINTEREST_TOKEN,
    board: !!process.env.PINTEREST_BOARD_ID
  });

  const q = req.query.q || 'web design';
  const unsplashPage = parseInt(req.query.up) || 1;
  const unsplashPer = parseInt(req.query.upp) || 50;
  const pinterestBoard = req.query.pboard || process.env.PINTEREST_BOARD_ID;
  const pinterestToken = req.header('x-pinterest-token') || process.env.PINTEREST_TOKEN;

  let browser = null;
  try {
    // Launch browser once for all scrapers
    browser = await launchBrowser();

    const results = await Promise.allSettled([
      fetchUnsplash(q, unsplashPage, unsplashPer),
      scrapePinterest(browser, q), // Use scraper instead of API
      fetchBehance(q, 50),
      scrapeDribbble(browser, q) // Pass browser instance
    ]);

    const unsplash = results[0].status === 'fulfilled' ? results[0].value : [];
    const pinterest = results[1].status === 'fulfilled' ? results[1].value : [];
    const behance = results[2].status === 'fulfilled' ? results[2].value : [];
    const dribbble = results[3].status === 'fulfilled' ? results[3].value : [];

    if (results[0].status === 'rejected') console.error('Unsplash Error:', results[0].reason?.message);
    if (results[1].status === 'rejected') console.error('Pinterest Error:', results[1].reason?.message);
    if (results[2].status === 'rejected') console.error('Behance Error:', results[2].reason?.message);
    if (results[3].status === 'rejected') console.error('Dribbble Scraper Error:', results[3].reason?.message);

    console.log(`Inspiration Results - Unsplash: ${unsplash.length}, Pinterest: ${pinterest.length}, Behance: ${behance.length}, Dribbble: ${dribbble.length}`);

    // Unified list
    const unified = [...unsplash, ...pinterest, ...behance, ...dribbble];
    res.json({ ok: true, count: unified.length, items: unified });
  } catch (error) {
    console.error('Controller error', error);
    res.status(500).json({ ok: false, error: error.message });
  } finally {
    // Ensure browser is closed
    if (browser) {
      console.log('DEBUG: Closing shared browser...');
      await browser.close();
    }
  }
}

async function getBehance(req, res) {
  const q = req.query.q || 'web design';
  try {
    const items = await fetchBehance(q, 50);
    res.json(items);
  } catch (error) {
    console.error('Behance controller error', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getInspiration, getBehance };
