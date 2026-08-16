# 10 — Account Deletion Flow

**NEW document** — Email confirmation code, cascade cleanup, Firebase Auth deletion, Cloudinary asset cleanup

---

## Feature Summary

Account deletion is a two-step process: (1) request a 6-digit verification code via email, (2) confirm deletion with the code. The backend cascades cleanup across MongoDB (User, Team memberships), Cloudinary (profile photo), and Firebase Auth (user record).

---

## Architecture Diagram

```
┌─────────────────── FRONTEND (SettingsView) ───────────────┐
│                                                             │
│  Account tab → "Delete Account" section                     │
│                                                             │
│  Step 1: User clicks "Delete Account"                       │
│     └─ POST /api/users/delete/request                       │
│        └─ Backend generates 6-digit code                    │
│        └─ Stores code + 10min expiry on User document       │
│        └─ Sends email via Nodemailer with code              │
│        └─ Returns: "Verification code sent to email"        │
│                                                             │
│  Step 2: User enters code in confirmation dialog            │
│     └─ POST /api/users/delete/confirm                       │
│        └─ Verifies code matches + not expired               │
│        └─ Removes user from all Team.members arrays         │
│        └─ Deletes Cloudinary profile photo (if exists)      │
│        └─ Deletes User document from MongoDB                │
│        └─ Invalidates Redis cache                           │
│        └─ Deletes user from Firebase Auth                   │
│        └─ Returns: "User deleted successfully"              │
│                                                             │
│  Step 3: Frontend calls auth.signOut()                      │
│     └─ Clears TanStack Query cache                          │
│     └─ Redirects to /login                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Sequence Diagram

```
User          Frontend           Backend            Email(SMTP)    MongoDB    Cloudinary   Firebase
 │                │                  │                   │            │           │           │
 │ Click Delete   │                  │                   │            │           │           │
 │───────────────►│                  │                   │            │           │           │
 │                │ POST /delete/request                  │            │           │           │
 │                │─────────────────►│                   │            │           │           │
 │                │                  │ Generate code     │            │           │           │
 │                │                  │ Save to User doc  │            │           │           │
 │                │                  │──────────────────────────────►│           │           │
 │                │                  │ Send email        │            │           │           │
 │                │                  │──────────────────►│            │           │           │
 │                │ 200 OK           │                   │            │           │           │
 │                │◄─────────────────│                   │            │           │           │
 │ Enter code     │                  │                   │            │           │           │
 │───────────────►│                  │                   │            │           │           │
 │                │ POST /delete/confirm                  │            │           │           │
 │                │─────────────────►│                   │            │           │           │
 │                │                  │ Verify code+expiry │            │           │           │
 │                │                  │──────────────────────────────►│           │           │
 │                │                  │ Remove from Teams │            │           │           │
 │                │                  │──────────────────────────────►│           │           │
 │                │                  │ Delete photo      │            │           │           │
 │                │                  │──────────────────────────────────────────►│           │
 │                │                  │ Delete User doc   │            │           │           │
 │                │                  │──────────────────────────────►│           │           │
 │                │                  │ Invalidate cache  │            │           │           │
 │                │                  │ Delete from FB Auth            │           │           │
 │                │                  │──────────────────────────────────────────────────────►│
 │                │ 200 OK           │                   │            │           │           │
 │                │◄─────────────────│                   │            │           │           │
 │                │ auth.signOut()   │                   │            │           │           │
 │                │ Redirect /login  │                   │            │           │           │
 │◄───────────────│                  │                   │            │           │           │
```

---

## Backend Trace

### File: `backend/routes/userRoutes.js`

### Endpoint: POST /delete/request (lines 690-730)
- **Auth:** verifyToken required
- **Input:** `{ uid }` (from `req.user.uid`)
- **Logic:**
  1. Find user by UID
  2. Generate 6-digit code: `Math.floor(100000 + Math.random() * 900000).toString()`
  3. Store code + 10-minute expiry on User document:
     ```js
     await User.updateOne(
       { uid },
       { $set: {
           deleteConfirmationCode: code,
           deleteConfirmationExpired: new Date(Date.now() + 10 * 60 * 1000),
       } }
     );
     ```
  4. Send email via `sendZyncEmail()` with `getAccountDeletionCodeEmailHtml({ code })`
  5. Return 200: `{ message: 'Verification code sent to email' }`

### Endpoint: POST /delete/confirm (lines 732-804)
- **Auth:** verifyToken required
- **Input:** `{ uid, code }`
- **Security check:** `req.user.uid !== uid` → 403 (line 736-741)
- **Verification:**
  1. Find user by UID
  2. Check `user.deleteConfirmationCode !== code` → 400 "Invalid code"
  3. Check `user.deleteConfirmationExpired < new Date()` → 400 "Code expired"
- **Cascade cleanup:**
  1. **Teams:** Find all teams where user is a member, remove UID from `members` array
     ```js
     const teamsWithUser = await Team.find({ members: uid }).lean();
     for (const team of teamsWithUser) {
       await Team.updateOne(
         { _id: team._id },
         { $set: { members: team.members.filter((m) => m !== uid) } }
       );
     }
     ```
  2. **Cloudinary:** Delete profile photo if `user.photoURL` exists
     ```js
     if (user.photoURL) {
       try { await deleteCloudinaryAsset(user.photoURL); }
       catch (deleteError) { console.warn(...); }
     }
     ```
     - Non-blocking: failure is logged but doesn't prevent deletion
  3. **MongoDB:** Delete User document
     ```js
     await User.deleteOne({ uid });
     ```
  4. **Redis:** Invalidate cache
     ```js
     cache.invalidate(`user:me:${uid}`);
     ```
  5. **Firebase Auth:** Delete user from Firebase (non-blocking, error logged)
     ```js
     const { getAuth } = require('firebase-admin/auth');
     await getAuth().deleteUser(uid);
     ```
     - If Firebase deletion fails, MongoDB user is already deleted — user can no longer log in
- **Response:** 200 `{ message: 'User deleted successfully' }`

---

## Frontend Trace

### SettingsView — Account Tab
**File:** `src/components/views/SettingsView.tsx`
- "Delete Account" section in Account tab
- Step 1: Button triggers `POST /api/users/delete/request`
- Step 2: Dialog with 6-digit code input (uses `input-otp` component)
- Step 3: On confirm, calls `POST /api/users/delete/confirm`
- Step 4: On success, calls `signOutAndClearState(auth)` → redirect to `/login`

### OTP Input Component
**File:** `src/components/ui/` (Radix-based)
- Uses `input-otp` package for 6-digit code entry
- Auto-advances between digits
- Paste support

---

## Database Changes

### User Document — Deletion Fields
| Field | Type | Set During | Cleared After |
|---|---|---|---|
| `deleteConfirmationCode` | String | `/delete/request` | User deletion |
| `deleteConfirmationExpired` | DateTime | `/delete/request` (+10 min) | User deletion |

### Cascade Cleanup Summary
| Collection | Action | Blocking? |
|---|---|---|
| `users` | `deleteOne({ uid })` | Yes — must succeed |
| `teams` | Remove UID from `members` array | Yes — must succeed |
| Cloudinary | `deleteCloudinaryAsset(photoURL)` | No — failure logged, not fatal |
| Firebase Auth | `getAuth().deleteUser(uid)` | No — failure logged, not fatal |
| Redis cache | `cache.invalidate('user:me:{uid}')` | Yes — must succeed |

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | `{ message: "Unauthorized: No token provided" }` |
| UID mismatch (trying to delete another user) | 403 | `{ message: "Unauthorized" }` |
| User not found | 404 | `{ message: "User not found" }` |
| Wrong code | 400 | `{ message: "Invalid code" }` |
| Expired code (>10 min) | 400 | `{ message: "Code expired" }` |
| Cloudinary delete fails | — (logged) | Deletion continues |
| Firebase Auth delete fails | — (logged) | Deletion continues (MongoDB user already removed) |
| Server error | 500 | `{ message: "Server error" }` |

---

## Security Considerations

1. **UID verification:** `req.user.uid !== uid` check prevents deleting another user's account
2. **Email confirmation:** 6-digit code sent to user's email — prevents accidental deletion
3. **10-minute expiry:** Code expires after 10 minutes — prevents stale codes
4. **Non-blocking Firebase deletion:** If Firebase Auth deletion fails, MongoDB user is already gone — user cannot log in or access API
5. **Cloudinary cleanup:** Profile photo is deleted to prevent orphaned assets

---

## Environment Variables

| Variable | Required | Used By | Description |
|---|---|---|---|
| `SMTP_HOST` | Yes | `mailer.js` | Email sending for deletion code |
| `SMTP_PORT` | Yes | `mailer.js` | Email sending |
| `SMTP_USER` | Yes | `mailer.js` | Email sending |
| `SMTP_PASS` | Yes | `mailer.js` | Email sending |
| `CLOUDINARY_CLOUD_NAME` | Yes | `cloudinaryService.js` | Photo deletion |
| `CLOUDINARY_API_KEY` | Yes | `cloudinaryService.js` | Photo deletion |
| `CLOUDINARY_API_SECRET` | Yes | `cloudinaryService.js` | Photo deletion |

---

## Cross-References

- [09-user-profile-management.md](./09-user-profile-management.md) — Parent profile management
- [08-firebase-auth-flow.md](./08-firebase-auth-flow.md) — Firebase Auth user deletion
- [48-cloudinary-upload-service.md](./48-cloudinary-upload-service.md) — Cloudinary asset deletion
- [41-team-crud-and-invites.md](./41-team-crud-and-invites.md) — Team member removal on deletion
