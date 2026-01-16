const axios = require('axios');
const Parser = require('rss-parser');
const puppeteer = require('puppeteer');


const UNSPLASH_BASE = 'https://api.unsplash.com';
const PINTEREST_BASE = 'https://api.pinterest.com/v5';
const parser = new Parser();

const PLACEHOLDER_IMG = 'https://via.placeholder.com/600x400?text=No+Preview';

async function fetchUnsplash(query = 'web design', page = 1, per_page = 50) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) throw new Error('UNSPLASH_ACCESS_KEY missing');

  // Refine query to be design-specific
  const refinedQuery = `website design ${query}`;

  const resp = await axios.get(`${UNSPLASH_BASE}/search/photos`, {
    params: { query: refinedQuery, page, per_page },
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

async function fetchPinterest(boardId, token, query, page_size = 40) {
  if (!boardId) return [];

  // Ensure token and secret are available
  let t = token || process.env.PINTEREST_TOKEN;
  const appSecret = process.env.PINTEREST_APP_SECRET;

  if (!t) throw new Error('PINTEREST_TOKEN missing');

  // Clean token
  t = t.trim();

  // Note: For basic board fetch, Bearer token is sufficient. 

  const endpoint = `${PINTEREST_BASE}/boards/${boardId}/pins`;
  // Mask the ID in logs
  const maskedId = typeof boardId === 'string' ? boardId.slice(0, 3) + '...' : '***';
  console.log('Pinterest Request URL (Masked):', `${PINTEREST_BASE}/boards/${maskedId}/pins`);

  const resp = await axios.get(endpoint, {
    headers: {
      'Authorization': `Bearer ${t}`,
      'Content-Type': 'application/json'
    },
    params: { page_size },
  });

  let data = resp.data?.items || resp.data?.results || [];

  // Filter locally by query if provided (simple case-insensitive match)
  if (query && query.trim() !== 'web design') {
    const qLower = query.toLowerCase();
    data = data.filter(p => {
      const title = (p.note || p.title || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return title.includes(qLower) || desc.includes(qLower);
    });
  }

  return data.map(p => {
    // Attempt multiple paths for image: v5 media.images['600x'], or fallback
    let imgUrl = null;
    if (p.media && p.media.images) {
      imgUrl = p.media.images['600x']?.url || p.media.images['400x300']?.url || p.media.images['1200x']?.url;
    } else if (p.image) {
      imgUrl = p.image.url || p.image.original?.url;
    }

    return {
      id: `pinterest_${p.id}`,
      source: 'pinterest',
      title: p.note || p.title || '',
      image: imgUrl || PLACEHOLDER_IMG,
      link: p.link || p.url || null,
    };
  });
}

async function fetchBehance(query = 'web design', limit = 30) {
  try {
    // Fetch from Behance RSS feed with tags
    // Hardcode 'web design' tag in addition to user query
    const tags = `web design,${query}`;
    const feedUrl = `https://www.behance.net/feeds/projects?tags=${encodeURIComponent(tags)}`;
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

async function scrapeDribbble(query) {
  let browser = null;
  try {
    console.log('DEBUG: Launching Puppeteer for Dribbble...');
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process', '--no-zygote']
    });

    const page = await browser.newPage();
    // Use search URL if query exists, otherwise popular
    const targetUrl = query && query !== 'web design'
      ? `https://dribbble.com/search/${encodeURIComponent(query)}`
      : 'https://dribbble.com/shots/popular';

    console.log(`DEBUG: Navigating to ${targetUrl}`);

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    try {
      await page.waitForSelector('.shot-thumbnail', { timeout: 10000 });
    } catch (e) {
      console.log('DEBUG: Timeout waiting for .shot-thumbnail, page might be different structure or empty.');
    }

    const shots = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.shot-thumbnail')).slice(0, 10);
      return items.map(item => {
        // Extract Title
        const titleEl = item.querySelector('.shot-title');
        const title = titleEl ? titleEl.innerText.trim() : 'Untitled';

        // Extract Link - The main anchor usually wraps the thumbnail or is separate
        // Look for the main link inside the thumbnail container
        const linkEl = item.querySelector('a.dribbble-link') || item.querySelector('a');
        const link = linkEl ? linkEl.href : null;

        // Extract Image
        // Try <picture> <source> first (high res), then <img>
        let image = 'https://via.placeholder.com/600x400?text=No+Preview';
        const pictureSource = item.querySelector('picture source');
        const imgTag = item.querySelector('img');

        if (pictureSource && pictureSource.srcset) {
          image = pictureSource.srcset.split(',')[0].split(' ')[0]; // Take first URL
        } else if (imgTag) {
          image = imgTag.src;
        }

        return {
          title,
          link,
          image,
          source: 'Dribbble'
        };
      });
    });

    console.log(`DEBUG: Scraped ${shots.length} shots.`);
    return shots.map((s, i) => ({ ...s, id: `dribbble_scraped_${i}` }));

  } catch (error) {
    console.error('DEBUG: Puppeteer Scrape Error:', error.message);
    return [];
  } finally {
    if (browser) await browser.close();
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

  try {
    const [unsplash, pinterest, behance, dribbble] = await Promise.all([
      fetchUnsplash(q, unsplashPage, unsplashPer).catch(e => { console.error('Unsplash error', e.message); return []; }),
      (async () => {
        try {
          return await fetchPinterest(pinterestBoard, pinterestToken, q, 100);
        } catch (e) {
          console.error('Pinterest error', e.message);
          return [];
        }
      })(),
      fetchBehance(q, 50),
      (async () => {
        // Use Puppeteer Scraper for Dribbble
        try {
          return await scrapeDribbble(q);
        } catch (e) {
          console.error('DEBUG: Dribbble Scraper Error:', e.message);

          // Fallback to API if scraper fails (and we have token) - optional, 
          // but the user seemingly wants to replace API fetcher.
          // Leaving API fallback as a last resort 'My Shots' if token exists.
          const dToken = req.header('x-dribbble-token');
          if (dToken) {
            try {
              console.log('DEBUG: Fallback to Dribbble API (My Shots)...');
              const resp = await axios.get('https://api.dribbble.com/v2/user/shots', {
                headers: { Authorization: `Bearer ${dToken}` },
                params: { per_page: 30 }
              });
              return resp.data.map(shot => ({
                id: `dribbble_${shot.id}`,
                source: 'dribbble',
                title: shot.title,
                image: shot.images?.hidpi || shot.images?.normal || shot.images?.teaser,
                link: shot.html_url,
                creator: 'Me'
              }));
            } catch (apiErr) {
              console.error('DEBUG: Dribbble API Fallback Error:', apiErr.message);
            }
          }
          return [];
        }
      })()
    ]);

    console.log(`Inspiration Results - Unsplash: ${unsplash.length}, Pinterest: ${pinterest.length}, Behance: ${behance.length}, Dribbble: ${dribbble.length}`);

    // Unified list
    const unified = [...unsplash, ...pinterest, ...behance, ...dribbble];
    res.json({ ok: true, count: unified.length, items: unified });
  } catch (error) {
    console.error('Controller error', error);
    res.status(500).json({ ok: false, error: error.message });
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
