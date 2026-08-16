# 31 — Team CRUD & Invites

**NEW document** — Team creation, invite codes, join/leave, ownership transfer, admin roles, member management, activity logs

---

## Feature Summary

Teams are collaborative groups in Zync. A team has an owner, admins, and members. Teams can be created with initial invites, joined via invite code, and managed through role-based permissions. Features include ownership transfer (requires security PIN), member promotion/demotion, activity logging, and team deletion.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  TeamsView.tsx                                          │
│  ├─ "My Teams" list (GET /api/teams/mine)               │
│  ├─ "Owned Teams" list (GET /api/teams/owned)           │
│  ├─ Create Team dialog (POST /api/teams/create)         │
│  └─ Join Team dialog (POST /api/teams/join)             │
│                                                         │
│  TeamDetail.tsx                                         │
│  ├─ Member list with roles (owner/admin/member)         │
│  ├─ Invite members (POST /api/teams/invite)             │
│  ├─ Remove member (DELETE /:teamId/members/:uid)        │
│  ├─ Promote/Demote admin                                │
│  ├─ Transfer ownership (requires PIN)                   │
│  ├─ Leave team (POST /:teamId/leave)                    │
│  ├─ Delete team (DELETE /:teamId, requires PIN)         │
│  ├─ Rename team (PATCH /:teamId/name)                   │
│  └─ Activity log (GET /:teamId/activity)                │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ROUTES ──────────────────────┐
│                                                         │
│  backend/routes/teamRoutes.js                           │
│                                                         │
│  GET    /owned                    → owned teams          │
│  GET    /mine                     → all user teams       │
│  POST   /create                   → create team          │
│  POST   /join                     → join via invite code │
│  DELETE /:teamId                  → delete team (PIN)    │
│  DELETE /:teamId/members/:uid     → remove member        │
│  POST   /invite                   → send invite email    │
│  POST   /:teamId/leave            → leave team           │
│  GET    /:teamId/details          → team details         │
│  POST   /:teamId/transfer-ownership → transfer (PIN)    │
│  PATCH  /:teamId/name             → rename team          │
│  POST   /:teamId/accept-member    → accept join request  │
│  POST   /:teamId/reject-member    → reject join request  │
│  POST   /:teamId/promote-admin    → promote to admin     │
│  POST   /:teamId/demote-admin     → demote to member     │
│  GET    /:teamId/activity         → activity logs        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/teamRoutes.js`

### GET /owned (lines 137-163)
- **Auth:** required
- **Logic:** `Team.find({ ownerUid: uid }).lean()`
- **Response:** Array of teams owned by user

### GET /mine (lines 166-192)
- **Auth:** required
- **Logic:** `Team.find({ $or: [{ ownerUid: uid }, { members: uid }, { admins: uid }] }).lean()`
- **Response:** All teams user is part of (owner, admin, or member)

### POST /create (lines 195-290)
- **Auth:** required
- **Input:** `{ name, type?, initialInvites?: string[] }`
- **Logic:**
  1. Generate invite code: `Math.random().toString(36).substring(2, 10).toUpperCase()`
  2. Create Team: `{ name, ownerUid: uid, members: [uid], inviteCode, type }`
  3. If `initialInvites`: send invite emails to each
  4. Create Activity log: "Team created"
- **Response:** Created team with invite code

### POST /join (lines 293-351)
- **Auth:** required
- **Input:** `{ inviteCode }`
- **Logic:**
  1. `Team.findOne({ inviteCode })`
  2. If not found: 404
  3. If already member: 400 "Already a member"
  4. If team requires approval: add to `pendingMembers` array
  5. If open: add to `members` array
  6. Create Activity log: "User joined"
- **Response:** Updated team

### DELETE /:teamId (lines 354-435)
- **Auth:** required
- **Input:** `{ pin }` — security PIN for deletion
- **Logic:**
  1. Find team, verify ownership
  2. Verify PIN: `team.pin === pin` (hashed comparison)
  3. Delete team
  4. Create Activity log: "Team deleted"
- **Response:** `{ message: "Team deleted" }`

### DELETE /:teamId/members/:memberUid (lines 438-513)
- **Auth:** required
- **Logic:**
  1. Find team, verify owner or admin
  2. Cannot remove owner
  3. Remove from `members` and `admins` arrays
  4. Create Activity log: "Member removed"
- **Response:** Updated team

### POST /invite (lines 516-576)
- **Auth:** required
- **Input:** `{ email }`
- **Logic:**
  1. Find team (from body or query)
  2. Send invite email with join link: `${FRONTEND_URL}/teams/join?code=${inviteCode}`
  3. Use `sendZyncEmail()` from mailer service
- **Response:** `{ message: "Invitation sent" }`

### POST /:teamId/leave (lines 579-654)
- **Auth:** required
- **Logic:**
  1. Find team
  2. If owner: cannot leave (must transfer ownership first)
  3. Remove from `members` and `admins`
  4. Create Activity log: "User left"
- **Response:** `{ message: "Left team" }`

### GET /:teamId/details (lines 657-731)
- **Auth:** required
- **Logic:**
  1. Find team
  2. Verify membership
  3. Populate member details (names, avatars from User model)
  4. Return full team details
- **Response:** Team with populated member info

### POST /:teamId/transfer-ownership (lines 734-777)
- **Auth:** required
- **Input:** `{ newOwnerId, pin }`
- **Logic:**
  1. Verify current ownership
  2. Verify PIN
  3. Verify `newOwnerId` is current member
  4. Set `ownerUid = newOwnerId`
  5. Demote old owner to admin
  6. Create Activity log: "Ownership transferred"
- **Response:** Updated team

### PATCH /:teamId/name (lines 780-843)
- **Auth:** required
- **Input:** `{ name }`
- **Logic:**
  1. Verify ownership or admin
  2. `Team.findByIdAndUpdate(teamId, { name })`
  3. Create Activity log: "Team renamed"
- **Response:** Updated team

### POST /:teamId/accept-member (lines 846-884)
- **Auth:** required (owner/admin)
- **Input:** `{ userId }`
- **Logic:** Move from `pendingMembers` to `members`
- **Response:** Updated team

### POST /:teamId/reject-member (lines 887-924)
- **Auth:** required (owner/admin)
- **Input:** `{ userId }`
- **Logic:** Remove from `pendingMembers`
- **Response:** Updated team

### POST /:teamId/promote-admin (lines 927-955)
- **Auth:** required (owner)
- **Input:** `{ userId }`
- **Logic:** Add to `admins` array
- **Response:** Updated team

### POST /:teamId/demote-admin (lines 958-982)
- **Auth:** required (owner)
- **Input:** `{ userId }`
- **Logic:** Remove from `admins` array
- **Response:** Updated team

### GET /:teamId/activity (lines 985+)
- **Auth:** required
- **Logic:** `Activity.find({ teamId }).sort({ createdAt: -1 }).limit(50).lean()`
- **Response:** Array of activity log entries

---

## Database Layer

### Team Model
**File:** `backend/models/Team.js`

| Field | Type | Required | Index | Notes |
|---|---|---|---|---|
| `name` | String | yes | — | Team name |
| `ownerUid` | String | yes | yes | Firebase UID of owner |
| `admins` | String[] | no | — | Array of admin UIDs |
| `members` | String[] | yes | — | Array of member UIDs (includes owner) |
| `pendingMembers` | String[] | no | — | Users awaiting approval |
| `inviteCode` | String | yes | unique | 8-char random code |
| `type` | String | no | — | Team category |
| `pin` | String | no | — | Hashed security PIN |
| `createdAt` | Date | auto | — | |

### Activity Model
**File:** `backend/models/Activity.js`

| Field | Type | Required | Notes |
|---|---|---|---|
| `teamId` | ObjectId | yes | Ref: Team |
| `action` | String | yes | e.g., "member_joined", "team_created" |
| `actorUid` | String | yes | Who performed the action |
| `targetUid` | String | no | Who was affected |
| `metadata` | Mixed | no | Additional context |
| `createdAt` | Date | auto | |

---

## Role Hierarchy

| Role | Permissions |
|---|---|
| **Owner** | Everything: delete, transfer, promote/demote, remove members, rename |
| **Admin** | Remove members, accept/reject join requests, rename |
| **Member** | View team, leave team |

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | Unauthorized |
| Team not found | 404 | `{ error: "Team not found" }` |
| Invalid invite code | 404 | `{ error: "Invalid invite code" }` |
| Already a member | 400 | `{ error: "Already a member" }` |
| Invalid PIN | 403 | `{ error: "Invalid PIN" }` |
| Not owner/admin | 403 | `{ error: "Unauthorized" }` |
| Owner cannot leave | 400 | `{ error: "Transfer ownership first" }` |
| Server error | 500 | `{ error: "Server error" }` |

---

## Cross-References

- [14-project-crud.md](./14-project-crud.md) — Projects can have team members
- [28-email-service-notifications.md](./28-email-service-notifications.md) — Team invite emails
- [05-database-schema-and-models.md](./05-database-schema-and-models.md) — Team + Activity models
