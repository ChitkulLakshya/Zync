# 05 — Database Schema & Models

**NEW document** — Complete reference for Prisma schema + Mongoose ODM models

---

## Feature Summary

Zync uses a **dual-ORM architecture** over a single MongoDB Atlas instance. **Prisma** handles relational-style queries (Projects, Teams, Users with relations and cascading deletes) while **Mongoose** handles flexible document data (Chat, Notes, AI blobs, Sessions). Both ORMs connect to the same MongoDB cluster via `MONGO_URI`.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Atlas (Primary)                    │
│                                                              │
│  Collections (shared by Prisma + Mongoose):                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  users   │ │ projects │ │  steps   │ │projecttasks│      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  notes   │ │ folders  │ │ meetings │ │ sessions │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ messages │ │  teams   │ │repositories│ │ activity │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  Indexes:                                                    │
│  users: text(displayName, firstName, lastName)               │
│  projects: ownerId, ownerUid, team                           │
│  messages: (chatId, createdAt), (receiverId, delivered),     │
│            (receiverId, createdAt)                           │
│  projecttasks: assignedTo, status                            │
│  sessions: userId, (userId, date)                            │
└─────────────────────────────────────────────────────────────┘
         ▲                                    ▲
         │                                    │
┌────────┴───────────┐              ┌────────┴──────────────┐
│     PRISMA 5        │              │     MONGOOSE 9         │
│  (Relational ORM)   │              │  (Flexible ODM)        │
│                     │              │                        │
│  schema.prisma      │              │  models/*.js           │
│  Generated client   │              │  13 model files        │
│  Type-safe queries  │              │  Middleware, hooks     │
│  Cascade deletes    │              │  Schema validation     │
│  Relations:         │              │                        │
│   User→Projects     │              │  Used for:             │
│   Project→Steps     │              │   Chat, Notes, AI,     │
│   Step→Tasks        │              │   Sessions, Messages,  │
│                     │              │   Activity, Folders    │
│  Used for:          │              │                        │
│   Projects, Teams,  │              │                        │
│   Users, Steps,     │              │                        │
│   Tasks, Repos      │              │                        │
└─────────────────────┘              └────────────────────────┘
```

---

## Prisma Schema

**File:** `backend/prisma/schema.prisma:1-306`

### Generator & Datasource
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "./generated/client"
}

datasource db {
  provider = "mongodb"
  url      = env("MONGO_URI")
}
```

### Model: User (Prisma)
**Lines 12-57**
| Field | Type | Attributes | Notes |
|---|---|---|---|
| `id` | String | @id, @default(auto()), @db.ObjectId | Primary key |
| `uid` | String | @unique | Firebase UID — universal join key |
| `email` | String | @unique | User email |
| `displayName` | String | @default("User") | Display name |
| `firstName` | String? | | Optional first name |
| `lastName` | String? | | Optional last name |
| `photoURL` | String? | | Avatar URL (Cloudinary) |
| `phoneNumber` | String? | | Phone number |
| `connections` | String[] | @default([]) | Firebase UIDs of connections |
| `closeFriends` | String[] | @default([]) | Firebase UIDs of close friends |
| `chatRequests` | Json | @default("[]") | Array of request objects |
| `githubIntegration` | Json? | | `{ connected, accessToken, username, installationId, connectedAt }` |
| `googleIntegration` | Json? | | `{ connected, refreshToken, calendarId, connectedAt }` |
| `isPhoneVerified` | Boolean | @default(false) | Phone OTP status |
| `phoneVerificationCode` | String? | | OTP code |
| `phoneVerificationCodeExpired` | DateTime? | | OTP expiry |
| `deleteConfirmationCode` | String? | | Account deletion code |
| `deleteConfirmationExpires` | DateTime? | | Deletion code expiry |
| `status` | String | @default("offline") | online, offline, away |
| `lastSeen` | DateTime | @default(now()) | Last activity timestamp |
| `role` | String | @default("user") | user or admin |
| `ownedProjects` | Project[] | @relation("ProjectOwner") | Projects owned by user |
| `teamMemberships` | String[] | @default([]) | Team IDs |
| `createdAt` | DateTime | @default(now()) | |
| `updatedAt` | DateTime | @updatedAt | |

**Collection:** `users`

### Model: Project (Prisma)
**Lines 60-91**
| Field | Type | Attributes | Notes |
|---|---|---|---|
| `id` | String | @id, @default(auto()), @db.ObjectId | Primary key |
| `name` | String | required | Project name |
| `description` | String | required | Project description |
| `ownerId` | String | @db.ObjectId | FK to User |
| `owner` | User | @relation("ProjectOwner") | Owner relation |
| `team` | String[] | @default([]) | Firebase UIDs of team members |
| `githubRepo` | String? | | Linked repo URL |
| `githubRepoName` | String? | | Repo name |
| `githubRepoOwner` | String? | | Repo owner |
| `githubRepoIds` | String[] | @default([]) | Multiple repo IDs |
| `architecture` | Json? | | AI-generated architecture blob |
| `meetLink` | String? | | Google Meet link |
| `isTrackingActive` | Boolean | @default(false) | Activity tracking flag |
| `steps` | Step[] | @relation | Steps in this project |
| `createdAt` | DateTime | @default(now()) | |
| `updatedAt` | DateTime | @updatedAt | |

**Collection:** `projects`
**Cascade:** `onDelete: Cascade` from User → Project

### Model: Step (Prisma)
**Lines 94-116**
| Field | Type | Attributes | Notes |
|---|---|---|---|
| `id` | String | @id, @default(auto()), @db.ObjectId | Primary key |
| `title` | String | required | Step title |
| `description` | String? | | Optional description |
| `order` | Int | @default(0) | Sort order |
| `status` | String | @default("Pending") | Pending, Backlog, In Progress, Completed, Done |
| `assignedTo` | String? | | Firebase UID |
| `type` | String | @default("Other") | Frontend, Backend, Database, Design, Other |
| `page` | String | @default("General") | Page/category |
| `projectId` | String | @db.ObjectId | FK to Project |
| `project` | Project | @relation | Project relation |
| `tasks` | ProjectTask[] | @relation | Tasks in this step |
| `createdAt` | DateTime | @default(now()) | |
| `updatedAt` | DateTime | @updatedAt | |

**Collection:** `steps`
**Cascade:** `onDelete: Cascade` from Project → Step

### Model: ProjectTask (Prisma)
**Lines 119-152**
| Field | Type | Attributes | Notes |
|---|---|---|---|
| `id` | String | @id, @default(auto()), @db.ObjectId | Primary key |
| `displayId` | String? | @unique | Human-readable ID like "TASK-42" |
| `title` | String | required | Task title |
| `description` | String? | | Optional description |
| `status` | String | @default("Backlog") | Pending, Backlog, Ready, In Progress, Active, In Review, Completed, Done |
| `assignedTo` | String? | | Firebase UID |
| `assignedToName` | String? | | Display name |
| `createdBy` | String? | | Firebase UID of creator |
| `assignedBy` | String? | | Firebase UID or name |
| `commitMessage` | String? | | Linked GitHub commit message |
| `commitUrl` | String? | | Linked commit URL |
| `commitAuthor` | String? | | Commit author |
| `commitTimestamp` | DateTime? | | Commit time |
| `repoIds` | String[] | @default([]) | Linked GitHub repos |
| `stepId` | String | @db.ObjectId | FK to Step |
| `step` | Step | @relation | Step relation |
| `createdAt` | DateTime | @default(now()) | |
| `updatedAt` | DateTime | @updatedAt | |

**Collection:** `projecttasks`
**Indexes:** `@@index([assignedTo])`, `@@index([status])`
**Cascade:** `onDelete: Cascade` from Step → ProjectTask

### Model: Repository (Prisma)
**Lines 155-164**
| Field | Type | Attributes | Notes |
|---|---|---|---|
| `id` | String | @id, @default(auto()), @db.ObjectId | Primary key |
| `githubRepoId` | String | @unique | GitHub repo ID |
| `repoName` | String | required | Repo name |
| `createdAt` | DateTime | @default(now()) | |
| `updatedAt` | DateTime | @updatedAt | |

**Collection:** `repositories`

### Model: Note (Prisma)
**Lines 167-184**
| Field | Type | Attributes | Notes |
|---|---|---|---|
| `id` | String | @id, @default(auto()), @db.ObjectId | Primary key |
| `title` | String | @default("Untitled") | Note title |
| `content` | Json? | | Block-editor rich-text content |
| `ownerId` | String | required | Firebase UID |
| `folderId` | String? | | FK to Folder |
| `projectId` | String? | | Optional project link |
| `sharedWith` | String[] | @default([]) | Firebase UIDs |
| `yjsState` | Bytes? | | Yjs collaborative binary state |
| `createdAt` | DateTime | @default(now()) | |
| `updatedAt` | DateTime | @updatedAt | |

**Collection:** `notes`

### Model: Folder (Prisma)
**Lines 187-206**
| Field | Type | Attributes | Notes |
|---|---|---|---|
| `id` | String | @id, @default(auto()), @db.ObjectId | Primary key |
| `name` | String | required | Folder name |
| `ownerId` | String | required | Firebase UID |
| `parentId` | String? | | Self-referential (null = root) |
| `type` | String | @default("personal") | personal, team, project |
| `color` | String | @default("#FFFFFF") | Folder color |
| `projectId` | String? | | Optional project link |
| `collaborators` | String[] | @default([]) | Firebase UIDs |
| `createdAt` | DateTime | @default(now()) | |
| `updatedAt` | DateTime | @updatedAt | |

**Collection:** `folders`
**Unique constraint:** `@@unique([ownerId, parentId, name])` — no duplicate folder names under same parent

### Model: Meeting (Prisma)
**Lines 209-232**
| Field | Type | Attributes | Notes |
|---|---|---|---|
| `id` | String | @id, @default(auto()), @db.ObjectId | Primary key |
| `title` | String | @default("Untitled Meeting") | Meeting title |
| `description` | String? | | Optional description |
| `organizerId` | String | required | Firebase UID |
| `organizerName` | String? | | Organizer display name |
| `meetLink` | String | required | Google Meet URL |
| `projectId` | String? | | Optional project link |
| `status` | String | @default("scheduled") | scheduled, live, ended, cancelled |
| `startTime` | DateTime | @default(now()) | Meeting start |
| `endTime` | DateTime? | | Meeting end (null = ongoing) |
| `participants` | Json | @default("[]") | Array of `{ uid, email, name, status }` |
| `createdAt` | DateTime | @default(now()) | |
| `updatedAt` | DateTime | @updatedAt | |

**Collection:** `meetings`

### Model: Session (Prisma)
**Lines 235-254**
| Field | Type | Attributes | Notes |
|---|---|---|---|
| `id` | String | @id, @default(auto()), @db.ObjectId | Primary key |
| `userId` | String | required | Firebase UID |
| `startTime` | DateTime | @default(now()) | Session start |
| `endTime` | DateTime | @default(now()) | Session end |
| `duration` | Int | @default(0) | Total seconds |
| `activeDuration` | Int | @default(0) | Active seconds (excluding idle) |
| `lastAction` | DateTime | @default(now()) | Last user action |
| `date` | String | required | YYYY-MM-DD for grouping |
| `deviceInfo` | String? | | Device metadata |
| `createdAt` | DateTime | @default(now()) | |

**Collection:** `sessions`
**Indexes:** `@@index([userId])`, `@@index([userId, date])`

### Model: Message (Prisma)
**Lines 257-288**
| Field | Type | Attributes | Notes |
|---|---|---|---|
| `id` | String | @id, @default(auto()), @db.ObjectId | Primary key |
| `chatId` | String | required | Deterministic: sorted `<uid1>_<uid2>` |
| `text` | String? | | Message text (null if file-only) |
| `senderId` | String | required | Firebase UID |
| `senderName` | String | required | Display name |
| `senderPhotoURL` | String? | | Avatar URL |
| `receiverId` | String | required | Firebase UID |
| `type` | String | @default("text") | text, image, file, project-invite, request |
| `fileUrl` | String? | | File URL (Cloudinary) |
| `fileName` | String? | | File name |
| `fileSize` | Int? | | File size in bytes |
| `projectId` | String? | | For project-invite type |
| `projectName` | String? | | For project-invite type |
| `projectOwnerId` | String? | | For project-invite type |
| `seen` | Boolean | @default(false) | Read receipt |
| `seenAt` | DateTime? | | Read timestamp |
| `delivered` | Boolean | @default(false) | Delivery receipt |
| `deliveredAt` | DateTime? | | Delivery timestamp |
| `createdAt` | DateTime | @default(now()) | |

**Collection:** `messages`
**Indexes:** `@@index([chatId, createdAt])`, `@@index([receiverId, delivered])`, `@@index([receiverId, createdAt])`

### Model: Team (Prisma)
**Lines 291-305**
| Field | Type | Attributes | Notes |
|---|---|---|---|
| `id` | String | @id, @default(auto()), @db.ObjectId | Primary key |
| `name` | String | required | Team name |
| `inviteCode` | String | @unique | Invite code for joining |
| `ownerId` | String | required | Firebase UID of owner |
| `members` | String[] | @default([]) | Firebase UIDs |
| `type` | String | @default("Other") | Product, Engineering, Management, Marketing, Sales, Design, Other |
| `createdAt` | DateTime | @default(now()) | |
| `updatedAt` | DateTime | @updatedAt | |

**Collection:** `teams`

---

## Mongoose Models

### Mongoose Model Registry
**File:** `backend/models/index.js:76-88`
Exports all 11 Mongoose models:
```js
module.exports = {
  User:        require('./User'),
  Project:     require('./Project'),
  Step:        require('./Step'),
  ProjectTask: require('./ProjectTask'),
  Repository:  require('./Repository'),
  Note:        require('./Note'),
  Folder:      require('./Folder'),
  Meeting:     require('./Meeting'),
  Session:     require('./Session'),
  Team:        require('./Team'),
  Message:     require('./Message'),
};
```

### Mongoose User Model (extended fields)
**File:** `backend/models/User.js:78-141`

The Mongoose User schema mirrors Prisma but adds these extra fields not in Prisma:
| Field | Type | Default | Notes |
|---|---|---|---|
| `fcmTokens` | Array<{token, platform, updatedAt}> | [] | Push notification tokens |
| `timezone` | String | null | User timezone |
| `country` | String | null | User country |
| `countryCode` | String | null | Country code |
| `city` | String | null | User city |
| `securityPin` | String | (select: false) | Hidden from queries by default |
| `welcomeNotificationSent` | Boolean | false | Welcome notification flag |

**Text Index:** `userSchema.index({ displayName: 'text', firstName: 'text', lastName: 'text' })` — enables full-text search on user names

### Mongoose Project Model (extended webhook fields)
**File:** `backend/models/Project.js:78-130`

Extra fields in Mongoose not in Prisma:
| Field | Type | Default | Notes |
|---|---|---|---|
| `architectureCacheKey` | String | null | Redis cache key for architecture |
| `architectureAnalyzedAt` | Date | null | Last architecture analysis time |
| `lastWebhookEventAt` | Date | null | Last GitHub webhook timestamp |
| `lastWebhookCommitCount` | Number | 0 | Commits in last webhook |
| `lastWebhookCommitShas` | String[] | [] | SHA list from last webhook |
| `lastWebhookChangedFiles` | String[] | [] | Changed files from last webhook |
| `lastWebhookPusher` | String | null | Who pushed |
| `lastWebhookDeliveryId` | String | null | GitHub delivery ID |
| `lastWebhookAiSummary` | String | null | AI-generated commit summary |
| `lastWebhookAiTaskMentions` | Number | 0 | Tasks mentioned in AI analysis |
| `lastWebhookAiAnalyzedCommits` | Number | 0 | Commits analyzed by AI |

**Indexes:** `ownerId`, `ownerUid`, `team`

### Mongoose Message Model
**File:** `backend/models/Message.js:78-117`

Key difference from Prisma: Mongoose version has `timestamps: { createdAt: 'createdAt', updatedAt: false }` — no updatedAt field.

**Indexes:**
- `{ chatId: 1, createdAt: 1 }` — chronological message fetch
- `{ receiverId: 1, delivered: 1 }` — offline message delivery
- `{ receiverId: 1, createdAt: -1 }` — recent messages for a user

---

## Dual-ORM Strategy

### When Prisma is Used
Prisma is used in route files that need:
- Relational queries with `include` (e.g., Project → Steps → Tasks)
- Cascade deletes (User → Projects → Steps → Tasks)
- Type-safe query results
- Complex filtering with `where` clauses

**Files using Prisma:**
- `backend/routes/projectRoutes.js` — project CRUD with steps
- `backend/routes/teamRoutes.js` — team management
- `backend/routes/userRoutes.js` — user profile
- `backend/routes/taskRoutes.js` — task operations
- `backend/utils/projectHelper.js` — project utilities

### When Mongoose is Used
Mongoose is used in route files that need:
- Flexible/unstructured data (chat requests, AI blobs)
- Schema middleware/hooks (pre-save validation)
- Text search (user name search)
- Lean queries for performance

**Files using Mongoose:**
- `backend/routes/chatRoutes.js` — message persistence
- `backend/routes/noteRoutes.js` — note CRUD
- `backend/routes/sessionRoutes.js` — activity tracking
- `backend/sockets/chatSocketHandler.js` — real-time chat
- `backend/sockets/noteSocketHandler.js` — Yjs state persistence

### Connection Management
**File:** `backend/index.js:76-87`
- Mongoose connects via `mongoose.connect(MONGO_URI)` at server startup
- Prisma client is instantiated from `backend/prisma/generated/client/`
- Both share the same `MONGO_URI` env var
- Connection pooling: Mongoose default 5, Prisma default

---

## Query Patterns

### Prisma Query Example (Project with Steps and Tasks)
```js
const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: {
    steps: {
      orderBy: { order: 'asc' },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    },
  },
});
```

### Mongoose Query Example (Chat Messages)
```js
const messages = await Message.find({ chatId })
  .sort({ createdAt: 1 })
  .limit(50)
  .lean();
```

### Mongoose Text Search (User Search)
```js
const users = await User.find(
  { $text: { $search: query } },
  { score: { $meta: 'textScore' } }
).sort({ score: { $meta: 'textScore' } }).limit(10);
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB Atlas connection string |

---

## Cross-References

- [01-tech-stack-overview.md](./01-tech-stack-overview.md) — Prisma + Mongoose package versions
- [14-project-crud-lifecycle.md](./14-project-crud-lifecycle.md) — Project queries with Prisma
- [26-instant-chat-system.md](./26-instant-chat-system.md) — Message model usage
- [31-realtime-notes-editor.md](./31-realtime-notes-editor.md) — Note model + Yjs state
- [59-activity-tracking-system.md](./59-activity-tracking-system.md) — Session model queries
