/**
 * @fileoverview generate-inspiration.js
 * @module generate-inspiration
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
const fs = require('fs');
const path = require('path');
const {
    launchBrowser,
    scrapeLapaNinja,
    scrapeGodly,
    scrapeSiteInspire,
    scrapeDribbble,
    scrapeAwwwards
} = require('../services/scraperService');


const CATEGORIES = [

    'web design',
    'landing page',
    'portfolio',
    'saas',
    'dashboard',
    'ecommerce',
    'mobile app',
    'corporate',
    'startup',
    'agency',


    'login page',
    'signup page',
    'pricing page',
    'blog',
    '404 page',
    'contact page',
    'about page',
    'newsletter',
    'footer',


    'minimal',
    'typography',
    'dark mode',
    'colorful',
    'retro',
    'animation',
    'brutalist',


    'fintech',
    'crypto',
    'fashion',
    'food',
    'travel',
    'education',
    'real estate',
    'health',
    'ai'
];

const OUTPUT_FILE = path.join(__dirname, '../data/inspiration.json');

async function generateCache() {
    console.log('🚀 Starting Inspiration Cache Generation...');
    console.log(`📋 Categories: ${CATEGORIES.join(', ')}`);

    let browser = null;
    let allItems = [];
    const seenIds = new Set();

    try {
        browser = await launchBrowser();

        for (const category of CATEGORIES) {
            console.log(`\n🔍 Scraping Category: "${category}"`);


            const results = await Promise.allSettled([
                scrapeLapaNinja(browser, category),
                scrapeGodly(browser, category),
                scrapeSiteInspire(browser, category),
                scrapeDribbble(browser, category),
                scrapeAwwwards(browser, category)
            ]);


            const batchedItems = [];
            results.forEach((res, index) => {
                const sourceName = ['Lapa', 'Godly', 'SiteInspire', 'Dribbble', 'Awwwards'][index];
                if (res.status === 'fulfilled') {
                    console.log(`   ✅ ${sourceName}: ${res.value.length} items`);
                    batchedItems.push(...res.value);
                } else {
                    console.error(`   ❌ ${sourceName} Failed: ${res.reason?.message}`);
                }
            });


            let newCount = 0;
            for (const item of batchedItems) {

                const id = item.link || item.image;
                if (!seenIds.has(id)) {
                    seenIds.add(id);

                    item.tags = [category];


                    allItems.push(item);
                    newCount++;
                } else {


                    const existing = allItems.find(i => (i.link || i.image) === id);
                    if (existing && existing.tags) {
                        if (!existing.tags.includes(category)) existing.tags.push(category);
                    }
                }
            }
            console.log(`   ✨ Added ${newCount} unique items.`);


            await new Promise(r => setTimeout(r, 1000));
        }


        console.log('\n🔀 Shuffling results...');
        for (let i = allItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
        }


        const dir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }


        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allItems, null, 2));
        console.log(`\n✅ SUCCESS! Cache saved to ${OUTPUT_FILE}`);
        console.log(`📊 Total Unique Items: ${allItems.length}`);

    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error);
    } finally {
        if (browser) await browser.close();
    }
}

generateCache();
