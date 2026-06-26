/**
 * EDUCATIONAL COMMENT: What and Why
 * What: Provides IP-to-geolocation resolution using the external GeoJS API.
 * Why: Adding location awareness (like timezone or country) helps tailor user experiences or enforce region-based logic. It uses timeout signals to fail fast, ensuring the core app remains responsive if the API is slow.
 */
const GEOJS_URL = 'https://get.geojs.io/v1/ip/geo.json';

/**
 * Resolve an IP address to location data using GeoJS.
 * Falls back gracefully on failure — location is non-essential.
 *
 * @param {string} ip - IPv4 or IPv6 address
 * @returns {Promise<{timezone: string, country: string, countryCode: string, city: string}|null>}
 */
async function resolveIp(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return null;
  }

  try {
    const res = await fetch(`${GEOJS_URL}?ip=${encodeURIComponent(ip)}`, {
      headers: { 'User-Agent': 'Zync/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || data.error) return null;

    return {
      timezone: data.timezone || null,
      country: data.country || null,
      countryCode: data.country_code || null,
      city: data.city || null,
    };
  } catch {
    return null;
  }
}

module.exports = { resolveIp };
