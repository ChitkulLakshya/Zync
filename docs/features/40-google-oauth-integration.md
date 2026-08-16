# 40 — Google OAuth Integration

**NEW document** — Google sign-in via Firebase popup, token storage, Google Calendar/Meet integration, Google Drive scope

---

## Feature Summary

Google integration in Zync serves two purposes: (1) Google sign-in via Firebase Auth's `signInWithPopup` (handled entirely on the frontend) and (2) server-side Google API access for Calendar (meeting creation) and Gmail (SMTP email). The backend stores Google OAuth tokens encrypted and refreshes them automatically.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  Login.tsx                                              │
│  ├─ "Sign in with Google" button                        │
│  │   └─ signInWithPopup(auth, googleProvider)           │
│  │      └─ Firebase handles OAuth flow entirely         │
│  ├─ Account linking: if email exists with different     │
│  │   provider → linkWithPopup instead                   │
│  └─ Post-login: postLoginRedirect → /dashboard          │
│                                                         │
│  SettingsView.tsx → Google integration status           │
│  ├─ Shows connected/disconnected state                  │
│  └─ Google Calendar permissions for meetings            │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  backend/routes/googleRoutes.js                         │
│  ├─ POST /connect   → store Google tokens               │
│  ├─ DELETE /disconnect → remove Google tokens           │
│  └─ GET /status     → check Google integration status   │
│                                                         │
│  backend/services/googleMeet.js                         │
│  ├─ createMeeting() → Google Calendar API               │
│  ├─ send_ZYNC_email() → Gmail SMTP                      │
│  └─ OAuth2 client with refresh token                    │
│                                                         │
│  Token Storage:                                         │
│  ├─ User.googleIntegration = {                          │
│  │     connected, accessToken (encrypted),              │
│  │     refreshToken (encrypted), expiryDate             │
│  │  }                                                   │
│  └─ AES-256 encryption via ENCRYPTION_KEY               │
│                                                         │
│  Google APIs:                                           │
│  ├─ Calendar API → create events with Meet links        │
│  ├─ Gmail API → send transactional emails               │
│  └─ OAuth2 scopes: calendar, gmail.send, userinfo.email │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/googleRoutes.js`

### POST /connect
- **Auth:** required
- **Input:** `{ accessToken, refreshToken, expiryDate }`
- **Logic:**
  1. Encrypt `accessToken` and `refreshToken` with AES-256
  2. Store on User: `googleIntegration: { connected: true, accessToken, refreshToken, expiryDate }`
  3. Invalidate user cache
- **Response:** `{ message: "Google connected" }`

### DELETE /disconnect
- **Auth:** required
- **Logic:**
  1. Clear `User.googleIntegration` fields
  2. Invalidate cache
- **Response:** `{ message: "Google disconnected" }`

### GET /status
- **Auth:** required
- **Logic:**
  1. Check `User.googleIntegration.connected`
  2. If token expired: attempt refresh using `refreshToken`
  3. Return `{ connected, hasCalendarAccess, hasGmailAccess }`
- **Response:** Google integration status

---

## Google Meet Service

### File: `backend/services/googleMeet.js`

### OAuth2 Client Setup
```js
const { google } = require('googleapis');
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
```

### Token Refresh
```js
oauth2Client.setCredentials({
  access_token: decrypt(user.googleIntegration.accessToken),
  refresh_token: decrypt(user.googleIntegration.refreshToken),
  expiry_date: user.googleIntegration.expiryDate
});

// Auto-refreshed by Google library when expired
```

### createMeeting(title, startTime, attendees)
1. `google.calendar('v3').events.insert({`
2. Calendar ID: `primary`
3. Event: `{ summary: title, start: { dateTime }, end: { dateTime }, attendees }`
4. Conference data: `{ createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } } }`
5. Returns: `{ meetLink, eventId }`

### send_ZYNC_email(to, subject, html, text)
- Uses nodemailer with Gmail SMTP
- Auth: OAuth2 with refresh token
- Alternative to Google Gmail API for sending emails

---

## Frontend Trace

### Google Sign-In (Firebase)
**File:** `src/pages/Login.tsx`
```js
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// On click:
const result = await signInWithPopup(auth, googleProvider);
const user = result.user;
```
- **No backend involvement:** Firebase handles the entire OAuth flow
- **Account linking:** If email exists with different provider, `linkWithPopup` is used
- **Scopes:** Default Firebase scopes (email, profile)

### Google Integration Status
**File:** `src/components/views/SettingsView.tsx`
- Fetches `GET /api/google/status`
- Shows: connected state, Calendar access, Gmail access
- "Connect Google" button triggers OAuth flow
- "Disconnect" button calls `DELETE /api/google/disconnect`

---

## Token Lifecycle

```
1. User signs in with Google (Firebase popup)
   → Firebase Auth token (JWT) for Zync authentication

2. User connects Google Calendar (optional)
   → OAuth flow → access_token + refresh_token
   → POST /api/google/connect (encrypted storage)

3. Access token expires
   → Google library auto-refreshes using refresh_token
   → New access_token stored (if backend involved)

4. User disconnects
   → DELETE /api/google/disconnect
   → Tokens removed from User document
```

---

## Encryption

Google tokens are encrypted at rest using AES-256:
```js
const CryptoJS = require('crypto-js');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

const encrypt = (text) => CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
const decrypt = (ciphertext) => CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
```
- Same encryption as GitHub tokens
- `ENCRYPTION_KEY` required in production

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | Unauthorized |
| Google tokens missing | 400 | `{ error: "Google not connected" }` |
| Token refresh fails | 401 | `{ error: "Google re-authentication required" }` |
| Calendar API error | 500 | `{ error: "Failed to create meeting" }` |
| SMTP auth failure | — | Email not sent, operation continues |
| Server error | 500 | `{ error: "Server error" }` |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Yes | OAuth callback URL |
| `ENCRYPTION_KEY` | Yes (prod) | AES-256 key for token encryption |
| `SMTP_USER` | Yes | Gmail address for SMTP |
| `SMTP_PASS` | Yes | Gmail app password |

---

## Cross-References

- [08-firebase-auth-flow.md](./08-firebase-auth-flow.md) — Google sign-in via Firebase
- [30-meeting-system.md](./30-meeting-system.md) — Google Meet creation
- [28-email-service-notifications.md](./28-email-service-notifications.md) — Gmail SMTP
- [21-github-oauth-integration.md](./21-github-oauth-integration.md) — Similar OAuth pattern
- [02-security-auth-architecture.md](./02-security-auth-architecture.md) — Token encryption
