# 09 — User Profile Management

**NEW document** — Profile CRUD, avatar upload, settings, location detection, user search, chat requests

---

## Feature Summary

User profile management covers: fetching user profile (`/me`), syncing Firebase user to MongoDB (`/sync`), linking GitHub integration (`/sync-github`), location detection (`/detect-location`), user search (`/search`), chat requests (`/chat-request`), password breach check (`/check-breached-password`), profile photo cropping, and settings management.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  SettingsView.tsx (94KB)                                │
│  ├─ Profile section: displayName, firstName, lastName   │
│  ├─ Avatar: ProfilePhotoCropper.tsx → Cloudinary        │
│  ├─ Security: password change, breach check             │
│  ├─ Integrations: GitHub, Google, LinkedIn              │
│  ├─ Notifications: FCM token registration               │
│  └─ Account: deletion, export                           │
│                                                         │
│  Hooks:                                                 │
│  ├─ useMe.ts — fetches /api/users/me (TanStack Query)   │
│  ├─ use-user-sync.ts — syncs Firebase user to MongoDB   │
│  └─ use-push-notifications.ts — FCM token management    │
│                                                         │
│  Components:                                            │
│  ├─ ProfilePhotoCropper.tsx — react-easy-crop + upload  │
│  └─ PeopleView.tsx — user search + chat requests        │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────── BACKEND ROUTES ──────────────────────┐
│                                                         │
│  backend/routes/userRoutes.js (957 lines)               │
│                                                         │
│  GET  /api/users/me              → fetch profile        │
│  POST /api/users/sync            → upsert user          │
│  POST /api/users/sync-github     → link GitHub token    │
│  GET  /api/users/detect-location → IP geolocation       │
│  GET  /api/users/search          → user search          │
│  POST /api/users/chat-request    → send chat request    │
│  POST /api/users/chat-request/respond → accept/reject   │
│  POST /api/users/check-breached-password → HIBP check   │
│  PUT  /api/users/profile         → update profile       │
│  POST /api/users/upload-photo    → avatar upload        │
│  DELETE /api/users/delete        → account deletion     │
│  POST /api/users/verify-phone    → phone OTP            │
│  POST /api/users/verify-phone-code → verify OTP         │
│  POST /api/users/fcm-token       → register FCM token   │
│  DELETE /api/users/fcm-token     → remove FCM token     │
│  POST /api/users/pin             → set security PIN     │
│  PUT  /api/users/pin             → update PIN           │
│                                                         │
│  Services used:                                         │
│  ├─ cloudinaryService.js — avatar upload/delete         │
│  ├─ haveIBeenPwnedService.js — breach check             │
│  ├─ geoService.js — IP geolocation                      │
│  ├─ mailer.js — email notifications                     │
│  ├─ sheetLogger.js — Google Sheets audit log            │
│  └─ cache.js — Redis caching for /me                    │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/userRoutes.js` (957 lines)

### Imports (lines 76-97)
```js
const express = require('express');
const bcrypt = require('bcryptjs');
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const Team = require('../models/Team');
const Project = require('../models/Project');
const { encrypt } = require('../utils/encryption');
const { sendZyncEmail } = require('../services/mailer');
const { appendRow } = require('../services/sheetLogger');
const { normalizeDoc, normalizeDocs } = require('../utils/normalize');
const { paginateArray, setPaginationHeaders } = require('../utils/pagination');
const { getNewUserRegistrationTemplate, getPhoneVerificationEmailHtml, getChatRequestEmailHtml, getAccountDeletionCodeEmailHtml } = require('../utils/emailTemplates');
const { deleteCloudinaryAsset } = require('../services/cloudinaryService');
const { checkPassword } = require('../services/haveIBeenPwnedService');
const { resolveIp } = require('../services/geoService');
const cache = require('../utils/cache');
```

### Helper: New User Alert Recipients (lines 99-108)
- Reads `NEW_USER_ALERT_RECIPIENTS` or `SUPPORT_RECIPIENTS` env var
- Comma-separated list of admin emails

### Helper: Detect New User Insert (lines 110-125)
- `wasUserInsertedFromUpsertResult(result)` — checks if MongoDB upsert created a new document
- Checks `lastErrorObject.upserted` or `lastErrorObject.updatedExisting === false`

### Helper: New User Notifications (lines 127-150)
- `dispatchNewUserNotifications({ displayName, email, uid })`
- Sends admin email via `sendZyncEmail()` with `getNewUserRegistrationTemplate`
- Logs to Google Sheets via `appendRow()`
- Both fire-and-forget (`.catch()` only logs errors)

### Helper: Phone Verification Email (lines 152-159)
- `sendVerificationEmail(email, code)` — sends OTP code via `getPhoneVerificationEmailHtml`

---

### Endpoint: POST /check-breached-password (lines 161-174)
- **Auth:** No verifyToken (called during signup before user exists)
- **Input:** `{ password: string }`
- **Logic:** Calls `checkPassword(password)` from HIBP service
- **Response:** `{ isBreached: boolean, count: number }` or 429 on rate limit

### Endpoint: GET /me (lines 176-201)
- **Auth:** verifyToken required
- **Cache:** Redis `user:me:{uid}` with 300s TTL
- **Query:** `User.findOne({ uid }).select('-githubIntegration.accessToken -deleteConfirmationCode ...')`
- **Also:** Fetches team info via `Team.find({ members: user.uid })`
- **Response:** `{ ...userDoc, teamId: teamInfo }`
- **Cache invalidation:** On sync, profile update, GitHub link, location update

### Endpoint: POST /sync (lines 203-316)
- **Auth:** verifyToken required
- **Input:** `{ uid?, email, displayName, photoURL, phoneNumber, firstName, lastName, timezone }`
- **Security:** UID from body must match `req.user.uid` (line 216-218)
- **Logic:**
  1. Check if user exists (`User.findOne({ uid })`)
  2. Derive `displayName` from email if not provided (line 230-232)
  3. Build `updateData` with provided fields + `status: 'online'`, `lastSeen: new Date()`
  4. `User.findOneAndUpdate({ uid }, { $set: updateData, $setOnInsert: { ... } }, { upsert: true, new: true })`
  5. If new user: `dispatchNewUserNotifications()` (admin email + Sheets log)
  6. If no country: `resolveIp(clientIp)` → async update `country`, `countryCode`, `city`
  7. Fetch team info
  8. Invalidate cache: `cache.invalidate('user:me:{uid}')`
- **Response:** `{ ...userDoc, teamId: teamInfo }`

### Endpoint: POST /sync-github (lines 318-366)
- **Auth:** verifyToken required
- **Input:** `{ accessToken, username, firebaseUid? }`
- **Logic:**
  1. `encrypt(accessToken)` — AES-256 encrypt GitHub token
  2. `User.findOneAndUpdate({ uid }, { $set: { githubIntegration: { connected: true, accessToken: encrypted, username, connectedAt } } })`
  3. Select excludes `accessToken` from response
  4. Invalidate cache
- **Response:** `{ message: "GitHub account linked successfully", user }`

### Endpoint: GET /detect-location (lines 369-403)
- **Auth:** verifyToken required
- **Logic:**
  1. Extract client IP from `x-forwarded-for` header or `req.ip`
  2. `resolveIp(clientIp)` — geo service lookup
  3. Update User with `country`, `countryCode`, `city`
  4. Invalidate cache
- **Response:** `{ country, countryCode, city, timezone? }`

### Endpoint: GET /search (lines 405-437)
- **Auth:** verifyToken required
- **Input:** `?query=<search term>`
- **Logic:**
  1. Case-insensitive regex search on `displayName`, `email`, `firstName`, `lastName`
  2. Excludes current user (`uid: { $ne: currentUserUid }`)
  3. Selects: `uid, displayName, email, photoURL, status, lastSeen, teamMemberships`
  4. Pagination via `paginateArray()` + `setPaginationHeaders()`
  5. Default limit 20, max 100
- **Response:** Array of user objects with pagination headers

### Endpoint: POST /chat-request (lines 439-491)
- **Auth:** verifyToken required
- **Input:** `{ recipientId, message }`
- **Logic:**
  1. Find sender and recipient
  2. Check for existing pending request from same sender
  3. Create `newRequest = { senderId, senderName, senderEmail, senderPhoto, message, status: 'pending', createdAt }`
  4. Append to `recipient.chatRequests` array
  5. Send email notification via `sendZyncEmail()` with `getChatRequestEmailHtml`
  6. Invalidate recipient cache
- **Response:** `{ message: "Chat request sent successfully" }`

### Endpoint: POST /chat-request/respond (lines 493-530+)
- **Auth:** verifyToken required
- **Input:** `{ senderId, status: 'accepted' | 'rejected' }`
- **Logic:**
  1. Find recipient and sender
  2. Update request status in `recipient.chatRequests`
  3. If accepted: add sender to `recipient.connections` and recipient to `sender.connections`
  4. Invalidate both caches
- **Response:** `{ message: "Chat request {status}" }`

---

## Frontend Trace

### useMe Hook
**File:** `src/hooks/useMe.ts`
- TanStack Query: `useQuery({ queryKey: ['user', 'me'], queryFn: () => fetch('/api/users/me', { headers: await getAuthHeaders() }) })`
- `staleTime: 60_000` (1 minute)
- Returns user profile data for the entire app

### use-user-sync Hook
**File:** `src/hooks/use-user-sync.ts`
- Triggered on `onAuthStateChanged` in App.tsx
- Calls `POST /api/users/sync` with Firebase user data
- Ensures MongoDB User record exists for every authenticated Firebase user

### SettingsView Component
**File:** `src/components/views/SettingsView.tsx` (94KB — largest component)
- Tabbed interface: Profile, Security, Integrations, Notifications, Account
- **Profile tab:** displayName, firstName, lastName, photoURL editing
- **Security tab:** Password breach check, security PIN
- **Integrations tab:** GitHub connect/disconnect, Google connect/disconnect, LinkedIn
- **Notifications tab:** FCM token registration, push notification preferences
- **Account tab:** Delete account with confirmation code

### ProfilePhotoCropper Component
**File:** `src/components/ProfilePhotoCropper.tsx` (12KB)
- Uses `react-easy-crop` for client-side cropping
- Crop area: circular, zoom controls
- Output: WebP format, compressed
- Upload: `POST /api/users/upload-photo` → Cloudinary
- On success: updates `useMe` query cache

### PeopleView Component
**File:** `src/components/views/PeopleView.tsx` (34KB)
- User search with debounced input
- Displays search results with avatar, name, status
- Send chat request button
- Pending/accepted/rejected request states

---

## Database Layer

### User Model (Mongoose)
**File:** `backend/models/User.js:78-141`

Key fields for profile management:
| Field | Type | Select | Notes |
|---|---|---|---|
| `uid` | String | yes | Firebase UID, unique |
| `email` | String | yes | Unique |
| `displayName` | String | yes | Default "User" |
| `firstName` | String? | yes | |
| `lastName` | String? | yes | |
| `photoURL` | String? | yes | Cloudinary URL |
| `phoneNumber` | String? | yes | |
| `connections` | String[] | yes | Firebase UIDs |
| `chatRequests` | Mixed | yes | Array of request objects |
| `githubIntegration` | Mixed | yes (excludes accessToken) | |
| `googleIntegration` | Mixed | yes (excludes refreshToken) | |
| `fcmTokens` | Array | yes | Push notification tokens |
| `country` | String? | yes | From IP geolocation |
| `countryCode` | String? | yes | |
| `city` | String? | yes | |
| `timezone` | String? | yes | |
| `securityPin` | String | **no** (select: false) | Hidden from queries |
| `status` | String | yes | online/offline/away |
| `lastSeen` | Date | yes | |

**Text Index:** `{ displayName: 'text', firstName: 'text', lastName: 'text' }`

---

## Caching Strategy

| Action | Cache Key | TTL | Invalidation |
|---|---|---|---|
| GET /me | `user:me:{uid}` | 300s | Invalidated on sync, profile update, GitHub link, location update, chat request |
| User search | None | — | Real-time query every time |

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | `{ message: "Unauthorized: No token provided" }` |
| UID mismatch in sync | 403 | `{ message: "Unauthorized: UID mismatch" }` |
| User not found | 404 | `{ message: "User not found" }` |
| Recipient not found | 404 | `{ message: "Recipient not found" }` |
| Duplicate chat request | 400 | `{ message: "Request already sent" }` |
| Invalid chat request status | 400 | `{ message: "Invalid status" }` |
| Password missing | 400 | `{ message: "Password is required" }` |
| HIBP rate limited | 429 | `{ message: error.message }` |
| Server error | 500 | `{ message: "Server error" }` |

---

## Environment Variables

| Variable | Required | Used By | Description |
|---|---|---|---|
| `NEW_USER_ALERT_RECIPIENTS` | No | `userRoutes.js:99-108` | Admin emails for new user alerts |
| `SUPPORT_RECIPIENTS` | No | `userRoutes.js:99-108` | Fallback for admin emails |
| `CLOUDINARY_CLOUD_NAME` | Yes | `cloudinaryService.js` | Avatar upload |
| `CLOUDINARY_API_KEY` | Yes | `cloudinaryService.js` | Avatar upload |
| `CLOUDINARY_API_SECRET` | Yes | `cloudinaryService.js` | Avatar upload |
| `MASTER_ENCRYPTION_KEY` | Yes | `encryption.js` | GitHub token encryption |

---

## Cross-References

- [08-firebase-auth-flow.md](./08-firebase-auth-flow.md) — Auth flow that precedes profile management
- [10-account-deletion-flow.md](./10-account-deletion-flow.md) — Account deletion deep dive
- [12-haveibeenpwned-integration.md](./12-haveibeenpwned-integration.md) — Password breach check
- [22-github-oauth-integration.md](./22-github-oauth-integration.md) — GitHub token sync
- [30-chat-request-flow.md](./30-chat-request-flow.md) — Chat request deep dive
- [48-cloudinary-upload-service.md](./48-cloudinary-upload-service.md) — Avatar upload pipeline
- [49-profile-photo-cropper.md](./49-profile-photo-cropper.md) — Photo cropper component
