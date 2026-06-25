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
