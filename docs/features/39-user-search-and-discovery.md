# 39 — User Search & Discovery

**NEW document** — Regex search, pagination, text index, chat request flow, user discovery for team invites

---

## Feature Summary

User search enables finding other Zync users by name or email for team invites, chat requests, and collaborator discovery. Uses MongoDB text index with regex fallback, pagination via utility functions, and escapeRegExp for safe pattern matching.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  UserSearch component (reusable)                        │
│  ├─ Debounced input (300ms)                             │
│  ├─ GET /api/users/search?query=...&page=1              │
│  ├─ Results: avatar, name, email                        │
│  ├─ "Send Chat Request" button                          │
│  │   └─ POST /api/users/chat-request                    │
│  └─ "Invite to Team" button                             │
│      └─ POST /api/teams/invite                          │
│                                                         │
│  Used in:                                               │
│  ├─ TeamsView.tsx → invite members                      │
│  ├─ MessagesPage.tsx → start new chat                   │
│  └─ ShareFolderDialog.tsx → share with user             │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  userRoutes.js → GET /search                            │
│                                                         │
│  1. Escape regex: escapeRegExp(query)                   │
│  2. Build filter:                                       │
│     { $or: [                                            │
│       { displayName: { $regex: query, $options: 'i' } },│
│       { email: { $regex: query, $options: 'i' } }       │
│     ]}                                                  │
│  3. Exclude self: { uid: { $ne: req.user.uid } }        │
│  4. Project: uid, displayName, email, photoURL          │
│  5. Paginate: paginateArray()                           │
│  6. Set pagination headers                              │
│  7. Return results                                      │
│                                                         │
│  Chat Request:                                          │
│  POST /chat-request                                     │
│  ├─ Store request in DB                                 │
│  ├─ Send email notification                             │
│  └─ Return { message: "Request sent" }                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/userRoutes.js`

### GET /search
- **Auth:** required
- **Query:** `?query=<term>&page=1&limit=20`
- **Logic:**
  1. **Escape regex:** `const safeQuery = escapeRegExp(query)` — prevents regex injection
  2. **Build filter:**
     ```js
     const filter = {
       uid: { $ne: req.user.uid }, // Exclude self
       $or: [
         { displayName: { $regex: safeQuery, $options: 'i' } },
         { email: { $regex: safeQuery, $options: 'i' } }
       ]
     };
     ```
  3. **Execute query:** `User.find(filter).select('uid displayName email photoURL').lean()`
  4. **Paginate:** `paginateArray(results, req.query, { defaultLimit: 20, maxLimit: 50 })`
  5. **Set headers:** `setPaginationHeaders(res, pagination)`
  6. **Return:** Paginated user array

### escapeRegExp Utility
**File:** `backend/utils/regexUtils.js`
```js
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```
- Escapes special regex characters in user input
- Prevents regex injection attacks
- Example: `John.*` → `John\.\*`

### POST /chat-request
- **Auth:** required
- **Input:** `{ receiverUid, message? }`
- **Logic:**
  1. Verify receiver exists
  2. Check if request already sent (prevent duplicates)
  3. Store chat request in DB (or on User model)
  4. Send email notification: `sendZyncEmail(receiverEmail, 'New Chat Request', html)`
  5. Return `{ message: "Request sent" }`
- **Used by:** UserSearch "Send Chat Request" button

---

## Database Layer

### User Model — Text Index
**File:** `backend/models/User.js`
```js
UserSchema.index({
  displayName: 'text',
  email: 'text'
});
```
- MongoDB text index for efficient search
- Regex search used as fallback for partial matches
- Text index supports full-text search, regex supports partial/suffix

### Search Fields
| Field | Searchable | Notes |
|---|---|---|
| `displayName` | Yes (regex + text) | User's display name |
| `email` | Yes (regex) | User's email |
| `uid` | No | Excluded from search, used for exclusion |
| `photoURL` | No | Returned in results only |

---

## Pagination

Uses `backend/utils/pagination.js`:
```js
const { paginateArray, setPaginationHeaders } = require('../utils/pagination');

const { items, pagination } = paginateArray(results, req.query, {
  defaultLimit: 20,
  maxLimit: 50,
});
setPaginationHeaders(res, pagination);
res.json(items);
```

**Pagination headers:**
- `X-Total-Count`: Total items
- `X-Page`: Current page
- `X-Page-Size`: Items per page
- `X-Total-Pages`: Total pages

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | Unauthorized |
| Empty query | 200 | Empty array (no error) |
| Chat request to self | 400 | `{ error: "Cannot send request to yourself" }` |
| Duplicate chat request | 400 | `{ error: "Request already sent" }` |
| Receiver not found | 404 | `{ error: "User not found" }` |
| Server error | 500 | `{ error: error.message }` |

---

## Cross-References

- [09-user-profile-management.md](./09-user-profile-management.md) — User profile endpoints
- [31-team-crud-and-invites.md](./31-team-crud-and-invites.md) — Team invite uses user search
- [18-folders-and-organization.md](./18-folders-and-organization.md) — Folder sharing uses user search
- [23-instant-chat-system.md](./23-instant-chat-system.md) — Chat request initiates chat
- [28-email-service-notifications.md](./28-email-service-notifications.md) — Chat request email
