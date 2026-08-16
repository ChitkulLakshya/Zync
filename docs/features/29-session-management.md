# 29 — Session Management

**NEW document** — Session CRUD, start/batch/update/delete, user session history, meeting tracking

---

## Feature Summary

Sessions track user work sessions and meeting participation. Each session records start/end times, participants, and metadata. The session API supports starting a new session, batch-fetching sessions for multiple users, updating session data, retrieving user session history, and deleting sessions.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  DashboardHome.tsx                                      │
│  ├─ Active session indicator                            │
│  ├─ Session history timeline                            │
│  └─ "Start Session" button                              │
│                                                         │
│  MeetingRoom.tsx                                        │
│  ├─ Auto-creates session on join                        │
│  ├─ Updates session on leave (end time, duration)       │
│  └─ Participant tracking                                │
│                                                         │
│  Hooks:                                                 │
│  ├─ useSessions.ts — user session history               │
│  ├─ useStartSession.ts — create mutation                │
│  └─ useUpdateSession.ts — update mutation               │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ROUTES ──────────────────────┐
│                                                         │
│  backend/routes/sessionRoutes.js                        │
│                                                         │
│  POST   /start       → start new session                │
│  POST   /batch       → batch fetch sessions             │
│  PUT    /:id         → update session                   │
│  POST   /:id         → update session (alt)             │
│  GET    /:userId     → get user's sessions              │
│  DELETE /:id         → delete session                   │
│  DELETE /user/:userId → delete all user sessions        │
│                                                         │
│  Middleware: verifyToken (applied to all routes)        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/sessionRoutes.js`

### Middleware (line 96)
```js
router.use(verifyToken);
```
- All session routes require authentication

### POST /start (lines 101-162)
- **Auth:** required
- **Input:** `{ userId, meetingId?, participants?, metadata? }`
- **Logic:**
  1. Create Session: `{ userId, startTime: new Date(), participants, metadata, status: 'active' }`
  2. Return created session
- **Response:** Session document with `_id`

### POST /batch (lines 165-262)
- **Auth:** required
- **Input:** `{ userIds: string[] }` — array of user IDs
- **Logic:**
  1. For each userId: find sessions
  2. Return map of userId → sessions array
  3. Used for team dashboards showing all members' sessions
- **Response:** `{ [userId]: Session[] }`

### PUT /:id and POST /:id (lines 296-301)
- **Auth:** required
- **Input:** Partial session fields (`endTime`, `status`, `participants`, `metadata`)
- **Logic:**
  1. `Session.findByIdAndUpdate(id, { $set: updates }, { new: true })`
  2. Common update: set `endTime` + `status: 'ended'` when session ends
- **Response:** Updated session

### GET /:userId (lines 304-349)
- **Auth:** required
- **Logic:**
  1. `Session.find({ userId }).sort({ startTime: -1 }).lean()`
  2. Paginate results
  3. Set pagination headers
- **Response:** Array of sessions (newest first)

### DELETE /:id (lines 352-393)
- **Auth:** required
- **Logic:**
  1. Find session by ID
  2. Verify ownership: `session.userId === req.user.uid`
  3. Delete session
- **Response:** `{ message: "Session deleted" }`

### DELETE /user/:userId (lines 396+)
- **Auth:** required
- **Logic:**
  1. Verify: `req.params.userId === req.user.uid`
  2. `Session.deleteMany({ userId })`
  3. Delete all sessions for user
- **Response:** `{ message: "All sessions deleted", count }`

---

## Database Layer

### Session Model
**File:** `backend/models/Session.js`

| Field | Type | Required | Index | Notes |
|---|---|---|---|---|
| `userId` | String | yes | yes | Firebase UID |
| `startTime` | Date | yes | — | Session start |
| `endTime` | Date | no | — | Session end (null = active) |
| `status` | String | no | — | `active`, `ended` |
| `participants` | String[] | no | — | Array of UIDs |
| `meetingId` | ObjectId | no | — | Ref: Meeting (if meeting session) |
| `metadata` | Mixed | no | — | Flexible key-value store |
| `duration` | Number | no | — | Calculated on end (seconds) |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Index:** `{ userId: 1, startTime: -1 }` — efficient user history query

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | Unauthorized |
| Session not found | 404 | `{ error: "Session not found" }` |
| Not owner (delete) | 403 | `{ error: "Unauthorized" }` |
| Server error | 500 | `{ error: error.message }` |

---

## Cross-References

- [05-database-schema-and-models.md](./05-database-schema-and-models.md) — Session model
- [30-meeting-system.md](./30-meeting-system.md) — Meetings that create sessions
- [14-project-crud.md](./14-project-crud.md) — Project-scoped sessions
