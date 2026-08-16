# 45 — Meet Routes

**NEW document** — Meeting CRUD, scheduling, participant management, Google Meet link generation

---

## Feature Summary

The meet routes handle meeting creation, listing, updates, and deletion. Each meeting can be associated with a project and generates a Google Meet link via the Google Calendar API. Participants are tracked and notified via email.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  MeetingsView.tsx                                       │
│  ├─ Upcoming meetings list                              │
│  ├─ "Schedule Meeting" button                           │
│  │   └─ ScheduleMeetingDialog.tsx                       │
│  │      ├─ Title, date/time, participants               │
│  │      └─ POST /api/meets                              │
│  ├─ Meeting details view                                │
│  │   ├─ Meet link (click to join)                       │
│  │   ├─ Participant list                                │
│  │   └─ Edit/Delete buttons                             │
│  └─ Past meetings with duration                         │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  backend/routes/meetRoutes.js                           │
│                                                         │
│  POST   /          → create meeting + Meet link         │
│  GET    /          → list user's meetings               │
│  GET    /:id       → get meeting details                │
│  PUT    /:id       → update meeting                     │
│  DELETE /:id       → delete meeting                     │
│  POST   /:id/join  → join meeting (record participation)│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/meetRoutes.js`

### POST / (create meeting)
- **Auth:** required
- **Input:** `{ title, startTime, endTime?, participants?, projectId? }`
- **Logic:**
  1. Create Google Calendar event with Meet conference data
  2. `googleMeet.createMeeting(title, startTime, participants)`
  3. Create Meeting document: `{ title, meetLink, hostId, participants, startTime, projectId, calendarEventId }`
  4. Send invitation emails to participants
  5. Return meeting with Meet link

### GET / (list meetings)
- **Auth:** required
- **Query:** `?status=upcoming|past|all`
- **Logic:** `Meeting.find({ $or: [{ hostId: uid }, { participants: uid }] }).sort({ startTime: -1 })`
- **Response:** Paginated meeting list

### GET /:id (meeting details)
- **Auth:** required
- **Logic:** Find meeting, verify participation
- **Response:** Full meeting details with Meet link

### PUT /:id (update meeting)
- **Auth:** required (host only)
- **Input:** Partial meeting fields
- **Logic:** Update meeting, sync with Google Calendar if time changed
- **Response:** Updated meeting

### DELETE /:id (delete meeting)
- **Auth:** required (host only)
- **Logic:** Delete meeting, optionally delete Google Calendar event
- **Response:** `{ message: "Meeting deleted" }`

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | Unauthorized |
| Meeting not found | 404 | `{ error: "Meeting not found" }` |
| Not host (update/delete) | 403 | `{ error: "Unauthorized" }` |
| Google Calendar API error | 500 | `{ error: "Failed to create meeting" }` |
| Server error | 500 | `{ error: "Server error" }` |

---

## Cross-References

- [30-meeting-system.md](./30-meeting-system.md) — Meeting system overview
- [29-session-management.md](./29-session-management.md) — Sessions linked to meetings
- [40-google-oauth-integration.md](./40-google-oauth-integration.md) — Google Calendar API
- [28-email-service-notifications.md](./28-email-service-notifications.md) — Meeting invitations
