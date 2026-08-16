# 11 — Presence System

**NEW document** — Online/offline/away states, Socket.IO /presence namespace, lastSeen tracking, 30s grace period

---

## Feature Summary

The presence system tracks which users are online, offline, or away in real-time. It uses a Socket.IO `/presence` namespace with an in-memory `Map` of online users. On connect, the user is added to the map and their status is broadcast to all other clients. On disconnect, a 30-second grace period prevents churn from brief network blips.

---

## Architecture Diagram

```
┌─────────────────── CLIENT ───────────────────────────┐
│                                                       │
│  src/hooks/usePresence.ts                             │
│  ├─ Connects to /presence namespace                   │
│  ├─ Passes userId in handshake query                  │
│  ├─ Listens: 'initial-status' → populate online list  │
│  ├─ Listens: 'user-status-changed' → update UI        │
│  └─ Emits: 'update-status' → set away/dnd/online      │
│                                                       │
│  src/hooks/useMe.ts                                   │
│  └─ Reads user.status + user.lastSeen from /api/users │
│                                                       │
│  UI Indicators:                                       │
│  ├─ Green dot = online                                │
│  ├─ Yellow dot = away                                 │
│  ├─ Grey dot = offline + "last seen X min ago"        │
│  └─ Shown in: PeopleView, ChatView, TeamMembers       │
└──────────────────────┬────────────────────────────────┘
                       │ Socket.IO /presence
                       ▼
┌─────────────────── BACKEND ──────────────────────────┐
│                                                       │
│  backend/sockets/presenceSocketHandler.js (143 lines) │
│                                                       │
│  In-memory state: onlineUsers = Map<userId, {status,  │
│    lastSeen}>                                         │
│                                                       │
│  Events:                                              │
│  ├─ On connect:                                       │
│  │   ├─ Add to onlineUsers Map                        │
│  │   ├─ Emit 'initial-status' to connector            │
│  │   └─ Broadcast 'user-status-changed' to all others │
│  ├─ On disconnect:                                    │
│  │   ├─ Set status to 'offline' in Map                │
│  │   ├─ Broadcast 'user-status-changed'               │
│  │   └─ After 30s: delete from Map if still offline   │
│  └─ On 'update-status':                               │
│      ├─ Update Map with new status                    │
│      └─ Broadcast 'user-status-changed'               │
│                                                       │
│  Also: MongoDB User.status + User.lastSeen            │
│  └─ Updated on /api/users/sync (login)                │
│  └─ Updated on disconnect (via API call)              │
└───────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/sockets/presenceSocketHandler.js` (143 lines)

### In-Memory State (line 76)
```js
const onlineUsers = new Map();
```
- Key: `userId` (Firebase UID)
- Value: `{ status: 'online' | 'offline' | 'away', lastSeen: Date }`
- **Not persisted** — lost on server restart (clients reconnect and repopulate)

### Namespace Setup (line 79)
```js
const presenceNamespace = io.of('/presence');
```
- Isolated from `/chat`, `/notes`, `/tasks` namespaces
- Registered in `backend/index.js:148`: `require('./sockets/presenceSocketHandler')(io)`

### Connection Handler (lines 81-141)

#### On Connect (lines 81-109)
1. **Extract userId** from `socket.handshake.query` (line 82)
2. **Validate** — disconnect if no userId (lines 84-87)
3. **Join room** with userId — enables targeted events (line 89)
4. **Update Map** — `onlineUsers.set(userId, { status: 'online', lastSeen: now })` (line 93)
5. **Build initial status snapshot** — iterate all online users, exclude self (lines 96-101)
6. **Emit 'initial-status'** to connecting user only (line 102)
   - Payload: `[{ uid, status, lastSeen }, ...]`
7. **Broadcast 'user-status-changed'** to all other clients (lines 105-109)
   - Payload: `{ userId, status: 'online', lastSeen: now }`

#### On Disconnect (lines 111-128)
1. **Update Map** — set status to 'offline' with current timestamp (line 113)
2. **Broadcast 'user-status-changed'** with offline status (lines 115-119)
3. **30-second grace period** (lines 122-127):
   - `setTimeout(30000)` — wait 30 seconds
   - Check if user is still offline in Map
   - If still offline: `onlineUsers.delete(userId)` — free memory
   - If reconnected (status changed back to 'online'): keep in Map
   - **Purpose:** prevents churn from brief network blips, tab switches, etc.

#### On 'update-status' Event (lines 131-140)
1. **Update Map** with new status (`'away'`, `'dnd'`, `'online'`, etc.) (line 133)
2. **Broadcast 'user-status-changed'** to all other clients (lines 135-139)
   - Payload: `{ userId, status: newStatus, lastSeen: now }`

---

## Frontend Trace

### usePresence Hook
**File:** `src/hooks/usePresence.ts`
- Connects to `/presence` namespace via `socket.io-client`
- Passes `userId` in connection query
- Maintains local state of online users
- Exposes `onlineUsers` map and `updateStatus()` function

### UI Components Using Presence
| Component | File | Usage |
|---|---|---|
| PeopleView | `src/components/views/PeopleView.tsx` | Green/grey dots on user cards |
| ChatView | `src/components/views/ChatView.tsx` | Online indicator on chat header |
| MessagesPage | `src/components/views/MessagesPage.tsx` | Online status in conversation list |
| TeamMembers | `src/components/views/PeopleView.tsx` | Team member presence |
| DashboardHome | `src/components/views/DashboardHome.tsx` | Quick presence overview |

---

## Socket Events Reference

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `initial-status` | Server → Client (on connect) | `[{ uid, status, lastSeen }, ...]` | Snapshot of all online users |
| `user-status-changed` | Server → All (broadcast) | `{ userId, status, lastSeen }` | Notify status change |
| `update-status` | Client → Server | `string` (e.g., 'away', 'online') | User manually changes status |
| `disconnect` | Client → Server | — | User disconnected (tab close, network loss) |

---

## Database Persistence

### MongoDB User Document
| Field | Type | Updated When | Source |
|---|---|---|---|
| `status` | String | Login (`/api/users/sync`) | Set to `'online'` |
| `lastSeen` | Date | Login, activity | `new Date()` |

- MongoDB persistence is **secondary** to the in-memory Map
- MongoDB `lastSeen` is used for "last seen X ago" when user is offline and server has restarted (Map is empty)
- The in-memory Map is the real-time source of truth

---

## Edge Cases & Error Handling

| Scenario | Behavior |
|---|---|
| Server restart | All presence data lost. Clients reconnect, Map repopulates. MongoDB `lastSeen` fills gap. |
| Brief network blip (<30s) | Grace period keeps user in Map. On reconnect, status returns to 'online'. |
| Multiple tabs | Each tab creates a separate socket connection. User appears online as long as one tab is open. |
| Mobile app backgrounded | Socket disconnects → user goes offline after 30s grace period. |
| No userId in handshake | Socket immediately disconnected (line 85-87). |

---

## Cross-References

- [06-middleware-stack.md](./06-middleware-stack.md) — Socket.IO setup in index.js
- [08-firebase-auth-flow.md](./08-firebase-auth-flow.md) — User sync on login sets initial status
- [09-user-profile-management.md](./09-user-profile-management.md) — /api/users/sync updates status
- [26-instant-chat-system.md](./26-instant-chat-system.md) — Chat uses presence for online indicators
