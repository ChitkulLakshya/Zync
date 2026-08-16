# 18 — Folders and Organization

**NEW document** — Folder CRUD, nested folders, sharing, collaborator management, project-scoped folders

---

## Feature Summary

Folders organize notes into a hierarchical structure. Folders can be nested (parent-child), shared with collaborators, color-tagged, and scoped to a project. The folder system provides the sidebar tree view in the Notes feature.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  NotesView.tsx → Sidebar                                │
│  ├─ FolderTree.tsx                                      │
│  │   ├─ Recursive rendering of nested folders           │
│  │   ├─ Expand/collapse per folder                      │
│  │   ├─ Color dot per folder (Folder.color)             │
│  │   ├─ Context menu: rename, delete, share             │
│  │   └─ Drag notes into folders                         │
│  ├─ "New Folder" button → CreateFolderDialog.tsx        │
│  └─ Shared folders section (shared by others)           │
│                                                         │
│  Hooks:                                                 │
│  ├─ useFolders.ts — list folders (TanStack Query)       │
│  ├─ useCreateFolder.ts — create mutation                │
│  ├─ useUpdateFolder.ts — update mutation                │
│  ├─ useDeleteFolder.ts — delete mutation                │
│  ├─ useShareFolder.ts — share mutation                  │
│  └─ useUnshareFolder.ts — unshare mutation              │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ROUTES ──────────────────────┐
│                                                         │
│  backend/routes/noteRoutes.js — Folder endpoints        │
│                                                         │
│  POST   /folders           → create folder              │
│  GET    /folders           → list folders               │
│  PUT    /folders/:id       → update folder              │
│  DELETE /folders/:id       → delete folder              │
│  POST   /folders/:id/share   → add collaborators        │
│  POST   /folders/:id/unshare → remove collaborator      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/noteRoutes.js`

### POST /folders (lines 84-115)
- **Auth:** required
- **Input:** `{ name, ownerId, parentId?, type?, projectId?, color? }`
- **Logic:**
  1. Create Folder with provided fields
  2. `ownerId` set to `req.user.uid`
  3. If `parentId`: folder is nested under parent
  4. If `projectId`: folder is scoped to project
  5. `color`: hex color for UI tag (e.g., `#FF5733`)
- **Response:** Created folder document

### GET /folders (lines 117-137)
- **Auth:** required
- **Logic:**
  1. Find folders where `ownerId = uid` OR `uid` in `collaboratorIds`
  2. Return all folders (client builds tree from `parentId` references)
- **Response:** Array of folder documents

### POST /folders/:id/share (lines 139-167)
- **Auth:** required
- **Input:** `{ collaboratorIds: string[] }` — array of UIDs to share with
- **Logic:**
  1. Find folder by ID
  2. Verify ownership: `folder.ownerId === req.user.uid`
  3. Merge new collaboratorIds into existing `folder.collaboratorIds`
  4. Save folder
- **Response:** Updated folder with collaborator list

### PUT /folders/:id (lines 169-187)
- **Auth:** required
- **Input:** `{ name?, color?, parentId? }`
- **Logic:**
  1. Find folder by ID
  2. Verify ownership
  3. Update provided fields
  4. `Folder.findByIdAndUpdate(id, { $set: updates })`
- **Response:** Updated folder

### DELETE /folders/:id (lines 189-206)
- **Auth:** required
- **Logic:**
  1. Find folder by ID
  2. Verify ownership
  3. Delete folder
  4. Notes in folder: `folderId` set to `null` (notes preserved, unfiled)
  5. Child folders: also deleted (cascade) or moved to parent
- **Response:** `{ message: "Folder deleted" }`

### POST /folders/:id/unshare (lines 208-233)
- **Auth:** required
- **Input:** `{ userId }` — UID to remove from collaborators
- **Logic:**
  1. Find folder by ID
  2. Verify ownership
  3. Remove `userId` from `folder.collaboratorIds`
  4. Save folder
- **Response:** Updated folder

---

## Frontend Trace

### FolderTree Component
**File:** `src/components/notes/FolderTree.tsx`
- Recursive component that renders nested folders
- Props: `folders`, `parentId`, `level` (for indentation)
- State: expanded/collapsed per folder
- Click folder: filters note list by `folderId`
- Context menu: Rename, Delete, Share, Change color

### CreateFolderDialog
**File:** `src/components/notes/CreateFolderDialog.tsx`
- Modal with: name input, color picker, parent folder dropdown
- On submit: `POST /api/notes/folders`

### ShareFolderDialog
**File:** `src/components/notes/ShareFolderDialog.tsx`
- User search input (uses `/api/users/search`)
- Multi-select collaborators
- On submit: `POST /api/notes/folders/:id/share` with `collaboratorIds`

---

## Database Layer

### Folder Model
**File:** `backend/models/Folder.js`

| Field | Type | Required | Index | Notes |
|---|---|---|---|---|
| `name` | String | yes | — | Display name |
| `ownerId` | String | yes | yes | Firebase UID |
| `parentId` | ObjectId | no | — | Parent folder (null = root) |
| `type` | String | no | — | Category tag |
| `projectId` | ObjectId | no | — | Project-scoped |
| `color` | String | no | — | Hex color (e.g., `#FF5733`) |
| `collaboratorIds` | String[] | no | — | Shared UIDs |
| `createdAt` | Date | auto | — | |

### Folder Hierarchy
- **Root folders:** `parentId = null` or `parentId` not set
- **Nested folders:** `parentId` references parent `Folder._id`
- **Tree depth:** No enforced limit (client renders recursively)
- **Deletion:** When parent folder is deleted, child folders are either:
  - Cascaded (deleted with parent)
  - Or moved to grandparent (parentId = parent.parentId)

### Note → Folder Relationship
- `Note.folderId` references `Folder._id`
- When folder is deleted: notes' `folderId` set to `null` (unfiled)
- Notes are never deleted when folder is deleted

---

## Sharing Model

```
Folder owner:
  ├─ Full control: rename, delete, share, unshare
  └─ Can add/remove collaborators

Collaborator:
  ├─ Can view folder + notes inside
  ├─ Can edit notes in shared folder
  └─ Cannot rename/delete folder
  └─ Cannot re-share folder
```

| Action | Owner | Collaborator |
|---|---|---|
| View folder + notes | Yes | Yes |
| Edit notes in folder | Yes | Yes |
| Rename folder | Yes | No |
| Delete folder | Yes | No |
| Share with others | Yes | No |
| Unshare from someone | Yes | No |
| Create sub-folder | Yes | No |

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | Unauthorized |
| Folder not found | 404 | `{ error: "Folder not found" }` |
| Not owner (delete/update/share) | 403 | `{ error: "Unauthorized" }` |
| Server error | 500 | `{ error: error.message }` |

---

## Cross-References

- [17-notes-system.md](./17-notes-system.md) — Notes that live inside folders
- [05-database-schema-and-models.md](./05-database-schema-and-models.md) — Folder model
- [09-user-profile-management.md](./09-user-profile-management.md) — User search for sharing
