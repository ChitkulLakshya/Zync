/**
 * Inspiration Controller
 * Orchestrates scraping, merges results, and handles the API response.
 */

const {
  launchBrowser,
  scrapeLapaNinja,
  scrapeGodly,
  scrapeSiteInspire,
  scrapeDribbble,
  scrapeAwwwards
} = require('../services/scraperService');

/**
 * GET /api/inspiration?q=web+design
 * Fetches inspiration from 4 sources in parallel.
 */
async function getInspiration(req, res) {
  const query = req.query.q || 'web design';
  console.log(`\n========== INSPIRATION REQUEST: "${query}" ==========`);

  let browser = null;

  try {
    // Launch browser ONCE for all scrapers
    browser = await launchBrowser();

    // Run all scrapers in parallel
    const results = await Promise.allSettled([
      scrapeLapaNinja(browser, query),
      scrapeGodly(browser, query),
      scrapeSiteInspire(browser, query),
      scrapeDribbble(browser, query),
      scrapeAwwwards(browser, query)
    ]);

    // Extract results, logging any failures
    const lapaNinja = results[0].status === 'fulfilled' ? results[0].value : [];
    const godly = results[1].status === 'fulfilled' ? results[1].value : [];
    const siteInspire = results[2].status === 'fulfilled' ? results[2].value : [];
    const dribbble = results[3].status === 'fulfilled' ? results[3].value : [];
    const awwwards = results[4].status === 'fulfilled' ? results[4].value : [];

    if (results[0].status === 'rejected') console.error('Lapa Ninja Failed:', results[0].reason?.message);
    if (results[1].status === 'rejected') console.error('Godly Failed:', results[1].reason?.message);
    if (results[2].status === 'rejected') console.error('SiteInspire Failed:', results[2].reason?.message);
    if (results[3].status === 'rejected') console.error('Dribbble Failed:', results[3].reason?.message);
    if (results[4].status === 'rejected') console.error('Awwwards Failed:', results[4].reason?.message);

    console.log(`Results - Lapa: ${lapaNinja.length}, Godly: ${godly.length}, SiteInspire: ${siteInspire.length}, Dribbble: ${dribbble.length}, Awwwards: ${awwwards.length}`);

    // Merge all results
    let unified = [...lapaNinja, ...godly, ...siteInspire, ...dribbble, ...awwwards];

    // Shuffle (Fisher-Yates)
    for (let i = unified.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unified[i], unified[j]] = [unified[j], unified[i]];
    }

    // Deduplicate by ID (link)
    const seen = new Set();
    unified = unified.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    console.log(`Total unique items: ${unified.length}`);
    console.log(`========== REQUEST COMPLETE ==========\n`);

    res.json({
      ok: true,
      count: unified.length,
      items: unified
    });

  } catch (error) {
    console.error('Inspiration Controller Error:', error);
    res.status(500).json({ ok: false, error: error.message });
  } finally {
    // ALWAYS close browser
    if (browser) {
      console.log('DEBUG: Closing shared browser...');
      await browser.close();
    }
  }
}

/**
 * GET /api/inspiration/dribbble?q=web+design
 * Standalone Dribbble endpoint (for testing/fallback).
 */
async function getDribbbleInspiration(req, res) {
  const query = req.query.q || 'web design';
  let browser = null;

  try {
    browser = await launchBrowser();
    const items = await scrapeDribbble(browser, query);
    res.json(items);
  } catch (error) {
    console.error('Dribbble Controller Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { getInspiration, getDribbbleInspiration };
