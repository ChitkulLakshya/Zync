# 24 — Chat Socket Handler

**NEW document** — Socket.IO /chat namespace, multi-device support, delivery catch-up, read receipts, typing indicators

---

## Feature Summary

The chat socket handler (`backend/sockets/chatSocketHandler.js`, 282 lines) manages real-time message delivery, delivery receipts, read receipts, typing indicators, and chat clearing. It supports multi-device connections (same user on web + mobile) via a `userSockets` Map that tracks all active socket IDs per user.

---

## Architecture Diagram

```
┌─────────────────── SOCKET.IO /chat ─────────────────────┐
│                                                         │
│  Connection: query { userId }                            │
│                                                         │
│  In-Memory State:                                       │
│  userSockets: Map<userId, Set<socketId>>                │
│  (tracks all active connections per user)               │
│                                                         │
│  On Connect:                                            │
│  ├─ Register socket in userSockets                      │
│  ├─ Delivery catch-up: fetch undelivered messages       │
│  │   ├─ Batch process (200 per batch, max 10 batches)   │
│  │   ├─ Mark as delivered + set deliveredAt             │
│  │   └─ Notify senders with 'message-delivered'         │
│  └─ Log connection                                      │
│                                                         │
│  Events IN (Client → Server):                           │
│  ├─ send-message → save to DB, emit to both users       │
│  ├─ mark-seen → update DB, notify sender                │
│  ├─ typing → forward to receiver                        │
│  └─ clear-chat → delete messages, notify both           │
│                                                         │
│  Events OUT (Server → Client):                          │
│  ├─ new-message → message object                        │
│  ├─ message-delivered → { messageIds } or { messageId } │
│  ├─ message-seen → { messageIds }                       │
│  ├─ user-typing → { chatId, userId, isTyping }          │
│  ├─ messages-cleared → { chatId }                       │
│  └─ chat-error → { error }                              │
│                                                         │
│  On Disconnect:                                         │
│  └─ Remove socket from userSockets                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/sockets/chatSocketHandler.js` (282 lines)

### Configuration (lines 93-100)
| Variable | Default | Purpose |
|---|---|---|
| `DELIVERY_CATCHUP_BATCH_SIZE` | 200 | Messages per catch-up batch |
| `DELIVERY_CATCHUP_MAX_BATCHES` | 10 | Max batches (2000 messages max) |

### userSockets Map (lines 103-125)

#### Data Structure
```
userSockets: Map<userId: string, Set<socketId: string>>
```
- One user can have multiple socket IDs (web + mobile + multiple tabs)
- All events are emitted to ALL of a user's sockets (multi-device sync)

#### addSocket(userId, socketId) (lines 106-109)
- Initialize Set if user not in map
- Add socket ID to user's Set

#### removeSocket(userId, socketId) (lines 111-116)
- Remove socket ID from user's Set
- If Set is empty: delete user from map (free memory)

#### emitToUser(userId, event, data) (lines 119-125)
```js
const sockets = userSockets.get(userId);
if (!sockets) return;
for (const sid of sockets) {
  chatNamespace.to(sid).emit(event, data);
}
```
- Emits to ALL of a user's active sockets
- If user offline: no-op (silent skip)

---

### Connection Handler (lines 128-280)

#### On Connect (lines 128-177)
1. **Extract userId** from `socket.handshake.query`
2. **Validate:** disconnect if no userId
3. **Register:** `addSocket(userId, socket.id)`
4. **Delivery catch-up** (if DB ready):
   ```
   FOR batchIndex = 0 TO DELIVERY_CATCHUP_MAX_BATCHES:
     1. Find undelivered messages: { receiverId: userId, delivered: false }
        .select('_id senderId').sort({ _id: 1 }).limit(BATCH_SIZE)
     2. If empty: break
     3. Mark as delivered: updateMany({ _id: { $in: ids } }, { delivered: true, deliveredAt: new Date() })
     4. For each unique sender: emitToUser(senderId, 'message-delivered', { messageIds })
     5. If batch < BATCH_SIZE: break (reached end)
   ```
   - Processes in batches to avoid memory bloat
   - Notifies each sender that their messages were delivered
   - Catches up messages that were sent while user was offline

#### send-message Event (lines 180-235)
- **Payload:** `{ chatId, text, receiverId, senderName, senderPhotoURL, type, fileUrl, fileName, fileSize, projectId, projectName, projectOwnerId }`
- **Logic:**
  1. Check DB ready (else: `chat-error`)
  2. `Message.create({ ...payload, senderId: userId, delivered: userSockets.has(receiverId) })`
     - `senderId` comes from socket query, NOT payload (prevents spoofing)
     - `delivered` set to `true` if receiver is currently online
  3. Convert to plain object, add `id` field
  4. `emitToUser(userId, 'new-message', msgObj)` — echo to sender's other devices
  5. `emitToUser(receiverId, 'new-message', msgObj)` — deliver to receiver
  6. If receiver online: `emitToUser(userId, 'message-delivered', { messageId })` — instant delivery receipt

#### mark-seen Event (lines 238-253)
- **Payload:** `{ messageIds: string[], senderId: string }`
- **Logic:**
  1. Check DB ready
  2. Validate messageIds not empty
  3. `Message.updateMany({ _id: { $in: messageIds }, receiverId: userId }, { $set: { seen: true, seenAt: new Date() } })`
     - **Security:** `receiverId: userId` ensures user can only mark their own messages as seen
  4. `emitToUser(senderId, 'message-seen', { messageIds })` — notify sender with read receipt

#### typing Event (lines 256-258)
- **Payload:** `{ chatId, receiverId, isTyping }`
- **Logic:** `emitToUser(receiverId, 'user-typing', { chatId, userId, isTyping })`
- No DB interaction — purely ephemeral

#### clear-chat Event (lines 261-273)
- **Payload:** `{ chatId, otherUserId }`
- **Logic:**
  1. Check DB ready
  2. `Message.deleteMany({ chatId })` — delete all messages in chat
  3. `emitToUser(userId, 'messages-cleared', { chatId })` — notify self (other devices)
  4. `emitToUser(otherUserId, 'messages-cleared', { chatId })` — notify other user

#### disconnect Event (lines 276-279)
- `removeSocket(userId, socket.id)` — clean up from userSockets
- If last socket for user: user removed from map entirely

---

## Message Delivery States

```
1. SENT: Message saved to DB, emitted to sender (echo)
   └─ delivered: false (receiver offline)

2. DELIVERED: Receiver connects → catch-up marks as delivered
   └─ delivered: true, deliveredAt: Date
   └─ Sender receives 'message-delivered' event
   └─ OR: if receiver online at send time: delivered immediately

3. SEEN: Receiver opens chat → mark-seen event
   └─ seen: true, seenAt: Date
   └─ Sender receives 'message-seen' event
```

| State | DB Field | Socket Event | UI Indicator |
|---|---|---|---|
| Sent | `delivered: false` | — | Single tick (grey) |
| Delivered | `delivered: true` | `message-delivered` | Double tick (grey) |
| Seen | `seen: true` | `message-seen` | Double tick (blue) |

---

## Multi-Device Sync

```
User A (web) sends message
  → emitToUser(A, 'new-message') → web + mobile both receive
  → emitToUser(B, 'new-message') → B's web + mobile both receive

User A (mobile) marks seen
  → emitToUser(B, 'message-seen') → B notified on all devices
  → A's web also updates (via separate mark-seen or state sync)
```

- Every emit goes to ALL sockets for a user
- Ensures web and mobile stay in sync
- No special handling needed — `emitToUser` loops all sockets

---

## Socket Events Reference

### Client → Server

| Event | Payload | Purpose |
|---|---|---|
| `send-message` | `{ chatId, text, receiverId, senderName, senderPhotoURL, type, fileUrl, fileName, fileSize, projectId, projectName, projectOwnerId }` | Send a message |
| `mark-seen` | `{ messageIds: string[], senderId: string }` | Mark messages as read |
| `typing` | `{ chatId, receiverId, isTyping }` | Typing indicator |
| `clear-chat` | `{ chatId, otherUserId }` | Delete all messages in chat |

### Server → Client

| Event | Payload | Purpose |
|---|---|---|
| `new-message` | Message object | New message (sent or received) |
| `message-delivered` | `{ messageId }` or `{ messageIds }` | Delivery receipt |
| `message-seen` | `{ messageIds }` | Read receipt |
| `user-typing` | `{ chatId, userId, isTyping }` | Typing indicator |
| `messages-cleared` | `{ chatId }` | Chat history deleted |
| `chat-error` | `{ error: string }` | Error notification |

---

## Error Paths

| Scenario | Handling |
|---|---|
| DB disconnected | `socket.emit('chat-error', { error: 'Database not available' })` |
| Message save fails | `socket.emit('chat-error', { error: 'Failed to send message' })` |
| No userId in handshake | `socket.disconnect()` |
| mark-seen with empty array | Early return (no-op) |
| Delivery catch-up error | Logged, connection continues |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DELIVERY_CATCHUP_BATCH_SIZE` | 200 | Messages per catch-up batch |
| `DELIVERY_CATCHUP_MAX_BATCHES` | 10 | Max catch-up batches (2000 msgs) |

---

## Cross-References

- [23-instant-chat-system.md](./23-instant-chat-system.md) — REST API for chat history + conversations
- [11-presence-system.md](./11-presence-system.md) — Online status (separate from chat sockets)
- [05-database-schema-and-models.md](./05-database-schema-and-models.md) — Message model
- [06-middleware-stack.md](./06-middleware-stack.md) — Socket.IO initialization
