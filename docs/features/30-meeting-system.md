# 30 — Meeting System

**NEW document** — Google Meet integration, meeting creation, join flow, participant tracking, session linking

---

## Feature Summary

Zync integrates with Google Meet for video conferencing. Meetings can be created from the dashboard or within a project. Each meeting links to a Session record for tracking duration and participants. The backend uses the Google Calendar API to create Meet links and the frontend embeds the Meet interface.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  DashboardHome.tsx                                      │
│  ├─ "Start Meeting" button                              │
│  │   └─ POST /api/sessions/start → creates session      │
│  │   └─ Opens Google Meet link in new tab/iframe        │
│  ├─ Upcoming meetings list                              │
│  └─ Recent meetings with duration                       │
│                                                         │
│  MeetingRoom.tsx                                        │
│  ├─ Google Meet embed (iframe)                          │
│  ├─ Participant list (from presence system)             │
│  ├─ Chat sidebar (uses chat system)                     │
│  └─ On leave: PUT /api/sessions/:id (set endTime)       │
│                                                         │
│  ProjectWorkspace.tsx                                   │
│  └─ "Schedule Meeting" → creates meeting for project    │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  backend/services/googleMeet.js                         │
│  ├─ createMeeting(title, startTime, attendees)          │
│  │   ├─ Uses Google Calendar API                        │
│  │   ├─ Creates event with Meet conference data         │
│  │   └─ Returns { meetLink, eventId, hangoutLink }      │
│  ├─ send_ZYNC_email(to, subject, html, text)            │
│  │   └─ Gmail SMTP for meeting invitations              │
│  └─ OAuth2 with service account or user token           │
│                                                         │
│  sessionRoutes.js                                       │
│  ├─ POST /start → create session for meeting            │
│  └─ PUT /:id → update session on meeting end            │
│                                                         │
│  Meeting Model (backend/models/Meeting.js)              │
│  ├─ title, meetLink, hostId, participants               │
│  ├─ startTime, endTime, status                          │
│  └─ projectId (optional, if project-scoped)             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/services/googleMeet.js`

### createMeeting(title, startTime, attendees)
1. **Google Calendar API:** Create event with `conferenceData.createRequest.requestId`
2. **Conference solution:** `hangoutsMeet` (Google Meet)
3. **Attendees:** Array of email addresses
4. **Returns:**
   ```js
   {
     meetLink: "https://meet.google.com/xxx-xxxx-xxx",
     eventId: "calendar event ID",
     hangoutLink: "https://meet.google.com/xxx-xxxx-xxx"
   }
   ```
5. **Email invitations:** Sent via `send_ZYNC_email()` to all attendees

### send_ZYNC_email(to, subject, html, text)
- Uses nodemailer with Gmail SMTP
- OAuth2 authentication (refresh token from env)
- Used for: meeting invitations, task assignments, deletion codes, chat requests

### Google Calendar API Integration
- **Auth:** Service account or OAuth2 with refresh token
- **Scopes:** `https://www.googleapis.com/auth/calendar`
- **API:** `POST https://www.googleapis.com/calendar/v3/calendars/primary/events`
- **Conference data:**
  ```js
  conferenceData: {
    createRequest: {
      requestId: uuid(),
      conferenceSolutionKey: { type: 'hangoutsMeet' }
    }
  }
  ```

---

## Database Layer

### Meeting Model
**File:** `backend/models/Meeting.js`

| Field | Type | Required | Index | Notes |
|---|---|---|---|---|
| `title` | String | yes | — | Meeting title |
| `meetLink` | String | yes | — | Google Meet URL |
| `hostId` | String | yes | yes | Firebase UID of host |
| `participants` | String[] | no | — | Array of UIDs |
| `startTime` | Date | yes | — | Scheduled start |
| `endTime` | Date | no | — | Actual end (null = ongoing) |
| `status` | String | no | — | `scheduled`, `active`, `ended` |
| `projectId` | ObjectId | no | — | Ref: Project (if project meeting) |
| `calendarEventId` | String | no | — | Google Calendar event ID |
| `createdAt` | Date | auto | — | |

### Session → Meeting Link
- `Session.meetingId` references `Meeting._id`
- When meeting ends, session's `endTime` is set
- Duration calculated: `endTime - startTime`

---

## Meeting Lifecycle

```
1. CREATE: Host clicks "Start Meeting"
   → googleMeet.createMeeting() → get Meet link
   → Meeting.create({ title, meetLink, hostId, startTime, status: 'scheduled' })
   → Session.create({ userId: hostId, startTime, meetingId, status: 'active' })
   → Email invitations to participants

2. JOIN: Participants click Meet link
   → Google Meet opens in browser
   → Presence system tracks online participants
   → Meeting.status = 'active'

3. END: Host ends meeting or last person leaves
   → Meeting.findByIdAndUpdate(id, { endTime, status: 'ended' })
   → Session.findByIdAndUpdate(sessionId, { endTime, status: 'ended' })
   → Duration calculated and stored

4. DELETE: Host deletes meeting
   → Meeting.findByIdAndDelete(id)
   → Session.deleteMany({ meetingId: id })
   → Google Calendar event deleted (optional)
```

---

## Frontend Trace

### MeetingRoom Component
**File:** `src/components/views/MeetingRoom.tsx`
- Google Meet embedded via iframe: `<iframe src={meetLink} allow="camera; microphone" />`
- Participant list from presence system (Socket.IO `/presence`)
- Chat sidebar uses the chat system (Socket.IO `/chat`)
- On unmount/leave: `PUT /api/sessions/:id` with `endTime`

### ScheduleMeetingDialog
**File:** `src/components/meetings/ScheduleMeetingDialog.tsx`
- Title input, date/time picker, participant multi-select
- On submit: `POST /api/meetings` → creates meeting + sends invites
- Shows Meet link after creation

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| Google Calendar API error | 500 | `{ error: "Failed to create meeting" }` |
| SMTP auth failure | — | Email not sent, meeting still created |
| Meeting not found | 404 | `{ error: "Meeting not found" }` |
| Not host (delete) | 403 | `{ error: "Unauthorized" }` |
| Server error | 500 | `{ error: "Server error" }` |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Yes | Refresh token for Calendar API |
| `SMTP_USER` | Yes | Gmail address for SMTP |
| `SMTP_PASS` | Yes | Gmail app password |
| `FRONTEND_URL` | Yes | For email links |

---

## Cross-References

- [29-session-management.md](./29-session-management.md) — Sessions linked to meetings
- [28-email-service-notifications.md](./28-email-service-notifications.md) — Meeting invitation emails
- [11-presence-system.md](./11-presence-system.md) — Participant presence during meetings
- [23-instant-chat-system.md](./23-instant-chat-system.md) — Chat during meetings
- [04-service-inventory.md](./04-service-inventory.md) — Google Meet service listing
