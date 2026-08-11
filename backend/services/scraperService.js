/**
 * @fileoverview scraperService.js
 * @module scraperService
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Server-Side API & Business Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license AGPL-3.0-only
 * ============================================================================
 */
/**
 * EDUCATIONAL COMMENT: What and Why
 * What: A web scraping service using Puppeteer and Stealth plugins to extract design inspiration and content from sites like Lapa Ninja, Godly, SiteInspire, Dribbble, and Awwwards.
 * Why: Consolidates browser automation logic and manages a shared browser instance lifecycle. This heavily optimizes resource usage and prevents zombie Chrome processes while bypassing anti-bot measures.
 */
const puppeteer = require('puppeteer-extra'); // WHAT: Imports the puppeteer-extra wrapper. WHY: Allows us to use plugins (like stealth) with puppeteer.
const StealthPlugin = require('puppeteer-extra-plugin-stealth'); // WHAT: Imports the stealth plugin. WHY: Evades bot-detection mechanisms by spoofing browser fingerprints.

puppeteer.use(StealthPlugin()); // WHAT: Registers the stealth plugin with puppeteer. WHY: Ensures all subsequent browser launches are protected against basic bot detection.


const LAUNCH_OPTIONS = { // WHAT: Defines the default arguments for launching Chrome. WHY: Centralizes configuration for consistency across environments.
    headless: 'new', // WHAT: Uses the new headless mode. WHY: More robust and closer to headful behavior than the old headless mode.
    args: [
        '--disable-gpu', // WHAT: Disables hardware acceleration. WHY: Useful in cloud environments (like Docker/Linux) where GPUs aren't available.
        '--disable-dev-shm-usage', // WHAT: Disables /dev/shm usage. WHY: Prevents crashes in Docker containers with limited shared memory.
        '--window-size=1600,1200' // WHAT: Sets the default viewport size. WHY: Ensures consistent rendering of responsive sites.
    ]
};

const SHARED_BROWSER_IDLE_MS = Number.parseInt(process.env.SHARED_BROWSER_IDLE_MS || '300000', 10); // WHAT: Sets the idle timeout before the shared browser closes. WHY: Frees up RAM when no scraping is happening. Default 5 mins.
let sharedBrowser = null; // WHAT: Holds the reference to the active browser instance. WHY: Allows reusing the same browser across multiple concurrent or sequential requests.
let sharedBrowserPromise = null; // WHAT: Holds a pending promise if a browser is currently launching. WHY: Prevents race conditions where two simultaneous requests might launch two browsers.
let sharedBrowserIdleTimer = null; // WHAT: Holds the setTimeout reference for the idle timer. WHY: Allows us to clear and reset the timer whenever the browser is used.

function clearSharedBrowserIdleTimer() { // WHAT: Helper to clear the idle timer. WHY: Needed to stop the browser from closing prematurely when new activity occurs.
    if (sharedBrowserIdleTimer) { // WHAT: Checks if a timer exists. WHY: Prevents errors from passing null to clearTimeout.
        clearTimeout(sharedBrowserIdleTimer); // WHAT: Cancels the timer. WHY: The browser is no longer idle.
        sharedBrowserIdleTimer = null; // WHAT: Resets the reference. WHY: Keeps state clean.
    }
}

function scheduleSharedBrowserClose() { // WHAT: Helper to schedule the browser to close after inactivity. WHY: Prevents memory leaks from keeping headless Chrome open forever.
    clearSharedBrowserIdleTimer(); // WHAT: Clears any existing timer. WHY: Resets the countdown.
    sharedBrowserIdleTimer = setTimeout(async () => { // WHAT: Sets a new timer. WHY: Defers the closure.
        await closeSharedBrowser(); // WHAT: Calls the close function when time is up. WHY: Executes the cleanup.
    }, SHARED_BROWSER_IDLE_MS);
}


async function launchBrowser() { // WHAT: Async function to perform the actual Puppeteer launch. WHY: Encapsulates the specific launch logic and environment checks.

    const options = { ...LAUNCH_OPTIONS, args: [...LAUNCH_OPTIONS.args] }; // WHAT: Clones the default options. WHY: Prevents mutating the global constant.

    if (process.env.PUPPETEER_NO_SANDBOX === 'true') { // WHAT: Checks an env var to disable sandboxing. WHY: Often required for running Puppeteer inside Alpine Linux or certain CI environments.
        console.warn('WARNING: Puppeteer sandbox disabled! This is insecure.'); // WHAT: Logs a security warning. WHY: Disabling sandboxing makes the host machine vulnerable if scraping malicious sites.
        options.args.push(
            '--no-sandbox', // WHAT: Disables the Chrome sandbox. WHY: Needed for root execution.
            '--disable-setuid-sandbox', // WHAT: Disables setuid sandbox. WHY: Needed for root execution.
            '--single-process', // WHAT: Runs Chrome in a single process. WHY: Saves memory and works around IPC limits in some containers.
            '--no-zygote' // WHAT: Disables zygote forks. WHY: Works around shared memory issues in Docker.
        );
    }

    console.log('DEBUG: Launching Stealth Puppeteer...'); // WHAT: Logs the start of the launch. WHY: Aids in debugging cold start delays.
    return await puppeteer.launch(options); // WHAT: Executes the launch. WHY: Creates the actual browser process.
}

async function getSharedBrowser() { // WHAT: The main entry point for getting a browser instance. WHY: Implements the singleton pattern with lazy loading.
    if (sharedBrowser && sharedBrowser.isConnected()) { // WHAT: Checks if we already have a healthy browser. WHY: Reusing it is much faster than launching a new one.
        scheduleSharedBrowserClose(); // WHAT: Resets the idle timer. WHY: We just used it, so it shouldn't close soon.
        return sharedBrowser; // WHAT: Returns the active browser. WHY: Fast path.
    }

    if (sharedBrowserPromise) { // WHAT: Checks if a launch is already in progress. WHY: Prevents concurrent launches.
        return sharedBrowserPromise; // WHAT: Returns the pending promise. WHY: All callers will wait for the same browser to finish launching.
    }

    sharedBrowserPromise = launchBrowser() // WHAT: Initiates the launch process. WHY: We need a new browser.
        .then((browser) => { // WHAT: Callback when launch completes successfully. WHY: To set up state.
            sharedBrowser = browser; // WHAT: Saves the reference. WHY: For future calls.
            browser.on('disconnected', () => { // WHAT: Listens for unexpected disconnections (e.g., crashes). WHY: To clean up state.
                sharedBrowser = null; // WHAT: Nullifies reference. WHY: So next request launches a new one.
                clearSharedBrowserIdleTimer(); // WHAT: Clears timer. WHY: No browser to close.
            });
            scheduleSharedBrowserClose(); // WHAT: Starts the idle countdown. WHY: In case no one actually uses it.
            return browser; // WHAT: Resolves the promise with the browser. WHY: Returns it to the caller.
        })
        .finally(() => { // WHAT: Finally block executed win or lose. WHY: To clean up the pending promise flag.
            sharedBrowserPromise = null; // WHAT: Nullifies promise reference. WHY: So future calls know they can launch again if needed.
        });

    return sharedBrowserPromise; // WHAT: Returns the newly created promise. WHY: Calling code awaits this.
}

async function closeSharedBrowser() { // WHAT: Explicitly closes the shared browser. WHY: Used by the idle timer or graceful shutdown scripts.
    clearSharedBrowserIdleTimer(); // WHAT: Stops the timer. WHY: We are closing it now.

    if (!sharedBrowser) { // WHAT: Checks if there is actually a browser. WHY: Fast return if already closed.
        return;
    }

    const browserToClose = sharedBrowser; // WHAT: Copies the reference locally. WHY: So we can nullify the global state instantly.
    sharedBrowser = null; // WHAT: Instantly nullifies global state. WHY: Prevents new incoming requests from trying to use a closing browser.

    try {
        if (browserToClose.isConnected()) { // WHAT: Checks if it's still connected. WHY: Prevents throws if it crashed.
            await browserToClose.close(); // WHAT: Issues the close command. WHY: Kills the Chrome process gracefully.
        }
    } catch (error) { // WHAT: Catches errors during close. WHY: Prevents unhandled rejections on teardown.
        console.error('Failed to close shared browser:', error.message); // WHAT: Logs the error. WHY: Debugging.
    }
}


async function scrapeLapaNinja(browser, query) { // WHAT: Scraper function specifically for Lapa Ninja. WHY: Each site requires custom DOM navigation logic.
    if (!browser) return []; // WHAT: Failsafe. WHY: Prevents null pointer errors.
    const page = await browser.newPage(); // WHAT: Creates a new tab. WHY: Isolates this scraping task from others.

    try {
        const encodedQuery = encodeURIComponent(query || 'web design'); // WHAT: URL-encodes the search query. WHY: Makes it safe to append to a URL.
        const url = `https://www.lapa.ninja/search/?q=${encodedQuery}`; // WHAT: Constructs the target URL. WHY: Points to the site's search endpoint.
        console.log(`DEBUG: Navigating to Lapa Ninja: ${url}`); // WHAT: Logs navigation. WHY: Observability.

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'); // WHAT: Spoofs a modern Windows Chrome user agent. WHY: Lapa Ninja might block default headless User Agents.
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }); // WHAT: Navigates to the page and waits for network quiet. WHY: Ensures dynamic content (like React) has time to load.


        try {
            await page.waitForSelector('.ais-Hits-item', { timeout: 10000 }); // WHAT: Waits up to 10s for the specific search result card class. WHY: Verifies the page actually loaded results before we try to parse.
        } catch {
            console.log('DEBUG: No results found on Lapa Ninja for this query'); // WHAT: Logs timeout. WHY: Usually means zero search results.
            return []; // WHAT: Returns empty array. WHY: Graceful degradation.
        }


        for (let i = 0; i < 3; i++) { // WHAT: Loops 3 times to scroll down. WHY: Triggers lazy-loaded images to fetch their actual src attributes instead of placeholders.
            await page.evaluate(() => window.scrollBy(0, 1000)); // WHAT: Executes JS in the browser to scroll down 1000px. WHY: Simulates human scrolling.
            await new Promise(r => setTimeout(r, 500)); // WHAT: Waits 500ms between scrolls. WHY: Gives images time to request and render.
        }


        try {
            const nextBtn = await page.$('.ais-Pagination-item--nextPage a'); // WHAT: Looks for a "Next Page" button. WHY: We might want more results.
            if (nextBtn) { // WHAT: Checks if it exists. WHY: We might be on the last page.
                await nextBtn.click(); // WHAT: Clicks it. WHY: Loads page 2.
                await new Promise(r => setTimeout(r, 1500)); // WHAT: Waits 1.5s for page 2 to render. WHY: It's an SPA transition, so networkidle2 might not catch it perfectly.
            }
        } catch {
            // Silently ignore pagination failures.
        }

        const results = await page.evaluate(() => { // WHAT: Injects a script into the browser context to extract data. WHY: Much faster than doing hundreds of individual element queries over the DevTools Protocol.
            return Array.from(document.querySelectorAll('.ais-Hits-item')).map(item => { // WHAT: Finds all result cards and maps them. WHY: Transforms DOM elements into JS objects.
                const anchor = item.querySelector('a'); // WHAT: Finds the link element. WHY: We need the URL.
                const img = item.querySelector('img'); // WHAT: Finds the image element. WHY: We need the thumbnail.
                return {
                    title: img?.alt || anchor?.title || 'Lapa Ninja Inspiration', // WHAT: Tries various sources for the title. WHY: Fallbacks ensure we get something usable.
                    link: anchor?.href || '', // WHAT: Extracts the absolute URL. WHY: Where the user clicks.
                    image: img?.src || '', // WHAT: Extracts the absolute image URL. WHY: For displaying the thumbnail.
                    source: 'Lapa Ninja' // WHAT: Hardcodes the source. WHY: Identifies the origin in the aggregate UI.
                };
            }).filter(item => item.image && item.link); // WHAT: Filters out broken entries. WHY: Ensures data quality.
        });

        console.log(`DEBUG: Scraped ${results.length} Lapa Ninja items.`); // WHAT: Logs count. WHY: Observability.
        return results.map(i => ({ ...i, id: i.link })); // WHAT: Adds a unique ID based on the link. WHY: Needed for React keys on the frontend.

    } catch (e) {
        console.error('Lapa Ninja Error:', e.message); // WHAT: Logs errors. WHY: Debugging.
        return []; // WHAT: Returns empty on failure. WHY: Fails gracefully so other scrapers can still succeed.
    } finally {
        if (page && !page.isClosed()) await page.close(); // WHAT: Ensures the tab is closed. WHY: Prevents memory leaks.
    }
}


async function scrapeGodly(browser, query) { // WHAT: Scraper function specifically for Godly.website. WHY: Different site, different DOM structure.
    if (!browser) return [];
    const page = await browser.newPage(); // WHAT: Creates a new tab. WHY: Isolation.

    try {

        await page.setViewport({ width: 1600, height: 1200 }); // WHAT: Sets viewport size. WHY: Godly's layout is heavily dependent on screen size.


        await page.setRequestInterception(true); // WHAT: Enables request interception. WHY: Allows us to block unnecessary assets to speed up scraping.
        page.on('request', (req) => { // WHAT: Listens to every outgoing network request from the tab. WHY: To filter them.
            if (['font', 'stylesheet', 'media'].includes(req.resourceType())) { // WHAT: Checks if the resource is non-essential (fonts, CSS, videos). WHY: We only need HTML and images.
                req.abort(); // WHAT: Blocks the request. WHY: Saves bandwidth and speeds up page load dramatically.
            } else {
                req.continue(); // WHAT: Allows the request through. WHY: HTML, scripts, and images are needed.
            }
        });

        const encodedQuery = encodeURIComponent(query || 'web design');
        const url = `https://godly.website/?term=${encodedQuery}`; // WHAT: Constructs Godly URL. WHY: Points to search endpoint.
        console.log(`DEBUG: Navigating to Godly: ${url}`);

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }); // WHAT: Navigates and waits for DOM content. WHY: 'domcontentloaded' is faster than 'networkidle2' and sufficient for Godly.


        await page.waitForSelector('article', { timeout: 15000 }); // WHAT: Waits for the 'article' tags which represent the cards. WHY: Ensures data is present.


        await page.evaluate(() => window.scrollBy(0, 1000)); // WHAT: Scrolls down. WHY: Triggers lazy loading.
        await new Promise(r => setTimeout(r, 1000)); // WHAT: Waits 1s. WHY: Gives time for images to appear.

        const results = await page.evaluate(() => { // WHAT: Injects extraction script. WHY: Fast DOM parsing.
            return Array.from(document.querySelectorAll('article')).map(article => { // WHAT: Selects all articles. WHY: Iterates over result cards.
                const linkEl = article.querySelector('a[href^="/website/"]'); // WHAT: Finds specific link element. WHY: Avoids clicking author links or tags.
                const bgDiv = article.querySelector('div.bg-cover'); // WHAT: Finds the div with the background image. WHY: Godly uses CSS backgrounds instead of img tags for thumbnails.
                const titleText = article.innerText.split('\n')[0]; // WHAT: Attempts to extract title from text. WHY: Fallback mechanism.

                let imageUrl = '';
                if (bgDiv && bgDiv.style.backgroundImage) { // WHAT: Checks if the inline style exists. WHY: Safety check.
                    imageUrl = bgDiv.style.backgroundImage.slice(5, -2); // WHAT: Extracts URL from 'url("http...")'. WHY: Slices out the wrapper string.
                }

                return {
                    title: titleText || 'Godly Website', // WHAT: Fallback title. WHY: Ensures a value.
                    link: linkEl ? linkEl.href : 'https://godly.website', // WHAT: Resolves absolute link. WHY: For clicking.
                    image: imageUrl, // WHAT: Assigns image. WHY: For thumbnail.
                    source: 'Godly' // WHAT: Hardcoded source. WHY: Provenance.
                };
            }).filter(item => item.image); // WHAT: Filters out items without images. WHY: We need visually appealing results.
        });

        console.log(`DEBUG: Scraped ${results.length} Godly items.`);
        return results.map(i => ({ ...i, id: i.link })); // WHAT: Adds unique IDs. WHY: React requirements.

    } catch (e) {
        console.error('Godly Error:', e.message);
        return [];
    } finally {
        if (page && !page.isClosed()) await page.close(); // WHAT: Always close tab. WHY: Prevent memory leaks.
    }
}


async function scrapeSiteInspire(browser, query) { // WHAT: Scraper function specifically for SiteInspire. WHY: Different DOM structure.
    if (!browser) return [];
    const page = await browser.newPage(); // WHAT: Creates a new tab. WHY: Isolation.

    try {
        const encodedQuery = encodeURIComponent(query || 'web design');
        const url = `https://www.siteinspire.com/search?query=${encodedQuery}`; // WHAT: Constructs SiteInspire URL. WHY: Points to search endpoint.
        console.log(`DEBUG: Navigating to SiteInspire: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }); // WHAT: Navigates and waits for network quiet. WHY: Safe default.


        try {
            await page.waitForSelector('.WebsiteCard', { timeout: 8000 }); // WHAT: Waits for '.WebsiteCard'. WHY: Confirms results loaded.
        } catch {
            console.log('DEBUG: No results found on SiteInspire for this query');
            return []; // WHAT: Returns empty on timeout. WHY: Likely zero results.
        }


        await page.evaluate(() => window.scrollBy(0, 800)); // WHAT: Scrolls to trigger lazy loading. WHY: Standard practice for image heavy sites.
        await new Promise(r => setTimeout(r, 500)); // WHAT: Brief pause. WHY: Allow network requests to fire.

        const results = await page.evaluate(() => { // WHAT: Injects extraction script. WHY: Fast DOM parsing.
            return Array.from(document.querySelectorAll('.WebsiteCard')).map(card => { // WHAT: Selects cards. WHY: Iterates.
                const externalLink = card.querySelector('a.ExternalLinkButton'); // WHAT: Tries to find direct external link. WHY: SiteInspire sometimes links out directly.
                const internalLink = card.querySelector('a.WebsiteCard__imageWrapper'); // WHAT: Tries to find internal link. WHY: Fallback if external is missing.
                const img = card.querySelector('img.WebsiteCard__image') || card.querySelector('img'); // WHAT: Finds the image. WHY: Thumbnail.
                const titleEl = card.querySelector('.WebsiteCaption__title'); // WHAT: Finds title element. WHY: Title.


                const imageUrl = img?.src || ''; // WHAT: Extracts src. WHY: Image URL.

                return {
                    title: titleEl?.innerText?.trim() || 'SiteInspire Site', // WHAT: Trims text for title. WHY: Clean data.
                    link: externalLink?.href || internalLink?.href || '', // WHAT: Prefers external, falls back to internal. WHY: Better user experience to go direct.
                    image: imageUrl, // WHAT: Assigns image. WHY: Thumbnail.
                    source: 'SiteInspire' // WHAT: Hardcoded source. WHY: Provenance.
                };
            }).filter(item => item.image && item.link); // WHAT: Enforces completeness. WHY: Quality control.
        });

        console.log(`DEBUG: Scraped ${results.length} SiteInspire items.`);
        return results.map(i => ({ ...i, id: i.link })); // WHAT: Adds unique IDs. WHY: React requirements.

    } catch (e) {
        console.error('SiteInspire Error:', e.message);
        return [];
    } finally {
        if (page && !page.isClosed()) await page.close(); // WHAT: Closes tab. WHY: Resource management.
    }
}


async function scrapeDribbble(browser, query) { // WHAT: Scraper function specifically for Dribbble. WHY: Dribbble has complex, responsive image sets.
    if (!browser) return [];
    const page = await browser.newPage();

    try {
        await page.setViewport({ width: 1920, height: 1080 }); // WHAT: Uses a large viewport. WHY: Forces Dribbble to load higher resolution thumbnails.
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'); // WHAT: Spoofs user agent. WHY: Evasion.

        const encodedQuery = encodeURIComponent(query || 'web design');
        const url = `https://dribbble.com/search/${encodedQuery}`; // WHAT: Constructs Dribbble URL. WHY: Points to search endpoint.
        console.log(`DEBUG: Navigating to Dribbble: ${url}`);

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); // WHAT: Navigates and waits. WHY: Dribbble can be slow, hence 60s timeout.


        try {
            await page.waitForSelector('li.shot-thumbnail', { timeout: 15000 }); // WHAT: Waits for shot list items. WHY: Verifies content loaded.
        } catch {
            console.log('DEBUG: Timeout waiting for Dribbble selector'); // WHAT: Logs timeout. WHY: Doesn't throw, just proceeds to try extraction anyway.
        }


        for (let i = 0; i < 3; i++) { // WHAT: Scrolls aggressively. WHY: Dribbble uses intense lazy loading for images.
            await page.evaluate(() => window.scrollBy(0, window.innerHeight)); // WHAT: Scrolls by full window height. WHY: Simulates rapid scrolling.
            await new Promise(r => setTimeout(r, 1500)); // WHAT: Waits 1.5s between scrolls. WHY: Dribbble has throttling on image requests.
        }

        const results = await page.evaluate(() => { // WHAT: Injects extraction script. WHY: Complex logic needed here.
            const items = document.querySelectorAll('li.shot-thumbnail'); // WHAT: Selects all shots. WHY: Base iteration.
            const results = [];

            items.forEach(item => { // WHAT: Loops over items. WHY: Needed to conditionally parse images.
                const linkEl = item.querySelector('a.shot-thumbnail-link') || item.querySelector('a'); // WHAT: Gets link. WHY: URL.
                const titleEl = item.querySelector('div.shot-title'); // WHAT: Gets title. WHY: Title.
                const imgEl = item.querySelector('figure img') || item.querySelector('img'); // WHAT: Gets image tag. WHY: Complex image extraction next.

                let image = null;
                if (imgEl) {
                    const dataSrcset = imgEl.getAttribute('data-srcset'); // WHAT: Tries data-srcset (lazy loaded). WHY: Often contains the high-res URLs on Dribbble.
                    const srcset = imgEl.getAttribute('srcset'); // WHAT: Tries standard srcset. WHY: Fallback.
                    const dataSrc = imgEl.getAttribute('data-src'); // WHAT: Tries data-src. WHY: Fallback 2.
                    const src = imgEl.getAttribute('src'); // WHAT: Tries standard src. WHY: Fallback 3.

                    if (dataSrcset) { // WHAT: If data-srcset exists. WHY: We must parse it to find the best resolution.
                        const parts = dataSrcset.split(','); // WHAT: Splits by comma. WHY: Separates different resolution options.
                        const match = parts.find(p => p.includes('400x300')); // WHAT: Looks for the 400x300 version. WHY: Good balance of quality and size.
                        image = match ? match.trim().split(' ')[0] : parts[0].trim().split(' ')[0]; // WHAT: Takes the URL part. WHY: Extracts the actual link from the srcset syntax.
                    } else if (srcset) { // WHAT: Applies same logic to standard srcset. WHY: Same reason as above.
                        const parts = srcset.split(',');
                        const match = parts.find(p => p.includes('400x300'));
                        image = match ? match.trim().split(' ')[0] : parts[0].trim().split(' ')[0];
                    } else if (dataSrc && !dataSrc.startsWith('data:')) { // WHAT: Checks data-src, ensuring it's not a base64 placeholder. WHY: Avoids saving useless tiny placeholders.
                        image = dataSrc;
                    } else if (src && !src.startsWith('data:')) { // WHAT: Checks src, ensuring it's not base64. WHY: Same reason.
                        image = src;
                    }
                }

                if (linkEl && image) { // WHAT: Validates we found both. WHY: Quality control.
                    results.push({
                        title: titleEl?.innerText?.trim() || 'Design Inspiration', // WHAT: Fallback title. WHY: Reliability.
                        link: linkEl.href, // WHAT: Absolute link. WHY: Usable URL.
                        image: image, // WHAT: Best image found. WHY: Thumbnail.
                        source: 'Dribbble' // WHAT: Provenance. WHY: Identification.
                    });
                }
            });

            return results;
        });

        console.log(`DEBUG: Scraped ${results.length} Dribbble items.`);
        return results.map(i => ({ ...i, id: i.link })); // WHAT: Adds unique IDs. WHY: React.

    } catch (e) {
        console.error('Dribbble Error:', e.message);
        return [];
    } finally {
        if (page && !page.isClosed()) await page.close(); // WHAT: Closes tab. WHY: Resource management.
    }
}


async function scrapeAwwwards(browser, query) { // WHAT: Scraper function specifically for Awwwards. WHY: Highly customized, animated site structure.
    if (!browser) return [];
    const page = await browser.newPage();

    try {
        await page.setViewport({ width: 1600, height: 1200 }); // WHAT: Large viewport. WHY: Awwwards changes DOM heavily based on breakpoints.
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'); // WHAT: Spoofs User Agent. WHY: Standard evasion.

        const encodedQuery = encodeURIComponent(query || 'web design');
        const url = `https://www.awwwards.com/websites/?q=${encodedQuery}`; // WHAT: Constructs Awwwards URL. WHY: Search endpoint.
        console.log(`DEBUG: Navigating to Awwwards: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }); // WHAT: Navigates and waits. WHY: Heavy site, needs time.


        try {
            await page.waitForSelector('.card-site', { timeout: 10000 }); // WHAT: Waits for card-site class. WHY: Verifies load.
        } catch {
            console.log('DEBUG: No results found on Awwwards for this query');
            return [];
        }


        for (let i = 0; i < 3; i++) { // WHAT: Scrolls down. WHY: Lazy loading images.
            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 500));
        }

        const results = await page.evaluate(() => { // WHAT: Injects extraction script. WHY: Fast processing.
            return Array.from(document.querySelectorAll('.card-site')).map(card => { // WHAT: Maps over cards. WHY: Extracts data.
                const linkEl = card.querySelector('a.figure-rollover__link'); // WHAT: Finds the invisible overlay link. WHY: Awwwards uses overlays for clicks.
                const imgEl = card.querySelector('img'); // WHAT: Finds image. WHY: Thumbnail.


                const title = linkEl?.getAttribute('aria-label') || 'Awwwards Site'; // WHAT: Pulls title from aria-label. WHY: Awwwards hides titles visually sometimes for aesthetics.


                let link = linkEl?.getAttribute('href') || ''; // WHAT: Gets href. WHY: URL.
                if (link && !link.startsWith('http')) { // WHAT: Checks if it's a relative URL. WHY: Awwwards often uses relative links.
                    link = 'https://www.awwwards.com' + link; // WHAT: Makes it absolute. WHY: So it works from our frontend.
                }


                let imageUrl = '';
                const srcset = imgEl?.getAttribute('srcset') || imgEl?.getAttribute('data-srcset'); // WHAT: Checks for srcset attributes. WHY: Awwwards serves many responsive sizes.
                if (srcset) { // WHAT: Parses srcset. WHY: To find a high quality image.

                    const parts = srcset.split(','); // WHAT: Splits by comma. WHY: Gets options.
                    const highRes = parts.find(p => p.includes('2x')) || parts[0]; // WHAT: Prefers the '2x' retina resolution if available. WHY: Higher quality thumbnails.
                    imageUrl = highRes?.trim().split(' ')[0] || ''; // WHAT: Extracts URL. WHY: Formats it properly.
                } else {
                    const src = imgEl?.src; // WHAT: Fallback to src. WHY: If srcset is missing.
                    if (src && !src.startsWith('data:')) { // WHAT: Avoids base64 placeholders. WHY: Clean data.
                        imageUrl = src;
                    }
                }

                return {
                    title,
                    link,
                    image: imageUrl,
                    source: 'Awwwards' // WHAT: Provenance. WHY: Identification.
                };
            }).filter(item => item.image && item.link); // WHAT: Enforces completeness. WHY: Quality.
        });

        console.log(`DEBUG: Scraped ${results.length} Awwwards items.`);
        return results.map(i => ({ ...i, id: i.link })); // WHAT: Adds unique IDs. WHY: React.

    } catch (e) {
        console.error('Awwwards Error:', e.message);
        return [];
    } finally {
        if (page && !page.isClosed()) await page.close(); // WHAT: Closes tab. WHY: Resource management.
    }
}

module.exports = { // WHAT: Exports all functions. WHY: Makes scrapers and lifecycle methods available to controllers.
    launchBrowser,
    getSharedBrowser,
    closeSharedBrowser,
    scrapeLapaNinja,
    scrapeGodly,
    scrapeSiteInspire,
    scrapeDribbble,
    scrapeAwwwards
};
