# 50 — Socket.IO Initialization & Namespaces

**NEW document** — Socket.IO server setup, namespace registration, connection middleware, Redis adapter

---

## Feature Summary

Socket.IO is initialized in the main server file with multiple namespaces for different features: `/presence` (user online status), `/chat` (real-time messaging), `/notes` (collaborative editing), `/tasks` (Kanban updates). Each namespace has its own handler, connection middleware, and event set.

---

## Architecture Diagram

```
┌─────────────────── BACKEND (index.js) ──────────────────┐
│                                                         │
│  const io = socketIo(server, {                          │
│    cors: { origin: FRONTEND_URL, credentials: true },   │
│    transports: ['websocket', 'polling']                 │
│  });                                                    │
│                                                         │
│  Namespaces:                                            │
│  ┌─────────────────────────────────────────────────┐    │
│  │ /presence  → presenceSocketHandler(io)           │    │
│  │   Events: user-online, user-offline, user-away   │    │
│  │   Query: { userId }                               │    │
│  ├─────────────────────────────────────────────────┤    │
│  │ /chat      → chatSocketHandler(io)                │    │
│  │   Events: send-message, mark-seen, typing,       │    │
│  │            clear-chat, new-message,               │    │
│  │            message-delivered, message-seen        │    │
│  │   Query: { userId }                               │    │
│  ├─────────────────────────────────────────────────┤    │
│  │ /notes     → noteSocketHandler(io)                │    │
│  │   Events: join_note, cursor_move, note-update,    │    │
│  │            awareness-update, leave_note,           │    │
│  │            presence_update, user_left              │    │
│  │   Query: { userId }                               │    │
│  ├─────────────────────────────────────────────────┤    │
│  │ /tasks     → taskSocketHandler(io)                │    │
│  │   Events: task-created, task-updated,             │    │
│  │            task-deleted, task-moved                │    │
│  │   Rooms: project:{projectId}                      │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  app.set('io', io);          // Global access           │
│  app.set('taskIO', io.of('/tasks')); // Task namespace  │
│                                                         │
│  Redis Adapter (optional):                              │
│  io.adapter(redisAdapter({ host: REDIS_HOST, ... }));   │
│  → Enables multi-server broadcast                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/index.js` (or `backend/server.js`)

### Socket.IO Server Creation
```js
const socketIo = require('socket.io');
const http = require('http');
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});
```

### Namespace Registration
```js
const presenceSocketHandler = require('./sockets/presenceSocketHandler');
const chatSocketHandler = require('./sockets/chatSocketHandler');
const noteSocketHandler = require('./sockets/noteSocketHandler');
const taskSocketHandler = require('./sockets/taskSocketHandler');

presenceSocketHandler(io);
chatSocketHandler(io);
noteSocketHandler(io);
taskSocketHandler(io);
```

### Global Access
```js
app.set('io', io);
app.set('taskIO', io.of('/tasks'));
```
- Routes can access Socket.IO via `req.app.get('io')`
- Used by: webhook worker (emit task updates), project routes (emit project changes)

### Redis Adapter (Production)
```js
const redisAdapter = require('socket.io-redis');
io.adapter(redisAdapter({ host: process.env.REDIS_HOST, port: 6379 }));
```
- Enables broadcast across multiple Node.js instances
- Events emitted on one server reach clients connected to other servers
- Required for horizontal scaling

---

## Namespace Comparison

| Namespace | Purpose | Connection Query | Rooms | In-Memory State |
|---|---|---|---|---|
| `/presence` | User online/offline/away | `{ userId }` | Per-user | `userSockets` Map |
| `/chat` | Real-time messaging | `{ userId }` | Per-user (multi-device) | `userSockets` Map |
| `/notes` | Collaborative editing | `{ userId }` | Per-note | `notePresence` Map |
| `/tasks` | Kanban board updates | `{ userId }` | Per-project | None (stateless relay) |

---

## Connection Lifecycle

```
1. Client connects to namespace:
   const socket = io('/chat', { query: { userId: 'abc123' } });

2. Server receives connection:
   namespace.on('connection', (socket) => {
     const userId = socket.handshake.query.userId;
     // Register, setup event handlers
   });

3. Client emits events:
   socket.emit('send-message', { ... });

4. Server forwards/processes:
   socket.on('send-message', (payload) => { ... });

5. Server emits to clients:
   namespace.to(room).emit('event', data);
   // OR
   emitToUser(userId, 'event', data);

6. Client disconnects:
   socket.on('disconnect', () => { /* cleanup */ });
   // OR
   socket.disconnect();
```

---

## Frontend Connection

### Socket Context Provider
**File:** `src/context/SocketContext.tsx`
```js
import { io } from 'socket.io-client';

const SocketProvider = ({ children }) => {
  const presenceSocket = io('/presence', { query: { userId } });
  const chatSocket = io('/chat', { query: { userId } });
  const notesSocket = io('/notes', { query: { userId } });
  const tasksSocket = io('/tasks', { query: { userId } });

  return <SocketContext.Provider value={{ presenceSocket, chatSocket, notesSocket, tasksSocket }}>
    {children}
  </SocketContext.Provider>;
};
```

### Hook Usage
```js
const { chatSocket } = useSocket();

useEffect(() => {
  chatSocket.on('new-message', (msg) => {
    // Handle incoming message
  });
  return () => chatSocket.off('new-message');
}, []);
```

---

## Error Paths

| Scenario | Handling |
|---|---|
| No userId in query | `socket.disconnect()` (all namespaces) |
| Redis adapter fails | Falls back to single-server mode |
| Namespace handler error | Caught in try-catch, logged |
| Client reconnect | Socket.IO auto-reconnects with backoff |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `FRONTEND_URL` | Yes | CORS origin for Socket.IO |
| `REDIS_HOST` | No (prod) | Redis adapter host for scaling |
| `REDIS_PORT` | No | Default: 6379 |

---

## Cross-References

- [11-presence-system.md](./11-presence-system.md) — /presence namespace
- [19-realtime-notes-collaboration.md](./19-realtime-notes-collaboration.md) — /notes namespace
- [24-chat-socket-handler.md](./24-chat-socket-handler.md) — /chat namespace
- [47-task-routes-standalone.md](./47-task-routes-standalone.md) — /tasks namespace
- [06-middleware-stack.md](./06-middleware-stack.md) — Express + Socket.IO setup
