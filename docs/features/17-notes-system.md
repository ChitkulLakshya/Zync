# 17 — Notes System

**NEW document** — Note CRUD, rich text editing, sharing, folder organization, project-scoped notes

---

## Feature Summary

Notes are rich text documents that users can create, edit, share, and organize into folders. Notes can be standalone or associated with a project. The system supports real-time collaborative editing via Socket.IO, with notes stored in MongoDB.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  NotesView.tsx                                          │
│  ├─ Sidebar: Folder tree + note list                    │
│  ├─ Editor: TipTap / Lexical rich text editor           │
│  ├─ Share dialog: add collaborators by UID              │
│  └─ Project notes tab (when in project workspace)       │
│                                                         │
│  Hooks:                                                 │
│  ├─ useNotes.ts — list notes (TanStack Query)           │
│  ├─ useNote.ts — single note with real-time sync        │
│  ├─ useCreateNote.ts — create mutation                  │
│  ├─ useUpdateNote.ts — update mutation                  │
│  └─ useDeleteNote.ts — delete mutation                  │
│                                                         │
│  Real-time:                                             │
│  └─ Socket.IO /notes namespace for collaborative edit   │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ROUTES ──────────────────────┐
│                                                         │
│  backend/routes/noteRoutes.js (393 lines)               │
│                                                         │
│  POST   /              → create note                     │
│  GET    /              → list notes (with folder filter) │
│  GET    /:id           → get single note                 │
│  PUT    /:id           → update note (title/content)     │
│  DELETE /:id           → delete note (owner only)        │
│                                                         │
│  Folder endpoints:                                      │
│  POST   /folders       → create folder                   │
│  GET    /folders       → list folders                    │
│  PUT    /folders/:id   → update folder                   │
│  DELETE /folders/:id   → delete folder                   │
│  POST   /folders/:id/share   → share folder              │
│  POST   /folders/:id/unshare → unshare folder            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/noteRoutes.js` (393 lines)

### Imports (lines 76-82)
```js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const Note = require('../models/Note');
const Folder = require('../models/Folder');
const { normalizeDoc, normalizeDocs } = require('../utils/normalize');
const { paginateArray, setPaginationHeaders } = require('../utils/pagination');
```

### Endpoint: POST / (lines 235-258)
- **Auth:** required
- **Input:** `{ title, content, ownerId, folderId?, projectId? }`
- **Logic:**
  1. Create Note with provided fields
  2. `ownerId` set to `req.user.uid` (or from body if provided)
  3. If `folderId`: note is placed in that folder
  4. If `projectId`: note is scoped to that project
- **Response:** Created note document

### Endpoint: GET / (lines 260-310)
- **Auth:** required
- **Query params:** `?folderId=<id>&page=1&limit=20`
- **Logic:**
  1. Find notes where `ownerId = uid` OR `uid` in `sharedWith` array
  2. If `folderId` provided: filter by folder
  3. Paginate results
  4. Set pagination headers
- **Response:** Array of notes

### Endpoint: GET /:id (lines 312-342)
- **Auth:** required
- **Logic:**
  1. Find note by ID
  2. Check access: `note.ownerId === uid` OR `note.sharedWith.includes(uid)`
  3. If no access: 403
- **Response:** Single note document

### Endpoint: PUT /:id (lines 344-373)
- **Auth:** required
- **Input:** `{ title?, content?, folderId? }`
- **Logic:**
  1. Find note by ID
  2. Check access: owner or shared
  3. Build `updateData` from provided fields (partial update)
  4. `Note.findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after' })`
- **Response:** Updated note

### Endpoint: DELETE /:id (lines 375-391)
- **Auth:** required
- **Logic:**
  1. Find note by ID
  2. **Owner only:** `note.ownerId !== req.user.uid` → 403
  3. Delete note
- **Response:** `{ message: "Note deleted successfully" }`

---

## Frontend Trace

### NotesView Component
**File:** `src/components/views/NotesView.tsx`
- Split-pane layout: folder sidebar + note list + editor
- Folder tree with expand/collapse
- Note list with title preview + last modified
- Rich text editor (TipTap or Lexical)

### Note Editor
- Rich text with formatting: bold, italic, headings, lists, code blocks
- Auto-save on content change (debounced 1s)
- Real-time collaboration via Socket.IO

### Real-Time Collaboration
- Socket.IO `/notes` namespace
- Events: `note:join`, `note:leave`, `note:edit`, `note:cursor`
- Broadcasts edits to all connected clients
- Conflict resolution via operational transform or CRDT

---

## Database Layer

### Note Model
**File:** `backend/models/Note.js`

| Field | Type | Required | Index | Notes |
|---|---|---|---|---|
| `title` | String | yes | text | Note title |
| `content` | String | no | — | Rich text HTML/JSON |
| `ownerId` | String | yes | yes | Firebase UID |
| `folderId` | ObjectId | no | yes | Ref: Folder |
| `projectId` | ObjectId | no | yes | Ref: Project (optional) |
| `sharedWith` | String[] | no | — | Array of Firebase UIDs |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

### Folder Model
**File:** `backend/models/Folder.js`

| Field | Type | Required | Index | Notes |
|---|---|---|---|---|
| `name` | String | yes | — | Folder name |
| `ownerId` | String | yes | yes | Firebase UID |
| `parentId` | ObjectId | no | — | Parent folder (nested) |
| `type` | String | no | — | Folder category |
| `projectId` | ObjectId | no | — | Project-scoped folder |
| `color` | String | no | — | UI color tag |
| `collaboratorIds` | String[] | no | — | Shared with UIDs |
| `createdAt` | Date | auto | — | |

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | Unauthorized |
| Note not found | 404 | `{ error: "Note not found" }` |
| Not owner/shared | 403 | `{ error: "Unauthorized" }` |
| Only owner can delete | 403 | `{ error: "Unauthorized: Only owner can delete note" }` |
| Server error | 500 | `{ error: error.message }` |

---

## Cross-References

- [18-folders-and-organization.md](./18-folders-and-organization.md) — Folder CRUD and sharing
- [05-database-schema-and-models.md](./05-database-schema-and-models.md) — Note + Folder models
- [14-project-crud.md](./14-project-crud.md) — Project-scoped notes
