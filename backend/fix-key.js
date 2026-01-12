require('dotenv').config();
const fs = require('fs');

const key = process.env.GITHUB_PRIVATE_KEY;
const lines = key.split('\n').filter(line => line.trim() !== '');
const fixedKey = lines.join('\n');

console.log('--- Original key ---');
console.log('Lines:', key.split('\n').length);
console.log('Empty lines:', key.split('\n').filter(l => l.trim() === '').length);

console.log('\n--- Fixed key ---');
console.log('Lines:', fixedKey.split('\n').length);
console.log('Empty lines:', fixedKey.split('\n').filter(l => l.trim() === '').length);

// Write the fixed key to a file
const envLine = `GITHUB_PRIVATE_KEY="${fixedKey}"`;
fs.writeFileSync('fixed_github_key.txt', envLine);

console.log('\n✅ Fixed key written to: fixed_github_key.txt');
console.log('\nReplace your GITHUB_PRIVATE_KEY in .env with the contents of that file.');
