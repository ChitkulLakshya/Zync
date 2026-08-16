# 37 — Calendar & Holidays

**NEW document** — Public holiday API, country list, in-memory caching, meeting scheduling support

---

## Feature Summary

The calendar service provides public holiday data by country/year and a cached country list. Used for meeting scheduling (avoiding holidays), session planning, and displaying holiday awareness in the UI. Uses an external holiday API with in-memory caching to reduce API calls.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  CalendarView.tsx                                       │
│  ├─ Month view with holiday markers                     │
│  ├─ GET /api/calendar/holidays?year=2024&country=US     │
│  ├─ Country selector                                    │
│  │   └─ GET /api/calendar/countries                     │
│  └─ Meeting scheduler avoids holidays                   │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  backend/routes/calendarRoutes.js                       │
│                                                         │
│  GET /holidays  → public holidays by year + country     │
│  GET /countries → available country list (cached)       │
│                                                         │
│  Caching:                                               │
│  ├─ countriesCache: in-memory { data, timestamp }       │
│  ├─ COUNTRIES_CACHE_TTL: 24 hours                       │
│  └─ Holiday API: https://date.nager.at/api/v3/          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/calendarRoutes.js`

### GET /holidays (lines 95+)
- **Auth:** required
- **Query:** `?year=2024&country=US`
- **Logic:**
  1. Parse year (default: current year)
  2. Parse country code (default: `US`)
  3. Call external API: `GET https://date.nager.at/api/v3/PublicHolidays/{year}/{country}`
  4. Return array of holidays: `{ date, localName, name, countryCode, fixed, global, type }`
- **No caching:** Holidays are static per year/country — frontend can cache

### GET /countries (lines 191+)
- **Auth:** required
- **Logic:**
  1. Check in-memory cache: `countriesCache` with 24h TTL
  2. If cache hit: return cached data
  3. If cache miss: `GET https://date.nager.at/api/v3/AvailableCountries`
  4. Store in cache: `countriesCache = { data, timestamp: Date.now() }`
  5. Return country list: `{ countryCode, name }[]`

### In-Memory Cache
```js
let countriesCache = null;
const COUNTRIES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

if (countriesCache && Date.now() - countriesCache.timestamp < COUNTRIES_CACHE_TTL) {
  return res.json(countriesCache.data);
}
```
- **Why in-memory?** Country list rarely changes, no need for Redis
- **TTL:** 24 hours — auto-refreshes daily

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | Unauthorized |
| Holiday API down | 500 | `{ error: "Failed to fetch holidays" }` |
| Invalid country code | 500 | Error from API |
| Server error | 500 | `{ error: error.message }` |

---

## Cross-References

- [30-meeting-system.md](./30-meeting-system.md) — Meeting scheduling with holiday awareness
- [04-service-inventory.md](./04-service-inventory.md) — Holiday API listing
