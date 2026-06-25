const fs = require('fs');
const path = require('path');
const { paginateArray, setPaginationHeaders } = require('../utils/pagination');
const {
  getSharedBrowser,
  scrapeDribbble,
} = require('../services/scraperService');

const DATA_FILE = path.join(__dirname, '../data/inspiration.json');

let CACHED_DATA = null;

function loadCache() {
  if (!CACHED_DATA) {
    try {
      const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
      CACHED_DATA = JSON.parse(rawData);
    } catch (err) {
      CACHED_DATA = [];
      if (err.code === 'ENOENT') {
        console.warn('WARN: Static cache file not found.');
      } else {
        console.warn(`WARN: Failed to read cache file: ${err.message}`);
      }
    }
  }
  return CACHED_DATA;
}

function searchCache(query) {
  let items = loadCache();

  if (query && query !== 'web design') {
    const normalizedQuery = query.replace(/[\s-]+/g, '');
    items = items.filter((item) => {
      const title = item.title?.toLowerCase() || '';
      const source = item.source?.toLowerCase() || '';
      const tags = item.tags?.map((t) => t.toLowerCase()) || [];

      const titleMatch =
        title.includes(query) ||
        title.replace(/[\s-]+/g, '').includes(normalizedQuery);
      const sourceMatch =
        source.includes(query) ||
        source.replace(/[\s-]+/g, '').includes(normalizedQuery);
      const tagMatch = tags.some(
        (tag) =>
          tag.includes(query) ||
          tag.replace(/[\s-]+/g, '').includes(normalizedQuery)
      );
      return titleMatch || sourceMatch || tagMatch;
    });
  }

  return items;
}


async function getInspiration(req, res) {
  const query = (req.query.q || '').toLowerCase().trim();

  try {
    const allItems = searchCache(query);

    const { items, pagination } = paginateArray(allItems, req.query);
    setPaginationHeaders(res, pagination);

    res.json({
      ok: true,
      count: items.length,
      total: allItems.length,
      items,
    });
  } catch (error) {
    console.error('Inspiration Controller Error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
}


async function getLiveScrape(req, res) {
  const query = (req.query.q || '').toLowerCase().trim();

  if (!query) {
    return res.json({ ok: true, count: 0, items: [] });
  }

  try {
    console.log(`Live scraping Dribbble for "${query}"...`);
    const browser = await getSharedBrowser();
    const items = await scrapeDribbble(browser, query);
    console.log(`Scraped ${items.length} items from Dribbble for "${query}"`);

    res.json({
      ok: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error('Live Scrape Error:', error);
    res.json({ ok: true, count: 0, items: [] });
  }
}

async function getDribbbleInspiration(req, res) {
  return getInspiration(req, res);
}

module.exports = { getInspiration, getDribbbleInspiration, getLiveScrape };
