const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());


const LAUNCH_OPTIONS = {
    headless: 'new',
    args: [
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--window-size=1600,1200'
    ]
};

const SHARED_BROWSER_IDLE_MS = Number.parseInt(process.env.SHARED_BROWSER_IDLE_MS || '300000', 10);
let sharedBrowser = null;
let sharedBrowserPromise = null;
let sharedBrowserIdleTimer = null;

function clearSharedBrowserIdleTimer() {
    if (sharedBrowserIdleTimer) {
        clearTimeout(sharedBrowserIdleTimer);
        sharedBrowserIdleTimer = null;
    }
}

function scheduleSharedBrowserClose() {
    clearSharedBrowserIdleTimer();
    sharedBrowserIdleTimer = setTimeout(async () => {
        await closeSharedBrowser();
    }, SHARED_BROWSER_IDLE_MS);
}


async function launchBrowser() {

    const options = { ...LAUNCH_OPTIONS, args: [...LAUNCH_OPTIONS.args] };

    if (process.env.PUPPETEER_NO_SANDBOX === 'true') {
        console.warn('WARNING: Puppeteer sandbox disabled! This is insecure.');
        options.args.push(
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--single-process',
            '--no-zygote'
        );
    }

    console.log('DEBUG: Launching Stealth Puppeteer...');
    return await puppeteer.launch(options);
}

async function getSharedBrowser() {
    if (sharedBrowser && sharedBrowser.isConnected()) {
        scheduleSharedBrowserClose();
        return sharedBrowser;
    }

    if (sharedBrowserPromise) {
        return sharedBrowserPromise;
    }

    sharedBrowserPromise = launchBrowser()
        .then((browser) => {
            sharedBrowser = browser;
            browser.on('disconnected', () => {
                sharedBrowser = null;
                clearSharedBrowserIdleTimer();
            });
            scheduleSharedBrowserClose();
            return browser;
        })
        .finally(() => {
            sharedBrowserPromise = null;
        });

    return sharedBrowserPromise;
}

async function closeSharedBrowser() {
    clearSharedBrowserIdleTimer();

    if (!sharedBrowser) {
        return;
    }

    const browserToClose = sharedBrowser;
    sharedBrowser = null;

    try {
        if (browserToClose.isConnected()) {
            await browserToClose.close();
        }
    } catch (error) {
        console.error('Failed to close shared browser:', error.message);
    }
}


async function scrapeLapaNinja(browser, query) {
    if (!browser) return [];
    const page = await browser.newPage();

    try {
        const encodedQuery = encodeURIComponent(query || 'web design');
        const url = `https://www.lapa.ninja/search/?q=${encodedQuery}`;
        console.log(`DEBUG: Navigating to Lapa Ninja: ${url}`);

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });


        try {
            await page.waitForSelector('.ais-Hits-item', { timeout: 10000 });
        } catch {
            console.log('DEBUG: No results found on Lapa Ninja for this query');
            return [];
        }


        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, 1000));
            await new Promise(r => setTimeout(r, 500));
        }


        try {
            const nextBtn = await page.$('.ais-Pagination-item--nextPage a');
            if (nextBtn) {
                await nextBtn.click();
                await new Promise(r => setTimeout(r, 1500));
            }
        } catch {

        }

        const results = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.ais-Hits-item')).map(item => {
                const anchor = item.querySelector('a');
                const img = item.querySelector('img');
                return {
                    title: img?.alt || anchor?.title || 'Lapa Ninja Inspiration',
                    link: anchor?.href || '',
                    image: img?.src || '',
                    source: 'Lapa Ninja'
                };
            }).filter(item => item.image && item.link);
        });

        console.log(`DEBUG: Scraped ${results.length} Lapa Ninja items.`);
        return results.map(i => ({ ...i, id: i.link }));

    } catch (e) {
        console.error('Lapa Ninja Error:', e.message);
        return [];
    } finally {
        if (page && !page.isClosed()) await page.close();
    }
}


async function scrapeGodly(browser, query) {
    if (!browser) return [];
    const page = await browser.newPage();

    try {

        await page.setViewport({ width: 1600, height: 1200 });


        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['font', 'stylesheet', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        const encodedQuery = encodeURIComponent(query || 'web design');
        const url = `https://godly.website/?term=${encodedQuery}`;
        console.log(`DEBUG: Navigating to Godly: ${url}`);

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });


        await page.waitForSelector('article', { timeout: 15000 });


        await page.evaluate(() => window.scrollBy(0, 1000));
        await new Promise(r => setTimeout(r, 1000));

        const results = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('article')).map(article => {
                const linkEl = article.querySelector('a[href^="/website/"]');
                const bgDiv = article.querySelector('div.bg-cover');
                const titleText = article.innerText.split('\n')[0];

                let imageUrl = '';
                if (bgDiv && bgDiv.style.backgroundImage) {

                    imageUrl = bgDiv.style.backgroundImage.slice(5, -2);
                }

                return {
                    title: titleText || 'Godly Website',
                    link: linkEl ? linkEl.href : 'https://godly.website',
                    image: imageUrl,
                    source: 'Godly'
                };
            }).filter(item => item.image);
        });

        console.log(`DEBUG: Scraped ${results.length} Godly items.`);
        return results.map(i => ({ ...i, id: i.link }));

    } catch (e) {
        console.error('Godly Error:', e.message);
        return [];
    } finally {
        if (page && !page.isClosed()) await page.close();
    }
}


async function scrapeSiteInspire(browser, query) {
    if (!browser) return [];
    const page = await browser.newPage();

    try {
        const encodedQuery = encodeURIComponent(query || 'web design');
        const url = `https://www.siteinspire.com/search?query=${encodedQuery}`;
        console.log(`DEBUG: Navigating to SiteInspire: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });


        try {
            await page.waitForSelector('.WebsiteCard', { timeout: 8000 });
        } catch {
            console.log('DEBUG: No results found on SiteInspire for this query');
            return [];
        }


        await page.evaluate(() => window.scrollBy(0, 800));
        await new Promise(r => setTimeout(r, 500));

        const results = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.WebsiteCard')).map(card => {
                const externalLink = card.querySelector('a.ExternalLinkButton');
                const internalLink = card.querySelector('a.WebsiteCard__imageWrapper');
                const img = card.querySelector('img.WebsiteCard__image') || card.querySelector('img');
                const titleEl = card.querySelector('.WebsiteCaption__title');


                const imageUrl = img?.src || '';

                return {
                    title: titleEl?.innerText?.trim() || 'SiteInspire Site',
                    link: externalLink?.href || internalLink?.href || '',
                    image: imageUrl,
                    source: 'SiteInspire'
                };
            }).filter(item => item.image && item.link);
        });

        console.log(`DEBUG: Scraped ${results.length} SiteInspire items.`);
        return results.map(i => ({ ...i, id: i.link }));

    } catch (e) {
        console.error('SiteInspire Error:', e.message);
        return [];
    } finally {
        if (page && !page.isClosed()) await page.close();
    }
}


async function scrapeDribbble(browser, query) {
    if (!browser) return [];
    const page = await browser.newPage();

    try {
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

        const encodedQuery = encodeURIComponent(query || 'web design');
        const url = `https://dribbble.com/search/${encodedQuery}`;
        console.log(`DEBUG: Navigating to Dribbble: ${url}`);

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });


        try {
            await page.waitForSelector('li.shot-thumbnail', { timeout: 15000 });
        } catch {
            console.log('DEBUG: Timeout waiting for Dribbble selector');
        }


        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            await new Promise(r => setTimeout(r, 1500));
        }

        const results = await page.evaluate(() => {
            const items = document.querySelectorAll('li.shot-thumbnail');
            const results = [];

            items.forEach(item => {
                const linkEl = item.querySelector('a.shot-thumbnail-link') || item.querySelector('a');
                const titleEl = item.querySelector('div.shot-title');
                const imgEl = item.querySelector('figure img') || item.querySelector('img');

                let image = null;
                if (imgEl) {
                    const dataSrcset = imgEl.getAttribute('data-srcset');
                    const srcset = imgEl.getAttribute('srcset');
                    const dataSrc = imgEl.getAttribute('data-src');
                    const src = imgEl.getAttribute('src');

                    if (dataSrcset) {
                        const parts = dataSrcset.split(',');
                        const match = parts.find(p => p.includes('400x300'));
                        image = match ? match.trim().split(' ')[0] : parts[0].trim().split(' ')[0];
                    } else if (srcset) {
                        const parts = srcset.split(',');
                        const match = parts.find(p => p.includes('400x300'));
                        image = match ? match.trim().split(' ')[0] : parts[0].trim().split(' ')[0];
                    } else if (dataSrc && !dataSrc.startsWith('data:')) {
                        image = dataSrc;
                    } else if (src && !src.startsWith('data:')) {
                        image = src;
                    }
                }

                if (linkEl && image) {
                    results.push({
                        title: titleEl?.innerText?.trim() || 'Design Inspiration',
                        link: linkEl.href,
                        image: image,
                        source: 'Dribbble'
                    });
                }
            });

            return results;
        });

        console.log(`DEBUG: Scraped ${results.length} Dribbble items.`);
        return results.map(i => ({ ...i, id: i.link }));

    } catch (e) {
        console.error('Dribbble Error:', e.message);
        return [];
    } finally {
        if (page && !page.isClosed()) await page.close();
    }
}


async function scrapeAwwwards(browser, query) {
    if (!browser) return [];
    const page = await browser.newPage();

    try {
        await page.setViewport({ width: 1600, height: 1200 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const encodedQuery = encodeURIComponent(query || 'web design');
        const url = `https://www.awwwards.com/websites/?q=${encodedQuery}`;
        console.log(`DEBUG: Navigating to Awwwards: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });


        try {
            await page.waitForSelector('.card-site', { timeout: 10000 });
        } catch {
            console.log('DEBUG: No results found on Awwwards for this query');
            return [];
        }


        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 500));
        }

        const results = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.card-site')).map(card => {
                const linkEl = card.querySelector('a.figure-rollover__link');
                const imgEl = card.querySelector('img');


                const title = linkEl?.getAttribute('aria-label') || 'Awwwards Site';


                let link = linkEl?.getAttribute('href') || '';
                if (link && !link.startsWith('http')) {
                    link = 'https://www.awwwards.com' + link;
                }


                let imageUrl = '';
                const srcset = imgEl?.getAttribute('srcset') || imgEl?.getAttribute('data-srcset');
                if (srcset) {

                    const parts = srcset.split(',');
                    const highRes = parts.find(p => p.includes('2x')) || parts[0];
                    imageUrl = highRes?.trim().split(' ')[0] || '';
                } else {
                    const src = imgEl?.src;
                    if (src && !src.startsWith('data:')) {
                        imageUrl = src;
                    }
                }

                return {
                    title,
                    link,
                    image: imageUrl,
                    source: 'Awwwards'
                };
            }).filter(item => item.image && item.link);
        });

        console.log(`DEBUG: Scraped ${results.length} Awwwards items.`);
        return results.map(i => ({ ...i, id: i.link }));

    } catch (e) {
        console.error('Awwwards Error:', e.message);
        return [];
    } finally {
        if (page && !page.isClosed()) await page.close();
    }
}

module.exports = {
    launchBrowser,
    getSharedBrowser,
    closeSharedBrowser,
    scrapeLapaNinja,
    scrapeGodly,
    scrapeSiteInspire,
    scrapeDribbble,
    scrapeAwwwards
};
