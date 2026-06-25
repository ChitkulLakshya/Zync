const { escapeRegExp } = require('./utils/regexUtils');

const redosPayload = '(a+)+$';
const safeString = 'aaaaa';
const maliciousString = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!';

console.log('Testing escapeRegExp with ReDoS payload:', redosPayload);

const escapedPayload = escapeRegExp(redosPayload);
console.log('Escaped payload:', escapedPayload);

const regex = new RegExp(escapedPayload, 'i');

console.log('Testing regex.test()...');

const start = Date.now();
const result1 = regex.test(safeString);
const end1 = Date.now();
console.log(`Result for "${safeString}": ${result1} (took ${end1 - start}ms)`);

const start2 = Date.now();
const result2 = regex.test(maliciousString);
const end2 = Date.now();
console.log(`Result for "${maliciousString}": ${result2} (took ${end2 - start2}ms)`);

if (end2 - start2 > 100) {
    console.error('FAILED: Regex took too long to process (potential ReDoS)');
    process.exit(1);
} else if (result2 === true) {
    console.error('FAILED: Regex matched malicious string which it should not have (if escaped correctly)');
    process.exit(1);
} else {
    console.log('SUCCESS: Regex handled the payload safely and treated it as a literal string.');
}


const dotPayload = 'a.b';
const escapedDot = escapeRegExp(dotPayload);
const dotRegex = new RegExp(escapedDot);
console.log(`Testing "${dotPayload}" escaped as literal:`);
console.log(`"a.b" matches "a.b"? ${dotRegex.test('a.b')}`);
console.log(`"a.b" matches "axb"? ${dotRegex.test('axb')}`);
if (dotRegex.test('axb')) {
    console.error('FAILED: Dot was not escaped');
    process.exit(1);
}

console.log('All tests passed!');
