// const { describe, it } = require("node:test");
// const assert = require("node:assert");
const { escapeRegExp } = require('../utils/regexUtils');

describe('escapeRegExp', () => {
  it('should escape special characters', () => {
    const input = 'a(b)c*d+e?f.g^h$i|j[k]l{m}n';
    const expected = 'a\\(b\\)c\\*d\\+e\\?f\\.g\\^h\\$i\\|j\\[k\\]l\\{m\\}n';
    expect(escapeRegExp(input)).toBe(expected);
  });

  it('should not escape alphanumeric characters', () => {
    const input = 'abcdefghijklmnopqrstuvwxyz1234567890';
    expect(escapeRegExp(input)).toBe(input);
  });

  it('should handle empty string', () => {
    const input = '';
    expect(escapeRegExp(input)).toBe('');
  });
});
