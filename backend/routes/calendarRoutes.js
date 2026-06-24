const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');

// In-memory cache: key = `${year}-${countryCode}`, value = { timestamp, data }
const holidayCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

router.get('/holidays', verifyToken, async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const countryCode = (req.query.countryCode || 'US').toUpperCase();

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return res
      .status(400)
      .json({
        message:
          'Invalid countryCode. Use ISO 3166-1 alpha-2 (e.g. US, IN, GB).',
      });
  }

  if (year < 1900 || year > 2100) {
    return res
      .status(400)
      .json({ message: 'Year must be between 1900 and 2100.' });
  }

  const cacheKey = `${year}-${countryCode}`;
  const cached = holidayCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  try {
    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`;
    const response = await fetch(url);

    if (response.status === 404) {
      return res
        .status(404)
        .json({
          message: `No holidays found for country code "${countryCode}".`,
        });
    }

    if (!response.ok) {
      return res
        .status(502)
        .json({ message: 'Failed to fetch holidays from Nager.Date API.' });
    }

    const data = await response.json();

    const holidays = data.map((h) => ({
      date: h.date,
      localName: h.localName,
      name: h.name,
      countryCode: h.countryCode,
      fixed: h.fixed,
      global: h.global,
      types: h.types || [],
    }));

    holidayCache.set(cacheKey, { timestamp: Date.now(), data: holidays });

    res.json(holidays);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ message: 'Server error fetching holidays.' });
  }
});

// Available countries from Nager.Date (cached for 7 days)
let countriesCache = null;
const COUNTRIES_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

router.get('/countries', verifyToken, async (_req, res) => {
  if (
    countriesCache &&
    Date.now() - countriesCache.timestamp < COUNTRIES_CACHE_TTL
  ) {
    return res.json(countriesCache.data);
  }

  try {
    const response = await fetch(
      'https://date.nager.at/api/v3/AvailableCountries'
    );

    if (!response.ok) {
      return res
        .status(502)
        .json({ message: 'Failed to fetch countries from Nager.Date API.' });
    }

    const data = await response.json();

    countriesCache = { timestamp: Date.now(), data };

    res.json(data);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ message: 'Server error fetching countries.' });
  }
});

module.exports = router;
