# 23 — Instant Chat System

**NEW document** — Chat REST API, message history, conversations list, unread count, cursor pagination

---

## Feature Summary

The chat system provides 1-on-1 real-time messaging between Zync users. Messages are stored in MongoDB (Message model) and delivered via Socket.IO `/chat` namespace. The REST API handles history retrieval (cursor-based pagination), conversation list, and unread count. Real-time delivery, typing indicators, read receipts, and chat clearing are handled via sockets.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  MessagesPage.tsx                                       │
│  ├─ Conversation list (left sidebar)                    │
│  │   └─ GET /api/chat/conversations                     │
│  ├─ Chat window (right panel)                           │
│  │   ├─ Message list (scrollable, auto-load more)       │
│  │   │   └─ GET /api/chat/history/:chatId?cursor=...    │
│  │   ├─ Message input (text + file attach)              │
│  │   │   └─ Socket: send-message event                  │
│  │   ├─ Typing indicator ("User is typing...")          │
│  │   │   └─ Socket: typing event                        │
│  │   └─ Read receipts (double blue ticks)               │
│  │       └─ Socket: mark-seen event                     │
│  └─ Unread badge in navbar                              │
│      └─ GET /api/chat/unread-count                      │
│                                                         │
│  Hooks:                                                 │
│  ├─ useConversations.ts — TanStack Query                │
│  ├─ useChatHistory.ts — infinite query with cursor      │
│  ├─ useChatSocket.ts — Socket.IO /chat connection       │
│  └─ useUnreadCount.ts — TanStack Query                  │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND REST ────────────────────────┐
│                                                         │
│  backend/routes/chatRoutes.js (177 lines)               │
│                                                         │
│  GET /history/:chatId   → paginated message history     │
│  GET /conversations     → latest message per chat       │
│  GET /unread-count      → total unread messages         │
│                                                         │
│  Middleware: verifyToken + requireDb                    │
│  (requireDb: 503 if MongoDB disconnected)               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/chatRoutes.js` (177 lines)

### requireDb Middleware (lines 84-88)
```js
const requireDb = (req, res, next) => {
  if (mongoose.connection.readyState !== 1)
    return res.status(503).json({ error: 'Database not available' });
  next();
};
```
- Returns 503 if MongoDB is disconnected
- Prevents crashes from DB queries during connection drops

### GET /history/:chatId (lines 94-123)
- **Auth:** verifyToken + requireDb
- **Query params:** `?cursor=<messageId>&limit=50` (max 200)
- **Logic:**
  1. Extract `chatId` from URL params
  2. Split `chatId` by `_` to get participant UIDs
  3. **Access control:** `parts.includes(req.user.uid)` — user must be in chat
  4. Build filter: `{ chatId }` + `{ _id: { $gt: ObjectId(cursor) } }` if cursor
  5. `Message.find(filter).sort({ createdAt: 1 }).limit(limit).lean()`
  6. Map `_id` to `id` for client consistency
- **Response:** Array of messages (chronological order)
- **Pagination:** Cursor-based (not page-based) — client passes last message ID as cursor

### GET /conversations (lines 129-159)
- **Auth:** verifyToken + requireDb
- **Logic:**
  1. MongoDB aggregation pipeline:
     - `$match`: `{ $or: [{ senderId: uid }, { receiverId: uid }] }`
     - `$sort`: `{ createdAt: -1 }` — newest first
     - `$group`: `{ _id: '$chatId', doc: { $first: '$$ROOT' } }` — latest message per chat
     - `$replaceRoot`: `{ newRoot: '$doc' }` — promote message to top level
     - `$sort`: `{ createdAt: -1 }` — sort conversations by latest activity
  2. Normalize: map `_id` to `id`
  3. Paginate: `paginateArray(normalized, req.query, { defaultLimit: 100, maxLimit: 200 })`
  4. Set pagination headers
- **Response:** Array of latest messages (one per conversation)

### GET /unread-count (lines 165-174)
- **Auth:** verifyToken + requireDb
- **Logic:**
  ```js
  const count = await Message.countDocuments({
    receiverId: req.user.uid,
    seen: false,
  });
  ```
- **Response:** `{ count: number }`

---

## Chat ID Convention

Chat IDs are formed by sorting two user UIDs and joining with `_`:
```
chatId = [uidA, uidB].sort().join('_')
```
Example: `uid123_uid456`

This ensures:
- Same chat ID regardless of who sends
- Unique per user pair
- Easy to split for access control: `chatId.split('_')`

---

## Database Layer

### Message Model
**File:** `backend/models/Message.js`

| Field | Type | Required | Index | Notes |
|---|---|---|---|---|
| `chatId` | String | yes | yes | Format: `uidA_uidB` (sorted) |
| `senderId` | String | yes | yes | Firebase UID |
| `receiverId` | String | yes | yes | Firebase UID |
| `text` | String | no | — | Message content (null if file-only) |
| `type` | String | no | — | `text`, `image`, `file` (default: `text`) |
| `fileUrl` | String | no | — | Cloudinary URL for attachments |
| `fileName` | String | no | — | Original filename |
| `fileSize` | Number | no | — | File size in bytes |
| `senderName` | String | no | — | Display name at send time |
| `senderPhotoURL` | String | no | — | Avatar at send time |
| `projectId` | ObjectId | no | — | If chat is project-scoped |
| `projectName` | String | no | — | Project name context |
| `projectOwnerId` | String | no | — | Project owner UID |
| `delivered` | Boolean | no | — | Default: false |
| `deliveredAt` | Date | no | — | When receiver connected |
| `seen` | Boolean | no | — | Default: false |
| `seenAt` | Date | no | — | When receiver opened chat |
| `createdAt` | Date | auto | — | |

**Indexes:**
- `{ chatId: 1, createdAt: 1 }` — history query
- `{ receiverId: 1, seen: 1 }` — unread count
- `{ receiverId: 1, delivered: 1 }` — delivery catch-up
- `{ senderId: 1 }` — sender queries

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | Unauthorized |
| DB disconnected | 503 | `{ error: "Database not available" }` |
| User not in chat | 403 | `{ error: "Unauthorized" }` |
| Server error | 500 | `{ error: error.message }` |

---

## Cross-References

- [24-chat-socket-handler.md](./24-chat-socket-handler.md) — Socket.IO /chat namespace deep dive
- [11-presence-system.md](./11-presence-system.md) — Online status for chat UI
- [05-database-schema-and-models.md](./05-database-schema-and-models.md) — Message model
- [48-cloudinary-upload-service.md](./48-cloudinary-upload-service.md) — File attachments
