const crypto = require('crypto');
const axios = require('axios');

const PWNED_PASSWORDS_BASE = 'https://api.pwnedpasswords.com/range/';

/**
 * Check if a password has appeared in known data breaches.
 * Uses the free Pwned Passwords API with k-anonymity:
 * only the first 5 characters of the SHA-1 hash are sent.
 *
 * @param {string} password - Plain text password to check
 * @returns {Promise<{ isCompromised: boolean, count: number }>}
 */
const checkPassword = async (password) => {
  const sha1 = crypto
    .createHash('sha1')
    .update(password)
    .digest('hex')
    .toUpperCase();
  const prefix = sha1.substring(0, 5);
  const suffix = sha1.substring(5);

  try {
    const response = await axios.get(`${PWNED_PASSWORDS_BASE}${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      timeout: 5000,
    });

    const lines = response.data.split('\n');
    for (const line of lines) {
      const [hashSuffix, count] = line.trim().split(':');
      if (hashSuffix === suffix) {
        return { isCompromised: true, count: parseInt(count, 10) };
      }
    }

    return { isCompromised: false, count: 0 };
  } catch (error) {
    console.error('HIBP password check failed:', error.message);

    return { isCompromised: false, count: 0 };
  }
};

module.exports = { checkPassword };
