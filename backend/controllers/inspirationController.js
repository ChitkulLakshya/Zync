const axios = require('axios');
const Parser = require('rss-parser');




const parser = new Parser();

const PLACEHOLDER_IMG = 'https://via.placeholder.com/600x400?text=No+Preview';

// SiteInspire RSS Fetcher
async function fetchSiteInspire() {
  try {
    const parser = new Parser();
    const feed = await parser.parseURL('https://feeds.feedburner.com/Siteinspire');

    return feed.items.slice(0, 20).map(item => {
      // Extract image from content:encoded or content
      const content = item['content:encoded'] || item.content;
      let image = null;
      if (content) {
        const imgMatch = content.match(/src="([^"]+)"/);
        if (imgMatch) image = imgMatch[1];
      }

      return {
        title: item.title,
        link: item.link,
        image: image,
        source: 'SiteInspire',
        id: `siteinspire_${Math.random().toString(36).substr(2, 9)}`
      };
    }).filter(i => i.image);
  } catch (error) {
    console.error('SiteInspire Fetch Error:', error.message);
    return [];
  }
}

// Godly.website Scraper
async function scrapeGodly(browser) {
  if (!browser) return [];
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

    console.log('DEBUG: Navigating to Godly.website');
    await page.goto('https://godly.website/', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for cards
    try {
      await page.waitForSelector('a[href^="/website/"]', { timeout: 15000 });
    } catch (e) {
      console.log('DEBUG: Timeout waiting for Godly selectors');
    }

    const items = await page.evaluate(() => {
      const results = [];
      // Select anchors that look like website cards
      // Godly structure changes, but usually valid items are anchors wrapping images
      const cards = document.querySelectorAll('a[href^="/website/"]');

      cards.forEach(card => {
        const titleEl = card.querySelector('h2') || card.querySelector('div[class*="title"]');
        const imgEl = card.querySelector('img') || card.querySelector('video');

        let image = null;
        if (imgEl) {
          image = imgEl.src || imgEl.poster; // Use poster if it's a video
        }

        if (image) {
          results.push({
            title: titleEl ? titleEl.innerText.trim() : 'Web Design Inspiration',
            link: card.href,
            image: image,
            source: 'Godly'
          });
        }
      });
      return results.slice(0, 15);
    });

    console.log(`DEBUG: Scraped ${items.length} Godly items.`);
    return items.map((i, idx) => ({ ...i, id: `godly_${idx}` }));

  } catch (error) {
    console.error('Godly Scrape Error:', error.message);
    return [];
  } finally {
    if (page) await page.close();
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

async function scrapeDribbble(browser, query, page = 1) {
  if (!browser) return [];

  const newPage = await browser.newPage();
  try {
    await newPage.setViewport({ width: 1920, height: 1080 });
    await newPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

    let targetUrl;
    if (page > 1) {
      // User requested pagination logic: use popular shots for subsequent pages 
      // This is a common pattern to explore more content
      targetUrl = `https://dribbble.com/shots/popular?page=${page}&per_page=24`;
    } else {
      const encodedQuery = encodeURIComponent(query || 'web design');
      targetUrl = `https://dribbble.com/search/${encodedQuery}`;
    }

    console.log(`DEBUG: Navigating to Dribbble: ${targetUrl}`);
    await newPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // ... rest of scraping logic is same, wait for selector ...
    try {
      if (page > 1) {
        // Pagination pages might load differently, waiting for the list container
        await newPage.waitForSelector('li.shot-thumbnail', { timeout: 15000 });
      } else {
        await newPage.waitForSelector('li.shot-thumbnail.js-thumbnail', { timeout: 15000 });
      }
    } catch (e) {
      console.log('DEBUG: Timeout waiting for Dribbble selector');
    }

    // Scroll to load more (simulated infinite scroll)
    const scrolls = 3;
    for (let i = 0; i < scrolls; i++) {
      await newPage.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise(r => setTimeout(r, 1500));
    }
    console.log(`DEBUG: Scrolling to load more shots...`);

    const shots = await newPage.evaluate(() => {
      const results = [];
      // Use the exact selectors from Dribbble's HTML structure
      const items = document.querySelectorAll('li.shot-thumbnail'); // Removed .js-thumbnail to be broader

      items.forEach(item => {
        // Link is in the overlay or base
        const linkEl = item.querySelector('a.shot-thumbnail-link') || item.querySelector('a');
        // Title is in the overlay content
        const titleEl = item.querySelector('div.shot-title');
        // Image is in the figure placeholder
        const imgEl = item.querySelector('figure img') || item.querySelector('img');

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
      return results; // Return all shots
    });

    console.log(`DEBUG: Scraped ${shots.length} shots.`);
    return shots.map((s, i) => ({ ...s, id: `dribbble_scraped_${page}_${i}` }));

  } catch (error) {
    console.error('DEBUG: Dribbble Scrape Error:', error.message);
    return [];
  } finally {
    if (newPage) await newPage.close();
  }
}

async function scrapePinterest(query) {
  try {
    const encodedQuery = encodeURIComponent(query || 'web design');
    const url = 'https://www.pinterest.com/resource/BaseSearchResource/get/';

    // Construct the data parameter exactly as requested
    const dataDetails = {
      options: {
        isPrefetch: false,
        query: query || "web design",
        scope: "pins",
        no_fetch_context_on_resource: false
      },
      context: {}
    };

    const params = {
      source_url: `/search/pins/?q=${encodedQuery}`,
      data: JSON.stringify(dataDetails)
    };

    console.log(`DEBUG: Fetching Pinterest via Internal API: ${query}`);

    const response = await axios.get(url, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.pinterest.com/',
        'Accept': 'application/json, text/javascript, */*; q=0.01'
      }
    });

    const results = response.data?.resource_response?.data?.results;

    if (!results || !Array.isArray(results)) {
      console.log('DEBUG: Pinterest Internal API returned no valid results structure.');
      return [];
    }

    return results.map(item => {
      // Robust checking for image
      let imageUrl = null;
      if (item.images?.orig?.url) imageUrl = item.images.orig.url;
      else if (item.images?.['736x']?.url) imageUrl = item.images['736x'].url;
      else if (item.images?.['474x']?.url) imageUrl = item.images['474x'].url;
      else if (item.images?.['236x']?.url) imageUrl = item.images['236x'].url; // Fallback

      // Robust link construction
      let link = '#';
      if (item.link) link = item.link;
      else if (item.id) link = `https://www.pinterest.com/pin/${item.id}/`;

      if (link && !link.startsWith('http')) {
        link = `https://www.pinterest.com${link.startsWith('/') ? '' : '/'}${link}`;
      }

      return {
        title: item.title || item.grid_title || item.description || 'Pinterest Pin',
        link: link,
        image: imageUrl,
        source: 'Pinterest',
        id: item.id || `pin_${Math.random()}`
      };
    }).filter(p => p.image); // Filter out items without images

  } catch (error) {
    console.error('Pinterest Internal API Error:', error.message);
    // Silent fail or return empty
    return [];
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
  const pinterestBoard = req.query.pboard || process.env.PINTEREST_BOARD_ID;
  const pinterestToken = req.header('x-pinterest-token') || process.env.PINTEREST_TOKEN;

  let browser = null;
  try {
    // Launch browser once for all scrapers
    browser = await launchBrowser();

    // Parallel Fetching
    const results = await Promise.allSettled([
      fetchSiteInspire(),
      scrapeGodly(browser),
      scrapePinterest(req.query.q || 'web design'), // Using Axios call now
      scrapeDribbble(browser, q)
    ]);

    const siteInspire = results[0].status === 'fulfilled' ? results[0].value : [];
    const godly = results[1].status === 'fulfilled' ? results[1].value : [];
    const pinterest = results[2].status === 'fulfilled' ? results[2].value : [];
    const dribbble = results[3].status === 'fulfilled' ? results[3].value : [];

    if (results[0].status === 'rejected') console.error('SiteInspire Error:', results[0].reason?.message);
    if (results[1].status === 'rejected') console.error('Godly Error:', results[1].reason?.message);
    if (results[2].status === 'rejected') console.error('Pinterest Error:', results[2].reason?.message);
    if (results[3].status === 'rejected') console.error('Dribbble Scraper Error:', results[3].reason?.message);

    console.log(`Inspiration Results - SiteInspire: ${siteInspire.length}, Godly: ${godly.length}, Pinterest: ${pinterest.length}, Dribbble: ${dribbble.length}`);

    // Merge all
    let unified = [...dribbble, ...siteInspire, ...godly, ...pinterest];

    // Shuffle results (Fisher-Yates)
    for (let i = unified.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unified[i], unified[j]] = [unified[j], unified[i]];
    }

    // Deduplicate by ID
    const seen = new Set();
    unified = unified.filter(item => {
      const duplicate = seen.has(item.id);
      seen.add(item.id);
      return !duplicate;
    });

    res.json({
      ok: true,
      count: unified.length,
      items: unified
    });
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

async function getPinterestInspiration(req, res) {
  const q = req.query.q || 'web design ui';
  try {
    console.log('DEBUG: Fetching Pinterest Inspiration for:', q);
    const items = await scrapePinterest(q);
    res.json(items);
  } catch (error) {
    console.error('Pinterest Controller Error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getDribbbleInspiration(req, res) {
  const q = req.query.q || 'web design';
  const page = parseInt(req.query.page) || 1;
  let browser = null;
  try {
    browser = await launchBrowser();
    console.log(`DEBUG: Fetching Dribbble Inspiration for: ${q} (Page ${page})`);
    const items = await scrapeDribbble(browser, q, page);
    res.json(items);
  } catch (error) {
    console.error('Dribbble Controller Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
}



module.exports = { getInspiration, getPinterestInspiration, getDribbbleInspiration };
