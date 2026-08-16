# 15 — Project Steps Pipeline

**NEW document** — Step model, pipeline stages, drag-and-drop ordering, task-to-step assignment

---

## Feature Summary

Each project has a multi-step pipeline (Kanban-style). Steps represent stages like "Backlog", "In Progress", "Review", "Done". Tasks are assigned to steps and can be moved between steps via drag-and-drop. The pipeline is the primary project workspace view.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  ProjectWorkspace.tsx → Pipeline tab                    │
│  ├─ KanbanBoard.tsx                                     │
│  │   ├─ Column per Step (ordered by Step.order)         │
│  │   ├─ TaskCard.tsx per task in each column            │
│  │   ├─ Drag-and-drop: @dnd-kit/core                    │
│  │   └─ On drop: PATCH task's stepId                    │
│  ├─ AddStepButton → creates new Step                    │
│  └─ StepHeader → rename, delete, reorder                │
│                                                         │
│  Hooks:                                                 │
│  ├─ useProject.ts → includes steps + tasks              │
│  ├─ useUpdateTaskStep.ts → mutation to change stepId    │
│  └─ useReorderSteps.ts → mutation to update Step.order  │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  projectRoutes.js (task endpoints also handle steps)    │
│                                                         │
│  Step model (backend/models/Step.js)                    │
│  ├─ projectId: ObjectId → Project                       │
│  ├─ title: String                                       │
│  ├─ order: Number                                       │
│  └─ createdAt: Date                                     │
│                                                         │
│  ProjectTask model (backend/models/ProjectTask.js)      │
│  ├─ stepId: ObjectId → Step                             │
│  └─ Moving tasks = updating stepId                      │
│                                                         │
│  Default steps created on project creation:             │
│  1. "Backlog" (order: 0)                                │
│  2. "To Do" (order: 1)                                  │
│  3. "In Progress" (order: 2)                            │
│  4. "Review" (order: 3)                                 │
│  5. "Done" (order: 4)                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### Step Creation on Project Init
**File:** `backend/routes/projectRoutes.js:527-596`

When a project is created (`POST /`), default steps are automatically generated:
```
Step 1: "Backlog"     (order: 0)
Step 2: "To Do"       (order: 1)
Step 3: "In Progress" (order: 2)
Step 4: "Review"      (order: 3)
Step 5: "Done"        (order: 4)
```

### Step Enrichment
**File:** `backend/utils/projectHelper.js`

#### `getProjectWithSteps(projectId)`
1. Fetch Project by ID
2. Fetch all Steps for project, sorted by `order`
3. Fetch all ProjectTasks for project
4. Group tasks by `stepId`
5. Return: `{ ...project, steps: [{ ...step, tasks: [...] }] }`

#### `getProjectsWithSteps(uid)`
1. Fetch all projects for user (owned + team)
2. For each project, fetch steps + tasks
3. Return enriched array

### Task Movement Between Steps
**File:** `backend/routes/projectRoutes.js:1165-1258`

`PUT /:projectId/steps/:stepId/tasks/:taskId`:
- Accepts `stepId` in body to move task to a different step
- Updates `ProjectTask.stepId`
- Invalidates project cache

---

## Frontend Trace

### KanbanBoard Component
**File:** `src/components/projects/KanbanBoard.tsx`
- Uses `@dnd-kit/core` for drag-and-drop
- Each column is a droppable area
- Each task card is a draggable item
- On drop: calls `useUpdateTaskStep` mutation

### useUpdateTaskStep Hook
**File:** `src/hooks/useUpdateTaskStep.ts`
- TanStack Query mutation
- `PUT /api/projects/:projectId/steps/:stepId/tasks/:taskId` with new `stepId`
- On success: invalidates `['project', projectId]` query

### Step Management UI
- **Add step:** Button at end of board → `POST /api/projects/:id/steps`
- **Rename step:** Inline edit on step header → `PATCH /api/projects/:id/steps/:stepId`
- **Delete step:** Context menu → `DELETE /api/projects/:id/steps/:stepId` (tasks moved to previous step)
- **Reorder:** Drag step header → `PATCH` with updated `order` values

---

## Database Layer

### Step Model
**File:** `backend/models/Step.js`

| Field | Type | Required | Index | Notes |
|---|---|---|---|---|
| `projectId` | ObjectId | yes | yes | Ref: Project |
| `title` | String | yes | — | Display name |
| `order` | Number | yes | — | Sort position (0-based) |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Index:** `{ projectId: 1, order: 1 }` — efficient sorted fetch

### ProjectTask → Step Relationship
- `ProjectTask.stepId` references `Step._id`
- When step is deleted, tasks are moved to the previous step (or first step if deleting first)
- No cascade delete — tasks are preserved

---

## Default Pipeline Configuration

| Order | Title | Purpose |
|---|---|---|
| 0 | Backlog | Unstarted work, ideas |
| 1 | To Do | Prioritized work ready to start |
| 2 | In Progress | Active work |
| 3 | Review | Code review / QA |
| 4 | Done | Completed work |

Users can customize: add, rename, delete, and reorder steps.

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| Step not found | 404 | `{ message: "Step not found" }` |
| Project not found | 404 | `{ message: "Project not found" }` |
| Not authorized | 403 | `{ message: "Not authorized" }` |
| Server error | 500 | `{ message: "Server error" }` |

---

## Cross-References

- [14-project-crud.md](./14-project-crud.md) — Project creation triggers default step creation
- [16-task-management.md](./16-task-management.md) — Tasks live within steps
- [05-database-schema-and-models.md](./05-database-schema-and-models.md) — Step + ProjectTask models
