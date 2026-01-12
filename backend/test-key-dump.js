require('dotenv').config();

const key = process.env.GITHUB_PRIVATE_KEY;
const lines = key.split('\n');

console.log('Total lines:', lines.length);
console.log('\n--- First 5 lines ---');
lines.slice(0, 5).forEach((line, i) => console.log(`${i + 1}: "${line}"`));

console.log('\n--- Last 5 lines ---');
lines.slice(-5).forEach((line, i) => console.log(`${lines.length - 5 + i + 1}: "${line}"`));

// Check for BEGIN/END markers
const beginCount = (key.match(/BEGIN/g) || []).length;
const endCount = (key.match(/END/g) || []).length;
console.log('\n--- Markers ---');
console.log('BEGIN count:', beginCount);
console.log('END count:', endCount);

// Check for empty lines or weird characters
const emptyLines = lines.filter(l => l.trim() === '').length;
console.log('Empty lines:', emptyLines);

// Check if it's PKCS#1 or PKCS#8
if (key.includes('BEGIN RSA PRIVATE KEY')) {
    console.log('Format: PKCS#1 (RSA PRIVATE KEY)');
} else if (key.includes('BEGIN PRIVATE KEY')) {
    console.log('Format: PKCS#8 (PRIVATE KEY)');
}
