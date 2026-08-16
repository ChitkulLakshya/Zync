# 49 — Pagination & Utility Helpers

**NEW document** — Array pagination, HTTP pagination headers, regex escaping, normalization utilities

---

## Feature Summary

Zync uses a set of utility helpers for consistent pagination, regex safety, and data normalization across all routes. The pagination utility provides array-based pagination with HTTP headers, while regex utilities prevent regex injection from user input.

---

## Architecture Diagram

```
┌─────────────────── BACKEND UTILITIES ───────────────────┐
│                                                         │
│  backend/utils/pagination.js                            │
│  ├─ paginateArray(array, query, options) → { items,    │
│  │   pagination }                                       │
│  └─ setPaginationHeaders(res, pagination) → void        │
│                                                         │
│  backend/utils/regexUtils.js                            │
│  └─ escapeRegExp(string) → safe string                  │
│                                                         │
│  backend/utils/normalize.js                             │
│  ├─ normalizeEmail(email) → lowercase trimmed            │
│  └─ normalizeString(str) → trimmed string               │
│                                                         │
│  Consumers:                                             │
│  ├─ All list endpoints (projects, tasks, notes, chat)   │
│  ├─ Search endpoints (user search, task search)         │
│  └─ Any route with user-provided regex input             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/utils/pagination.js`

### paginateArray(array, query, options)
```js
function paginateArray(array, query, options = {}) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(
    parseInt(query.limit) || options.defaultLimit || 20,
    options.maxLimit || 100
  );
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const items = array.slice(startIndex, endIndex);
  const total = array.length;
  const totalPages = Math.ceil(total / limit);

  return {
    items,
    pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
  };
}
```
- **In-memory pagination:** Slices already-fetched array
- **Page-based:** `?page=2&limit=20`
- **Bounds:** `page` minimum 1, `limit` capped at `maxLimit`
- **Returns:** Items + pagination metadata

### setPaginationHeaders(res, pagination)
```js
function setPaginationHeaders(res, pagination) {
  res.setHeader('X-Page', pagination.page);
  res.setHeader('X-Page-Size', pagination.limit);
  res.setHeader('X-Total-Count', pagination.total);
  res.setHeader('X-Total-Pages', pagination.totalPages);
  if (pagination.hasNext) res.setHeader('X-Next-Page', pagination.page + 1);
  if (pagination.hasPrev) res.setHeader('X-Prev-Page', pagination.page - 1);
}
```
- **Standard headers:** Frontend reads these for pagination UI
- **Conditional:** Next/prev headers only set when applicable

### Usage Example
```js
const { paginateArray, setPaginationHeaders } = require('../utils/pagination');

router.get('/conversations', verifyToken, async (req, res) => {
  const conversations = await Message.aggregate([...]);
  const { items, pagination } = paginateArray(conversations, req.query, {
    defaultLimit: 100,
    maxLimit: 200,
  });
  setPaginationHeaders(res, pagination);
  res.json(items);
});
```

---

### File: `backend/utils/regexUtils.js`

### escapeRegExp(string)
```js
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```
- Escapes all special regex characters: `. * + ? ^ $ { } ( ) | [ ] \`
- Example: `John.*Doe` → `John\.\*Doe`
- **Security:** Prevents regex injection where user input could match unintended patterns or cause ReDoS

### Usage Example
```js
const { escapeRegExp } = require('../utils/regexUtils');

router.get('/search', verifyToken, async (req, res) => {
  const safeQuery = escapeRegExp(req.query.query);
  const users = await User.find({
    displayName: { $regex: safeQuery, $options: 'i' }
  });
  res.json(users);
});
```

---

### File: `backend/utils/normalize.js`

### normalizeEmail(email)
```js
const normalizeEmail = (email) => email?.trim().toLowerCase();
```
- Trims whitespace and lowercases
- Prevents duplicate accounts from case differences

### normalizeString(str)
```js
const normalizeString = (str) => str?.trim();
```
- Trims whitespace from user input
- Used for names, titles, descriptions

---

## Pagination Headers Reference

| Header | Description |
|---|---|
| `X-Page` | Current page number |
| `X-Page-Size` | Items per page |
| `X-Total-Count` | Total items across all pages |
| `X-Total-Pages` | Total number of pages |
| `X-Next-Page` | Next page number (if exists) |
| `X-Prev-Page` | Previous page number (if exists) |

---

## Endpoints Using Pagination

| Endpoint | Default Limit | Max Limit |
|---|---|---|
| GET /api/chat/conversations | 100 | 200 |
| GET /api/chat/history/:chatId | 50 | 200 |
| GET /api/notes | 50 | 100 |
| GET /api/projects | 20 | 100 |
| GET /api/users/search | 20 | 50 |
| GET /api/sessions/:userId | 50 | 100 |
| GET /api/teams/:teamId/activity | 50 | 100 |

---

## Cross-References

- [23-instant-chat-system.md](./23-instant-chat-system.md) — Chat conversations pagination
- [39-user-search-and-discovery.md](./39-user-search-and-discovery.md) — User search with escapeRegExp
- [17-notes-system.md](./17-notes-system.md) — Notes list pagination
- [14-project-crud.md](./14-project-crud.md) — Project list pagination
