# 42 — Support Ticket System

**NEW document** — Support request submission, email notification to admin, user contact form

---

## Feature Summary

The support routes handle user support requests. Users submit a message (with optional email and name), and the backend sends an email notification to the Zync support team. No authentication required — accessible to all users.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  SupportPage.tsx                                        │
│  ├─ Name input                                          │
│  ├─ Email input                                         │
│  ├─ Subject input                                       │
│  ├─ Message textarea                                    │
│  └─ Submit → POST /api/support                          │
│                                                         │
│  Footer link → Support page                             │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  backend/routes/supportRoutes.js                        │
│                                                         │
│  POST /  → submit support request                       │
│                                                         │
│  Logic:                                                 │
│  1. Validate: name, email, subject, message             │
│  2. Build email HTML template                           │
│  3. sendZyncEmail(SUPPORT_EMAIL, subject, html)         │
│  4. Return success                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/supportRoutes.js`

### POST / (line 93)
- **Auth:** not required
- **Input:** `{ name, email, subject, message }`
- **Logic:**
  1. Validate all fields present
  2. Build HTML email:
     ```html
     <h2>New Support Request</h2>
     <p><strong>From:</strong> {name} ({email})</p>
     <p><strong>Subject:</strong> {subject}</p>
     <p><strong>Message:</strong></p>
     <p>{message}</p>
     ```
  3. `sendZyncEmail(process.env.SUPPORT_EMAIL, subject, html)`
  4. Return `{ message: "Support request sent" }`

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| Missing fields | 400 | `{ error: "All fields required" }` |
| Email send fails (auth) | 200 | Still returns success (fail-open) |
| Email send fails (network) | 500 | `{ error: "Failed to send request" }` |
| Server error | 500 | `{ error: "Server error" }` |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPPORT_EMAIL` | Yes | Email address to receive support requests |

---

## Cross-References

- [28-email-service-notifications.md](./28-email-service-notifications.md) — Email service used for sending
