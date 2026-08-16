# 41 — Collaborator & Beta Application

**NEW document** — Beta application submission, GitHub profile validation, collaborator intake flow

---

## Feature Summary

The collaborator routes handle beta application submissions from users wanting to join the Zync platform. Applicants provide their GitHub username, profile URL, and email. The backend stores the application and notifies the team.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  BetaApplicationPage.tsx                                │
│  ├─ GitHub username input                               │
│  ├─ GitHub profile URL input                            │
│  ├─ Email input                                         │
│  └─ Submit → POST /api/collaborators                    │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  backend/routes/collaboratorRoutes.js                   │
│                                                         │
│  POST /  → submit beta application                      │
│                                                         │
│  Logic:                                                 │
│  1. Validate: githubUsername, githubProfileUrl, email   │
│  2. Check for duplicate (email or GitHub username)      │
│  3. Store application in DB                             │
│  4. Send notification email to admin                    │
│  5. Return success                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/collaboratorRoutes.js`

### POST / (line 94)
- **Auth:** not required (public endpoint for beta signups)
- **Input:** `{ githubUsername, githubProfileUrl, email }`
- **Logic:**
  1. Validate all fields present
  2. Check for duplicate: `Collaborator.findOne({ $or: [{ email }, { githubUsername }] })`
  3. If duplicate: 409 "Already applied"
  4. Create: `Collaborator.create({ githubUsername, githubProfileUrl, email, status: 'pending' })`
  5. Send admin notification email
- **Response:** `{ message: "Application submitted", id }`

---

## Database Layer

### Collaborator Model
| Field | Type | Required | Notes |
|---|---|---|---|
| `githubUsername` | String | yes | GitHub handle |
| `githubProfileUrl` | String | yes | Full GitHub URL |
| `email` | String | yes | Contact email |
| `status` | String | no | `pending`, `approved`, `rejected` |
| `reviewedAt` | Date | no | When admin reviewed |
| `createdAt` | Date | auto | |

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| Missing fields | 400 | `{ error: "All fields required" }` |
| Duplicate application | 409 | `{ error: "Already applied" }` |
| Server error | 500 | `{ error: "Server error" }` |

---

## Cross-References

- [28-email-service-notifications.md](./28-email-service-notifications.md) — Admin notification email
- [05-database-schema-and-models.md](./05-database-schema-and-models.md) — Collaborator model
