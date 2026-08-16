# 47 — Task Routes (Standalone)

**NEW document** — Task-specific routes separate from project routes, task CRUD, assignment, search, quick tasks

---

## Feature Summary

The task routes provide standalone task management endpoints separate from the project routes. While project routes handle task creation within project context, the task routes handle direct task operations: update, delete, search, and quick task creation.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  KanbanBoard.tsx                                        │
│  ├─ Task cards (drag-and-drop between steps)            │
│  ├─ Task detail modal                                   │
│  │   ├─ Edit title, description                         │
│  │   ├─ Assign to team member                           │
│  │   ├─ Set priority, due date                          │
│  │   └─ Delete task                                     │
│  └─ Quick add input (per step)                          │
│                                                         │
│  Hooks:                                                 │
│  ├─ useTasks.ts — TanStack Query for task list          │
│  ├─ useUpdateTask.ts — mutation                         │
│  ├─ useDeleteTask.ts — mutation                         │
│  └─ useQuickTask.ts — mutation                          │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  backend/routes/taskRoutes.js                           │
│                                                         │
│  PUT    /:taskId       → update task                    │
│  DELETE /:taskId       → delete task                    │
│  GET    /search        → search tasks by query          │
│  POST   /quick         → create quick task              │
│  PATCH  /:taskId/step  → move task to different step    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/taskRoutes.js`

### PUT /:taskId (update task)
- **Auth:** required
- **Input:** `{ title?, description?, assigneeId?, priority?, dueDate?, status? }`
- **Logic:**
  1. Find task by ID
  2. Verify user has access (project owner or team member)
  3. Update fields
  4. If assignee changed: send notification email
  5. Emit `task-updated` via Socket.IO `/tasks` namespace
  6. Return updated task

### DELETE /:taskId (delete task)
- **Auth:** required
- **Logic:**
  1. Find task, verify ownership/admin
  2. If task has GitHub branch: optionally delete branch
  3. Delete task from DB
  4. Emit `task-deleted` via Socket.IO
  5. Return `{ message: "Task deleted" }`

### GET /search (search tasks)
- **Auth:** required
- **Query:** `?query=<term>&projectId=<id>`
- **Logic:**
  1. Build filter: `{ projectId, title: { $regex: query, $options: 'i' } }`
  2. `ProjectTask.find(filter).lean()`
  3. Return matching tasks

### POST /quick (quick task)
- **Auth:** required
- **Input:** `{ title, projectId, stepId }`
- **Logic:**
  1. Create task with minimal fields (no description, no assignee)
  2. Add to step's task list
  3. Emit `task-created` via Socket.IO
  4. Return created task

### PATCH /:taskId/step (move task)
- **Auth:** required
- **Input:** `{ newStepId, newIndex }`
- **Logic:**
  1. Remove task from old step
  2. Add to new step at specified index
  3. Update `task.stepId = newStepId`
  4. Emit `task-moved` via Socket.IO
  5. Return updated task

---

## Socket.IO Integration

### /tasks Namespace Events
| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `task-created` | Server → Client | Task object | New task added |
| `task-updated` | Server → Client | Task object | Task fields changed |
| `task-deleted` | Server → Client | `{ taskId }` | Task removed |
| `task-moved` | Server → Client | `{ taskId, newStepId, newIndex }` | Task moved between steps |

- Events emitted to project room: `project:{projectId}`
- All team members receive updates in real-time

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | Unauthorized |
| Task not found | 404 | `{ error: "Task not found" }` |
| Not authorized | 403 | `{ error: "Unauthorized" }` |
| Server error | 500 | `{ error: "Server error" }` |

---

## Cross-References

- [16-task-management.md](./16-task-management.md) — Task management in project routes
- [15-project-steps-pipeline.md](./15-project-steps-pipeline.md) — Steps and Kanban pipeline
- [22-github-webhook-handler.md](./22-github-webhook-handler.md) — Webhook updates tasks
- [14-project-crud.md](./14-project-crud.md) — Project context for tasks
