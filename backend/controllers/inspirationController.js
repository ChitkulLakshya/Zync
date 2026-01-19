/**
 * Inspiration Controller (Hybrid Version)
 * Serves pre-scraped inspiration from static JSON cache.
 * Falls back to live Dribbble scraping if cache results are low.
 */

const fs = require('fs');
const path = require('path');
const { launchBrowser, scrapeDribbble } = require('../services/scraperService');

const DATA_FILE = path.join(__dirname, '../data/inspiration.json');

/**
 * GET /api/inspiration?q=web+design
 * Serves data from static JSON cache + live fallback.
 */
async function getInspiration(req, res) {
  const query = (req.query.q || '').toLowerCase().trim();
  console.log(`\n========== INSPIRATION REQUEST (HYBRID): "${query}" ==========`);

  try {
    // 1. Check if cache exists
    if (!fs.existsSync(DATA_FILE)) {
      console.warn('WARN: Static cache file not found.');
    }

    // 2. Read Cache (if exists)
    let allItems = [];
    if (fs.existsSync(DATA_FILE)) {
      const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
      allItems = JSON.parse(rawData);
    }

    // 3. Filter if query is present
    if (query && query !== 'web design') {
      allItems = allItems.filter(item => {
        const titleMatch = item.title?.toLowerCase().includes(query);
        const sourceMatch = item.source?.toLowerCase().includes(query);
        const tagMatch = item.tags?.some(tag => tag.toLowerCase().includes(query));

        return titleMatch || sourceMatch || tagMatch;
      });
    }

    console.log(`Matched ${allItems.length} items from cache.`);

    // --- HYBRID FALLBACK LOGIC ---
    // If cache has few results (< 5) and there is a query, try live Dribbble scraping
    if (allItems.length < 5 && query) {
      console.log(`⚠️ Low cache results for "${query}". Triggering live Dribbble fallback...`);
      let browser = null;
      try {
        browser = await launchBrowser();
        const dribbbleItems = await scrapeDribbble(browser, query);

        if (dribbbleItems.length > 0) {
          console.log(`✨ Live Dribbble scraped ${dribbbleItems.length} items.`);
          // Merge and deduplicate
          const existingIds = new Set(allItems.map(i => i.link));
          const newItems = dribbbleItems.filter(i => !existingIds.has(i.link));
          allItems = [...allItems, ...newItems];
        } else {
          console.log('⚠️ Live Dribbble returned 0 items.');
        }
      } catch (err) {
        console.error('Live Fallback Error:', err.message);
        // Continue with cached items even if fallback fails
      } finally {
        if (browser) await browser.close();
      }
    }

    // 4. Shuffle (optional, cache is already shuffled, but fresh shuffle is nice)
    for (let i = allItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
    }

    res.json({
      ok: true,
      count: allItems.length,
      items: allItems
    });

  } catch (error) {
    console.error('Inspiration Controller Error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
}

/**
 * GET /api/inspiration/dribbble
 * Kept for legacy compatibility, redirects to main handler
 */
async function getDribbbleInspiration(req, res) {
  return getInspiration(req, res);
}

module.exports = { getInspiration, getDribbbleInspiration };
