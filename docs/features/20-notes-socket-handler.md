# 20 — Notes Socket Handler

**NEW document** — Deep dive into noteSocketHandler.js: dual event naming, presence map lifecycle, memory management, cleanup interval

---

## Feature Summary

This document is a deep technical dive into `backend/sockets/noteSocketHandler.js`, covering the dual event naming convention (primary + legacy + alternate), in-memory `notePresence` Map lifecycle, memory management strategies, and the stale user cleanup interval.

---

## File Overview

**File:** `backend/sockets/noteSocketHandler.js`
**Lines:** 300
**Namespace:** `/notes`
**Registration:** `backend/index.js` → `require('./sockets/noteSocketHandler')(io)`

---

## Dual Event Naming Convention

The handler supports three parallel event naming patterns for compatibility with different client integrations:

| Primary Event | Legacy Event | Alternate Event | Purpose |
|---|---|---|---|
| `join_note` | `join-note` | `presence-join` | Join a note room |
| `leave_note` | `leave-note` | `presence-leave` | Leave a note room |
| `cursor_move` | — | `presence-cursor` | Update cursor position |

### Primary Events (`join_note`, `leave_note`, `cursor_move`)
- Used by the main web client (React + TipTap)
- Payload: `{ noteId, userId, userName, userAvatar, userColor }`
- Full user profile data sent on join

### Legacy Events (`join-note`, `leave-note`)
- Used by older y-websocket integration
- Payload: `noteId` (bare string, not object)
- `join-note` also emits `user-joined-yjs` to trigger Yjs sync
- Minimal data — no user profile

### Alternate Events (`presence-join`, `presence-leave`, `presence-cursor`)
- Used by mobile/alternate client integration
- Payload: `{ noteId, odId, displayName, photoURL, color }`
- Different field names (`odId` vs `userId`, `displayName` vs `userName`)

---

## In-Memory Presence Map

### Data Structure
```
notePresence: Map<noteId: string, Map<userId: string, {
  id: string,           // Firebase UID
  name: string,         // Display name
  avatarUrl: string,    // Profile photo URL
  color: string,        // Cursor color (hex, default '#3b82f6')
  blockId: string|null, // Current focused block (cursor position)
  lastActive: number    // Timestamp (Date.now())
}>>
```

### Lifecycle

```
1. CREATE: First user joins note
   notePresence.set(noteId, new Map())
   notePresence.get(noteId).set(userId, { ... })

2. GROW: More users join
   notePresence.get(noteId).set(userId2, { ... })

3. UPDATE: Cursor movement
   notePresence.get(noteId).get(userId).blockId = newBlockId
   notePresence.get(noteId).get(userId).lastActive = Date.now()

4. SHRINK: Users leave
   notePresence.get(noteId).delete(userId)

5. DESTROY: Last user leaves
   if (users.size === 0) notePresence.delete(noteId)
```

### Memory Management
- **Per-note cleanup:** When all users leave a note, the inner Map is deleted from `notePresence`
- **Stale user cleanup:** `setInterval(30s)` removes users inactive >2 minutes
- **Disconnect cleanup:** `socket.disconnect` event removes user from map
- **unref():** Cleanup interval does not prevent Node process exit

---

## Stale User Cleanup Algorithm

```
Every 30 seconds:
  IF notePresence is empty → return (skip)

  FOR each (noteId, users) in notePresence:
    hasStaleUsers = false

    FOR each (userId, user) in users:
      IF (now - user.lastActive > 120000):  // 2 minutes
        users.delete(userId)
        hasStaleUsers = true

    IF hasStaleUsers:
      broadcastPresence(noteId)  // Update UI

    IF users.size === 0:
      notePresence.delete(noteId)  // Free memory
```

### Why 2 Minutes?
- Network blips: <30s (handled by reconnect)
- Tab switch: ~30s-1min (user still active)
- Phone locked: ~1-2min (user inactive)
- 2 minutes is the sweet spot: catches truly inactive users without removing temporarily distracted ones

### Why 30 Second Interval?
- Balance between UI freshness and CPU usage
- At 30s intervals, stale users are removed within 30-60s of becoming stale
- On a server with 100 active notes, this iterates 100 maps every 30s — negligible CPU

---

## Event Flow Diagrams

### Join Flow
```
Client                    Server                    Other Clients
  │                         │                         │
  │ join_note {noteId,...}  │                         │
  │────────────────────────►│                         │
  │                         │ socket.join(noteId)     │
  │                         │ notePresence.set(...)   │
  │                         │ broadcastPresence()     │
  │                         │────────────────────────►│
  │                         │   presence_update       │
  │                         │   [user list]           │
  │                         │                         │
  │                         │◄────────────────────────│
  │   presence_update       │   (other users too)     │
  │   [user list]           │                         │
  │◄────────────────────────│                         │
```

### Edit Flow (Yjs)
```
Client A              Server              Client B
  │                     │                    │
  │ note-update {       │                    │
  │   noteId,           │                    │
  │   update: Uint8Array│                    │
  │ }                   │                    │
  │────────────────────►│                    │
  │                     │ socket.to(noteId)  │
  │                     │ .emit('note-update',│
  │                     │   update)          │
  │                     │───────────────────►│
  │                     │                    │ Y.applyUpdate()
  │                     │                    │ ProseMirror renders
```

### Disconnect Flow
```
Client                  Server                  Other Clients
  │                       │                       │
  │ (browser closes)      │                       │
  │──────────────────────►│                       │
  │   disconnect          │                       │
  │                       │ Get noteId, odId      │
  │                       │   from socket props   │
  │                       │ users.delete(odId)    │
  │                       │ broadcastPresence()   │
  │                       │──────────────────────►│
  │                       │  presence_update      │
  │                       │  user_left(odId)      │
  │                       │                       │
  │                       │ IF users.size === 0:  │
  │                       │   notePresence.delete │
```

---

## Server as Dumb Relay

The server does **not**:
- Parse or interpret Yjs updates
- Merge concurrent edits (CRDT handles this client-side)
- Persist document state (MongoDB stores last-saved version via REST API)
- Validate edit permissions (handled by REST API on save)

The server **does**:
- Track presence (who is in which note)
- Forward Yjs binary updates between clients
- Forward Yjs awareness state (cursor positions, selections)
- Clean up stale connections

---

## Cross-References

- [19-realtime-notes-collaboration.md](./19-realtime-notes-collaboration.md) — High-level collaboration overview
- [17-notes-system.md](./17-notes-system.md) — REST API for note CRUD
- [11-presence-system.md](./11-presence-system.md) — Global user presence (separate from note presence)
- [06-middleware-stack.md](./06-middleware-stack.md) — Socket.IO initialization
