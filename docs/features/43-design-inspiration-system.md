# 43 — Design Inspiration System

**NEW document** — Inspiration search, Dribbble scraping, live web scraping, design reference aggregation

---

## Feature Summary

The design inspiration system allows users to search for design references from multiple sources. The backend aggregates results from Dribbble and live web scraping, providing designers with visual inspiration for their projects.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  InspirationView.tsx                                    │
│  ├─ Search bar (query input)                            │
│  ├─ Source tabs: All | Dribbble | Web                   │
│  ├─ Results grid (image cards)                          │
│  │   └─ GET /api/inspiration?query=...                  │
│  ├─ Dribbble tab                                        │
│  │   └─ GET /api/inspiration/dribbble?query=...         │
│  └─ Live scrape tab                                     │
│      └─ GET /api/inspiration/scrape?query=...           │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  backend/routes/inspirationRoutes.js                    │
│  ├─ GET /          → getInspiration (aggregated)        │
│  ├─ GET /dribbble  → getDribbbleInspiration             │
│  └─ GET /scrape    → getLiveScrape                      │
│                                                         │
│  backend/routes/designRoutes.js                         │
│  └─ GET /search    → getInspiration (alias)             │
│                                                         │
│  backend/controllers/inspirationController.js           │
│  ├─ getInspiration(req, res)                            │
│  │   ├─ Parse query param                               │
│  │   ├─ Aggregate from multiple sources                 │
│  │   └─ Return unified results                          │
│  ├─ getDribbbleInspiration(req, res)                    │
│  │   ├─ Scrape Dribbble search results                  │
│  │   ├─ Parse HTML for image URLs + titles              │
│  │   └─ Return structured results                       │
│  └─ getLiveScrape(req, res)                             │
│      ├─ General web search for design images            │
│      ├─ Parse search engine results                     │
│      └─ Return image URLs + metadata                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/inspirationRoutes.js`

### GET / (line 86)
- **Auth:** not specified (likely public or auth-required)
- **Query:** `?query=<search term>`
- **Handler:** `getInspiration` from `inspirationController.js`
- **Returns:** Aggregated inspiration results from multiple sources

### GET /dribbble (line 88)
- **Query:** `?query=<search term>`
- **Handler:** `getDribbbleInspiration`
- **Returns:** Dribbble-specific design results

### GET /scrape (line 84)
- **Query:** `?query=<search term>`
- **Handler:** `getLiveScrape`
- **Returns:** Live web-scraped design images

### File: `backend/routes/designRoutes.js`
### GET /search (line 84)
- Alias for `getInspiration` — same handler
- Mounted at `/api/design/search`

---

## Controller Logic

### File: `backend/controllers/inspirationController.js`

### getInspiration
1. Parse `query` from `req.query`
2. If no query: return empty array
3. Aggregate from sources:
   - Dribbble results
   - Web scrape results
4. Return unified array: `[{ title, imageUrl, source, sourceUrl }]`

### getDribbbleInspiration
1. Build Dribbble search URL: `https://dribbble.com/search/{query}`
2. Fetch HTML with axios
3. Parse with cheerio:
   - Extract shot images: `.shot-thumbnail img`
   - Extract titles: `.shot-title`
   - Extract author: `.shot-by-user`
4. Return structured results

### getLiveScrape
1. Build search engine query for design images
2. Fetch results page HTML
3. Parse for image URLs and metadata
4. Return results

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No query provided | 200 | Empty array |
| External site down | 200 | Partial results (best-effort) |
| Scraping fails | 200 | Empty array (graceful) |
| Server error | 500 | `{ error: error.message }` |

---

## Cross-References

- [04-service-inventory.md](./04-service-inventory.md) — Inspiration controller listing
- [14-project-crud.md](./14-project-crud.md) — Projects can reference inspiration
