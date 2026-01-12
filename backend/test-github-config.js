require('dotenv').config();
const { App } = require('octokit');

const appId = process.env.GITHUB_APP_ID;
// Replicate the logic from the route
const privateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n');

console.log('--- Config Check ---');
console.log('GITHUB_APP_ID:', appId ? 'Found' : 'Missing');
console.log('GITHUB_PRIVATE_KEY Length:', privateKey ? privateKey.length : 'Missing');

if (privateKey) {
    const lines = privateKey.split('\n');
    console.log('Key Stats: Lines =', lines.length);
    // Do not print the whole key, just structure
    console.log('Starts with BEGIN:', lines[0].includes('BEGIN'));
    console.log('Ends with END:', lines[lines.length - 1].includes('END') || (lines[lines.length - 1].length === 0 && lines[lines.length - 2].includes('END')));
}

if (!appId || !privateKey) {
    console.error('ERROR: Missing configuration');
    process.exit(1);
}

try {
    const app = new App({
        appId,
        privateKey,
    });
    console.log('App initialized successfully.');
} catch (e) {
    console.error('Error initializing App:', e.message);
}
