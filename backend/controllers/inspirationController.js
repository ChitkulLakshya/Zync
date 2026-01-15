const axios = require('axios');
const Parser = require('rss-parser');
const cheerio = require('cheerio');

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
    const [unsplash, pinterest, behance] = await Promise.all([
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
        try {
          // Scrape Dribbble Search Results using Cheerio (No Token Required)
          const searchUrl = `https://dribbble.com/search/${encodeURIComponent(q)}`;
          console.log(`Scraping Dribbble: ${searchUrl}`);

          const { data: html } = await axios.get(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });

          const $ = cheerio.load(html);
          const results = [];

          $('.shot-thumbnail').each((i, el) => {
            if (results.length >= 30) return;

            const $el = $(el);
            // Dribbble structure changes often, attempting robust selectors

            // Image URL
            let image = null;
            const $img = $el.find('img');
            // Try data-src (lazy load) or src
            if ($img.attr('data-src')) image = $img.attr('data-src');
            else if ($img.attr('src')) image = $img.attr('src');

            // Video/GIF fallback
            if (!image) {
              const videoSrc = $el.find('video source').attr('src');
              if (videoSrc) image = videoSrc;
            }

            // Title
            const title = $el.find('.shot-title').text().trim() || 'Dribbble Shot';

            // Link
            const relativeLink = $el.find('.shot-thumbnail-link').attr('href');
            const link = relativeLink ? `https://dribbble.com${relativeLink}` : null;

            // Creator
            const creator = $el.find('.user-information .display-name').text().trim();

            if (image && link) {
              results.push({
                id: `dribbble_${link.split('/').pop()}`, // extract ID from URL
                source: 'dribbble',
                title,
                image,
                link,
                creator: creator || 'Unknown'
              });
            }
          });

          return results;

        } catch (e) {
          console.error('Dribbble scraping error', e.message);
          return [];
        }
      })()
    ]);

    console.log(`Inspiration Results - Unsplash: ${unsplash.length}, Pinterest: ${pinterest.length}, Behance: ${behance.length}`);

    // Unified list
    const unified = [...unsplash, ...pinterest, ...behance];
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
