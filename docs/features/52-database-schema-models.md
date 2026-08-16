# 52 — Database Schema & Models

**NEW document** — Mongoose models overview, schema definitions, indexes, relationships, dual ORM strategy

---

## Feature Summary

Zync uses MongoDB with Mongoose as the primary ODM. All models are defined in `backend/models/` with explicit schemas, indexes, and validation. The database stores users, projects, tasks, steps, notes, folders, messages, teams, sessions, meetings, activities, and collaborators.

---

## Model Inventory

| Model | File | Collection | Purpose |
|---|---|---|---|
| User | `User.js` | users | User profiles, integrations, settings |
| Project | `Project.js` | projects | Project metadata, GitHub repo link |
| Step | `Step.js` | steps | Kanban pipeline stages |
| ProjectTask | `ProjectTask.js` | projecttasks | Tasks within project steps |
| Note | `Note.js` | notes | Rich text notes |
| Folder | `Folder.js` | folders | Note organization, sharing |
| Message | `Message.js` | messages | Chat messages |
| Team | `Team.js` | teams | Team groups, roles, invites |
| Activity | `Activity.js` | activities | Team activity logs |
| Session | `Session.js` | sessions | Work/meeting sessions |
| Meeting | `Meeting.js` | meetings | Google Meet meetings |
| Collaborator | `Collaborator.js` | collaborators | Beta applications |

---

## Key Schema Details

### User Model
```
{
  uid: String (Firebase UID, primary key),
  email: String (unique, indexed),
  displayName: String,
  photoURL: String,
  bio: String,
  location: { city, country, lat, lng, timezone, manual },
  githubIntegration: { connected, accessToken (encrypted), username, installationId },
  googleIntegration: { connected, accessToken (encrypted), refreshToken, expiryDate },
  linkedinIntegration: { connected, profileUrl },
  securityPin: String (hashed),
  createdAt, updatedAt
}
```
**Indexes:** `email` (unique), `uid` (unique), `displayName` (text)

### Project Model
```
{
  name: String,
  description: String,
  ownerUid: String (indexed),
  team: [String] (member UIDs),
  githubRepoId: Number,
  githubRepoName: String,
  githubRepoOwner: String,
  githubDefaultBranch: String,
  steps: [ObjectId] (ref: Step),
  createdAt, updatedAt
}
```
**Indexes:** `ownerUid`, `team`

### Message Model
```
{
  chatId: String (format: uidA_uidB, indexed),
  senderId: String (indexed),
  receiverId: String (indexed),
  text: String,
  type: String (text/image/file),
  fileUrl, fileName, fileSize,
  senderName, senderPhotoURL,
  projectId, projectName, projectOwnerId,
  delivered: Boolean,
  deliveredAt: Date,
  seen: Boolean,
  seenAt: Date,
  createdAt
}
```
**Indexes:** `{ chatId: 1, createdAt: 1 }`, `{ receiverId: 1, seen: 1 }`, `{ receiverId: 1, delivered: 1 }`

### Note Model
```
{
  title: String,
  content: String (rich text HTML),
  ownerId: String (indexed),
  folderId: ObjectId (ref: Folder),
  projectId: ObjectId (ref: Project),
  sharedWith: [String],
  isPublic: Boolean,
  createdAt, updatedAt
}
```

### Team Model
```
{
  name: String,
  ownerUid: String (indexed),
  admins: [String],
  members: [String],
  pendingMembers: [String],
  inviteCode: String (unique),
  type: String,
  pin: String (hashed),
  createdAt
}
```

---

## Index Strategy

### Compound Indexes
- Message: `{ chatId: 1, createdAt: 1 }` — efficient history queries
- Message: `{ receiverId: 1, seen: 1 }` — unread count queries
- Message: `{ receiverId: 1, delivered: 1 }` — delivery catch-up queries

### Text Indexes
- User: `{ displayName: 'text', email: 'text' }` — user search

### Unique Indexes
- User: `email`, `uid`
- Team: `inviteCode`

---

## Cross-References

- [03-performance-caching-strategy.md](./03-performance-caching-strategy.md) — Redis caching on top of MongoDB
- [05-database-schema-and-models.md](./05-database-schema-and-models.md) — Original schema doc
- All feature docs reference their respective models
