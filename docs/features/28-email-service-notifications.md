# 28 — Email Service & Notifications

**NEW document** — SMTP email wrapper, task assignment emails, account deletion verification, error handling for auth failures

---

## Feature Summary

The email service provides a centralized wrapper around Google Meet/Gmail SMTP for sending transactional emails. Used for task assignment notifications, account deletion verification codes, and other system notifications. Features graceful degradation on authentication failures (returns null instead of crashing).

---

## Architecture Diagram

```
┌─────────────────── BACKEND ─────────────────────────────┐
│                                                         │
│  backend/services/mailer.js (99 lines)                  │
│  ├─ sendZyncEmail(to, subject, html, text?)             │
│  │   ├─ Calls googleMeet.send_ZYNC_email()              │
│  │   ├─ On EAUTH/401: log + return null (no crash)      │
│  │   └─ On other error: re-throw to caller              │
│  │                                                      │
│  backend/services/googleMeet.js                         │
│  ├─ send_ZYNC_email(to, subject, html, text?)           │
│  ├─ Uses nodemailer with Gmail SMTP                     │
│  ├─ Auth: OAuth2 or user/pass (env vars)                │
│  └─ Returns { messageId, response }                     │
│                                                         │
│  Email Templates:                                       │
│  ├─ backend/utils/emailTemplates.js                     │
│  │   ├─ getTaskAssignmentEmailHtml(task, project, user) │
│  │   ├─ getDeleteVerificationEmailHtml(code, name)      │
│  │   └─ getChatRequestEmailHtml(sender, message)        │
│  │                                                      │
│  Callers:                                               │
│  ├─ projectRoutes.js → task assignment email            │
│  ├─ userRoutes.js → account deletion verification       │
│  └─ userRoutes.js → chat request notification           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/services/mailer.js` (99 lines)

### sendZyncEmail (lines 83-96)
```js
const sendZyncEmail = async (to, subject, html, text) => {
  try {
    const result = await send_ZYNC_email(to, subject, html, text);
    return result;
  } catch (error) {
    if (error.code === 'EAUTH' || (error.response && error.response.status === 401)) {
      console.error('Email Authentication Failed (Bad Credentials). Email was NOT sent.');
      return null;
    }
    console.error('Error sending email:', error);
    throw error;
  }
};
```

### Error Handling Strategy

| Error Type | Behavior | Reason |
|---|---|---|
| `EAUTH` (bad credentials) | Log + return `null` | Admin needs to fix SMTP creds; app continues |
| HTTP 401 | Log + return `null` | Same as EAUTH |
| Network error | Re-throw | Caller decides how to handle |
| Other errors | Re-throw | Caller decides how to handle |

**Philosophy:** Email is non-critical. If SMTP is broken, the app should still function. Callers check for `null` return and continue without failing the user-facing operation.

---

## Email Templates

### File: `backend/utils/emailTemplates.js`

### getTaskAssignmentEmailHtml(task, project, user)
- **Subject:** "New Task Assigned: {task.title}"
- **Content:** Task title, description, project name, assigner name, link to task
- **Called by:** `projectRoutes.js` POST `/:projectId/steps/:stepId/tasks`

### getDeleteVerificationEmailHtml(code, name)
- **Subject:** "Confirm Your Account Deletion — Zync"
- **Content:** 6-digit verification code, user name, warning text, expiry notice
- **Called by:** `userRoutes.js` POST `/delete/request`

### getChatRequestEmailHtml(sender, message)
- **Subject:** "New Chat Request from {sender.name}"
- **Content:** Sender name, avatar, message, accept/decline links
- **Called by:** `userRoutes.js` POST `/chat-request`

---

## Usage in Routes

### Task Assignment Email
**File:** `backend/routes/projectRoutes.js`
```js
const { sendZyncEmail } = require('../services/mailer');
const { getTaskAssignmentEmailHtml } = require('../utils/emailTemplates');

// After task creation with assignment:
if (assignedTo && assignedToEmail) {
  const html = getTaskAssignmentEmailHtml(task, project, assignerName);
  await sendZyncEmail(assignedToEmail, 'New Task Assigned', html);
}
```
- Non-blocking: email failure doesn't prevent task creation
- `sendZyncEmail` returns `null` on auth failure — caller ignores

### Account Deletion Verification
**File:** `backend/routes/userRoutes.js`
```js
const verificationCode = Math.floor(100000 + Math.random() * 900000);
const html = getDeleteVerificationEmailHtml(verificationCode, user.displayName);
await sendZyncEmail(user.email, 'Confirm Account Deletion', html);
```
- 6-digit random code stored in DB with 10-minute expiry
- Email sent to user's registered email

---

## Database Layer

Email addresses are stored on the User model:
- `User.email` — primary email (from Firebase Auth)
- `User.displayName` — used in email greetings

No separate email log model — emails are fire-and-forget.

---

## Error Paths

| Scenario | Handling | User Impact |
|---|---|---|
| SMTP auth failure | `null` returned | No email sent, operation succeeds |
| Network timeout | Error re-thrown | Caller catches, operation may fail |
| Invalid email address | Error from nodemailer | Caller catches |
| Template rendering error | Error re-thrown | Caller catches |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SMTP_USER` | Yes | Gmail/SMTP email address |
| `SMTP_PASS` | Yes | Gmail app password or OAuth token |
| `SMTP_SERVICE` | No | Default: `gmail` |
| `FRONTEND_URL` | Yes | Used for links in email templates |

---

## Cross-References

- [10-account-deletion-flow.md](./10-account-deletion-flow.md) — Verification email
- [16-task-management.md](./16-task-management.md) — Task assignment email
- [09-user-profile-management.md](./09-user-profile-management.md) — Chat request email
- [04-service-inventory.md](./04-service-inventory.md) — SMTP service listing
