# 19 — Real-Time Notes Collaboration

**NEW document** — Yjs CRDT sync, cursor tracking, presence avatars, awareness updates, stale user cleanup

---

## Feature Summary

Real-time collaborative note editing uses Yjs (CRDT-based) over Socket.IO. Multiple users can edit the same note simultaneously with live cursor positions, presence avatars, and conflict-free text merging. The `/notes` namespace handles join/leave, cursor movement, document updates, and Yjs awareness state.

---

## Architecture Diagram

```
┌─────────────────── CLIENT ─────────────────────────────┐
│                                                         │
│  NoteEditor.tsx                                         │
│  ├─ Yjs document (Y.Doc)                                │
│  ├─ y-websocket provider → Socket.IO /notes             │
│  ├─ TipTap/ProseMirror editor bound to Yjs              │
│  ├─ CollaborationCursor extension (colored cursors)     │
│  └─ Presence avatars bar (top of editor)                │
│                                                         │
│  Events emitted:                                        │
│  ├─ join_note { noteId, userId, userName, userAvatar,   │
│  │              userColor }                             │
│  ├─ cursor_move { noteId, userId, blockId }             │
│  ├─ note-update { noteId, update: Uint8Array }          │
│  ├─ awareness-update { noteId, update: Uint8Array }     │
│  └─ leave_note { noteId, userId }                       │
│                                                         │
│  Events received:                                       │
│  ├─ presence_update → [user objects]                    │
│  ├─ cursor_update { userId, blockId }                   │
│  ├─ note-update → apply Yjs update                      │
│  ├─ awareness-update → apply Yjs awareness              │
│  └─ user_left (userId)                                  │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │ Socket.IO /notes
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  backend/sockets/noteSocketHandler.js (300 lines)       │
│                                                         │
│  In-memory state: notePresence = Map<noteId,            │
│    Map<userId, { id, name, avatarUrl, color, blockId,   │
│    lastActive }>>                                       │
│                                                         │
│  Events handled:                                        │
│  ├─ join_note → add user, broadcast presence            │
│  ├─ join-note (legacy) → join room, emit yjs sync       │
│  ├─ presence-join → alternate join event                │
│  ├─ cursor_move → update blockId, broadcast             │
│  ├─ presence-cursor → alternate cursor event            │
│  ├─ note-update → forward to other clients in room      │
│  ├─ awareness-update → forward Yjs awareness            │
│  ├─ leave_note → remove user, broadcast, cleanup        │
│  ├─ leave-note (legacy) → leave room                    │
│  ├─ presence-leave → alternate leave event              │
│  └─ disconnect → remove user, broadcast, cleanup        │
│                                                         │
│  Stale user cleanup:                                    │
│  └─ setInterval(30s) → remove users inactive >2 min     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/sockets/noteSocketHandler.js` (300 lines)

### In-Memory State (line 82)
```js
const notePresence = new Map();
```
- **Key:** `noteId` (MongoDB ObjectId as string)
- **Value:** `Map<userId, { id, name, avatarUrl, color, blockId, lastActive }>`
- **Lifecycle:** Created on first join, deleted when empty

### broadcastPresence Helper (lines 85-97)
```js
const broadcastPresence = (noteId) => {
  if (!notePresence.has(noteId)) return;
  const users = notePresence.get(noteId);
  const userList = Array.from(users.values());
  notesNamespace.to(noteId).emit('presence_update', userList);
};
```
- Converts Map to array for JSON serialization
- Emits to all sockets in the note's room

### Connection Handler (lines 99-265)

#### join_note Event (lines 103-133)
- **Payload:** `{ noteId, userId, userName, userAvatar, userColor }`
- **Logic:**
  1. `socket.join(noteId)` — join Socket.IO room
  2. Store `noteId` and `userId` on socket for disconnect cleanup
  3. Initialize `notePresence` Map for noteId if needed
  4. Add user: `{ id, name, avatarUrl, color, blockId: null, lastActive: Date.now() }`
  5. `broadcastPresence(noteId)` — notify all users

#### join-note Event (lines 136-140) — Legacy
- **Payload:** `noteId` (string, not object)
- **Logic:** Join room + emit `user-joined-yjs` to trigger Yjs sync
- **Purpose:** Compatibility with older y-websocket clients

#### presence-join Event (lines 142-160) — Alternate
- **Payload:** `{ noteId, odId, displayName, photoURL, color }`
- Same as `join_note` but with different field names
- **Purpose:** Different client integration (e.g., mobile app)

#### cursor_move Event (lines 163-189)
- **Payload:** `{ noteId, userId, blockId }`
- **Logic:**
  1. Find user in `notePresence` map
  2. Update `user.blockId = blockId`
  3. Update `user.lastActive = Date.now()`
  4. `broadcastPresence(noteId)` — full presence update
  5. `notesNamespace.to(noteId).emit('cursor_update', { userId, blockId })` — targeted cursor event

#### presence-cursor Event (lines 192-202) — Alternate
- Same as `cursor_move` with different field names

#### leave_note Event (lines 205-220)
- **Payload:** `{ noteId, userId }`
- **Logic:**
  1. `socket.leave(noteId)` — leave Socket.IO room
  2. Remove user from `notePresence` map
  3. `broadcastPresence(noteId)` — update UI
  4. `notesNamespace.to(noteId).emit('user_left', userId)` — explicit event
  5. If map empty: `notePresence.delete(noteId)` — free memory

#### leave-note Event (lines 223-225) — Legacy
- Just `socket.leave(noteId)`

#### presence-leave Event (lines 227-234) — Alternate
- Remove user + broadcast + emit `user_left`

#### note-update Event (lines 237-239)
- **Payload:** `{ noteId, update }` — Yjs binary update (Uint8Array)
- **Logic:** `socket.to(noteId).emit('note-update', update)` — forward to all other clients
- **No persistence:** Server is a dumb relay for Yjs updates

#### awareness-update Event (lines 241-243)
- **Payload:** `{ noteId, update }` — Yjs awareness state (selections, cursor info)
- **Logic:** `socket.to(noteId).emit('awareness-update', update)` — forward to others

#### disconnect Event (lines 246-264)
- **Logic:**
  1. Get `noteId` and `odId` from socket properties
  2. Remove user from `notePresence` map
  3. `broadcastPresence(noteId)` — update UI
  4. `notesNamespace.to(noteId).emit('user_left', odId)` — explicit event
  5. If map empty: delete from `notePresence`

### Stale User Cleanup (lines 268-298)
```js
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const staleThreshold = 120000; // 2 minutes

  for (const [noteId, users] of notePresence.entries()) {
    let hasStaleUsers = false;

    for (const [odId, user] of users.entries()) {
      if (now - user.lastActive > staleThreshold) {
        users.delete(odId);
        hasStaleUsers = true;
      }
    }

    if (hasStaleUsers) broadcastPresence(noteId);
    if (users.size === 0) notePresence.delete(noteId);
  }
}, 30000); // Every 30 seconds

cleanupInterval.unref(); // Don't keep Node process alive for this
```
- **Stale threshold:** 2 minutes of inactivity
- **Check interval:** 30 seconds
- **unref():** Prevents the interval from blocking process exit

---

## Socket Events Reference

### Client → Server

| Event | Payload | Purpose |
|---|---|---|
| `join_note` | `{ noteId, userId, userName, userAvatar, userColor }` | Join note for collaboration |
| `join-note` | `noteId` (string) | Legacy Yjs join |
| `presence-join` | `{ noteId, odId, displayName, photoURL, color }` | Alternate join |
| `cursor_move` | `{ noteId, userId, blockId }` | Update cursor position |
| `presence-cursor` | `{ noteId, odId, blockId }` | Alternate cursor update |
| `note-update` | `{ noteId, update: Uint8Array }` | Yjs document update |
| `awareness-update` | `{ noteId, update: Uint8Array }` | Yjs awareness state |
| `leave_note` | `{ noteId, userId }` | Leave note collaboration |
| `leave-note` | `noteId` (string) | Legacy leave |
| `presence-leave` | `{ noteId, odId }` | Alternate leave |

### Server → Client

| Event | Payload | Purpose |
|---|---|---|
| `presence_update` | `[{ id, name, avatarUrl, color, blockId, lastActive }]` | Full presence list |
| `cursor_update` | `{ userId, blockId }` | Targeted cursor update |
| `note-update` | `Uint8Array` | Yjs document update (forwarded) |
| `awareness-update` | `Uint8Array` | Yjs awareness (forwarded) |
| `user_left` | `userId` (string) | User disconnected/left |
| `user-joined-yjs` | — | Trigger Yjs sync (legacy) |

---

## Yjs CRDT Sync Model

```
Client A edits → Y.Doc update → Uint8Array
  → socket.emit('note-update', { noteId, update })
  → Server forwards to all other clients in room
  → Client B receives → Y.applyUpdate(yDoc, update)
  → ProseMirror re-renders

Conflict resolution: CRDT (Conflict-free Replicated Data Type)
  → Yjs automatically merges concurrent edits
  → No operational transform needed
  → Server is a dumb relay (no merge logic)
```

---

## Error Paths

| Scenario | Handling |
|---|---|
| No `noteId` in presence map | `logger.warn()` + return (no crash) |
| User not in presence map on cursor_move | `logger.warn()` + return |
| Socket disconnect without join | `noteId`/`odId` undefined → skip cleanup |
| Stale user (no activity >2min) | Cleanup interval removes + broadcasts |

---

## Cross-References

- [17-notes-system.md](./17-notes-system.md) — Notes CRUD (REST API)
- [20-notes-socket-handler.md](./20-notes-socket-handler.md) — Socket handler deep dive
- [06-middleware-stack.md](./06-middleware-stack.md) — Socket.IO setup in index.js
- [11-presence-system.md](./11-presence-system.md) — User presence (separate from note presence)
