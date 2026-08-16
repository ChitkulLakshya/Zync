# 16 — Task Management

**NEW document** — Task CRUD, assignment, GitHub branch automation, quick tasks, task search, PR merge

---

## Feature Summary

Tasks are the atomic work units within a project. Each task belongs to a Step in the pipeline, can be assigned to a team member, and can auto-create a GitHub branch for the assignee. Tasks support search, quick creation, status tracking, and PR merging with branch cleanup.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  KanbanBoard.tsx                                        │
│  ├─ TaskCard.tsx — title, assignee, status, branch      │
│  ├─ Drag between steps (changes stepId)                 │
│  └─ Click card → TaskDetailDialog.tsx                   │
│                                                         │
│  TaskDetailDialog.tsx                                   │
│  ├─ Edit title/description                              │
│  ├─ Assign to team member                               │
│  ├─ View GitHub branch + commits                        │
│  ├─ Merge PR button → POST /tasks/:id/merge-pr          │
│  └─ Delete task                                         │
│                                                         │
│  QuickAddTask.tsx                                       │
│  └─ Inline input → POST /:projectId/quick-task          │
│                                                         │
│  TaskSearch.tsx                                         │
│  └─ Debounced input → GET /tasks/search?query=...       │
│                                                         │
│  Hooks:                                                 │
│  ├─ useCreateTask.ts → POST /:projectId/steps/:stepId/tasks │
│  ├─ useUpdateTask.ts → PUT /:projectId/steps/:stepId/tasks/:taskId │
│  ├─ useDeleteTask.ts → DELETE /:projectId/steps/:stepId/tasks/:taskId │
│  ├─ useQuickTask.ts → POST /:projectId/quick-task       │
│  ├─ useSearchTasks.ts → GET /tasks/search               │
│  └─ useMergePR.ts → POST /tasks/:taskId/merge-pr        │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  projectRoutes.js — Task endpoints (lines 1059-2090)    │
│                                                         │
│  Task lifecycle:                                        │
│  1. Create task → assigned? → create GitHub branch      │
│  2. Update task → reassign? → create branch for new     │
│  3. Move task → update stepId                           │
│  4. Search tasks → regex on title across projects       │
│  5. View git activity → fetch commits from branch       │
│  6. Merge PR → merge branch to default + delete branch  │
│  7. Delete task → optionally delete branch              │
│                                                         │
│  GitHub branch automation:                              │
│  ├─ Branch name: task/{slug-title}-{taskId}             │
│  ├─ Created from default branch SHA                     │
│  ├─ Completion commit msg: "Complete Task: {taskId}"    │
│  └─ Non-blocking: DB stores branch name even if GH fails│
│                                                         │
│  Services:                                              │
│  ├─ githubInstallation.js → Octokit for branch ops      │
│  ├─ mailer.js → task assignment email                   │
│  └─ usageService.js → not used for tasks (no AI)        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/projectRoutes.js`

### POST /:projectId/steps/:stepId/tasks (lines 1059-1163)
- **Auth:** required
- **Input:** `{ title, description, assignedTo?, assignedToName? }`
- **Logic:**
  1. Verify project exists + user has access
  2. Verify step exists in project
  3. Create ProjectTask: `{ title, description, projectId, stepId, assignedTo, assignedToName, status: 'pending' }`
  4. If `assignedTo`: call `handleTaskAssignment(project, task, assignedTo, assignedToName)`
  5. Send assignment email via `sendZyncEmail()` with `getTaskAssignmentEmailHtml()`
  6. Invalidate project cache
- **Response:** Created task document

### handleTaskAssignment (lines 236-284)
```
1. Generate slug from task title: slugify(title).substring(0, 30)
2. Generate branch name: `task/${slug}-${task._id}`
3. Generate completion commit message: `Complete Task: ${task._id}`
4. If project has GitHub repo (githubRepoOwner + githubRepoName):
   a. Get installation Octokit for project.ownerUid
   b. GET /repos/{owner}/{repo} → fetch default_branch
   c. GET /repos/{owner}/{repo}/git/ref/heads/{defaultBranch} → get SHA
   d. POST /repos/{owner}/{repo}/git/refs → create branch from SHA
   e. Non-blocking: if fails, log error, continue (DB has branch name)
5. Return { assignedTo, assignedToName, githubBranchName, completionCommitMessage }
```

### PUT /:projectId/steps/:stepId/tasks/:taskId (lines 1165-1258)
- **Auth:** required
- **Input:** Partial task fields (`title`, `description`, `status`, `assignedTo`, `stepId`)
- **Logic:**
  1. Find task by ID
  2. If `stepId` changed: update step reference (move between pipeline columns)
  3. If `assignedTo` changed: call `handleTaskAssignment()` for new assignee
  4. Update task fields
  5. Invalidate cache
- **Response:** Updated task

### DELETE /:projectId/steps/:stepId/tasks/:taskId (lines 1260-1340)
- **Auth:** required
- **Logic:**
  1. Find task, verify project access
  2. If task has `githubBranchName` and project has GitHub repo:
     - Delete branch via Octokit (non-blocking, failure logged)
  3. Delete ProjectTask document
  4. Invalidate cache
- **Response:** `{ message: "Task deleted" }`

### GET /tasks/search (lines 1342-1425)
- **Auth:** required
- **Input:** `?query=<search term>&page=1&limit=20`
- **Logic:**
  1. Get all project IDs for user (owned + team)
  2. Regex search on `ProjectTask.title` (case-insensitive)
  3. Filter by user's projects
  4. Paginate results
  5. Set pagination headers
- **Response:** Array of matching tasks with project info

### POST /:projectId/quick-task (lines 1427-1540)
- **Auth:** required
- **Input:** `{ title, description?, assignedTo?, assignedToName? }`
- **Logic:**
  1. Find project, verify access
  2. Find first step (lowest `order`) in project
  3. Create task in first step
  4. If assigned: `handleTaskAssignment()`
  5. Send email if assigned
  6. Invalidate cache
- **Purpose:** Fast task creation without specifying a step

### GET /:projectId/collaborator-assignees (lines 1542-1718)
- **Auth:** required
- **Logic:**
  1. Get GitHub collaborators via Octokit
  2. Get Zync team members
  3. Merge lists, deduplicate by GitHub username
  4. Return combined list with display names + avatars
- **Used by:** Task assignee dropdown

### GET /:projectId/steps/:stepId/tasks/:taskId/git-activity (lines 1937-2003)
- **Auth:** required
- **Logic:**
  1. Find task, verify project access
  2. If task has `githubBranchName`:
     - GET /repos/{owner}/{repo}/commits?sha={branchName}
     - Extract commit count + messages
  3. Return `{ commitCount, commits: [{ sha, message, author, date }] }`
- **Used by:** TaskDetailDialog git activity panel

### POST /tasks/:taskId/merge-pr (lines 2006-2090)
- **Auth:** required
- **Input:** `{ taskId }` (from URL)
- **Logic:**
  1. Find task by ID
  2. Find project for task
  3. Verify user is project owner or task assignee
  4. Get installation Octokit
  5. Check if PR exists for branch (via GitHub API)
  6. If PR exists: merge PR via Octokit
  7. Delete branch: `DELETE /repos/{owner}/{repo}/git/refs/heads/{branchName}`
  8. Update task status to `'completed'`
  9. Invalidate cache
- **Response:** `{ message: "PR merged and branch deleted", task }`

---

## Frontend Trace

### TaskCard Component
**File:** `src/components/projects/TaskCard.tsx`
- Displays: title, assignee avatar, status badge, branch name
- Draggable via `@dnd-kit`
- Click opens `TaskDetailDialog`

### TaskDetailDialog
**File:** `src/components/projects/TaskDetailDialog.tsx`
- Tabs: Details, Git Activity, Comments
- **Details:** Edit title, description, assignee, status
- **Git Activity:** Shows commits from GitHub branch
- **Comments:** Thread stored in MongoDB (task.comments array)
- Actions: Save, Delete, Merge PR

### QuickAddTask
**File:** `src/components/projects/QuickAddTask.tsx`
- Inline text input at top of Kanban board
- Enter key creates task via `POST /:projectId/quick-task`
- No step selection needed — goes to first step

### TaskSearch
**File:** `src/components/projects/TaskSearch.tsx`
- Debounced search input (300ms)
- Calls `GET /tasks/search?query=...`
- Results dropdown with project name + step

---

## Database Layer

### ProjectTask Model
**File:** `backend/models/ProjectTask.js`

| Field | Type | Required | Index | Notes |
|---|---|---|---|---|
| `projectId` | ObjectId | yes | yes | Ref: Project |
| `stepId` | ObjectId | yes | yes | Ref: Step |
| `title` | String | yes | text | |
| `description` | String | no | — | |
| `assignedTo` | String | no | — | Firebase UID |
| `assignedToName` | String | no | — | Display name |
| `status` | String | no | — | pending/in_progress/completed |
| `githubBranchName` | String | no | — | Auto-generated |
| `completionCommitMessage` | String | no | — | Auto-generated |
| `comments` | Mixed | no | — | Array of comment objects |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Text Index:** `{ title: 'text' }` — for search

---

## GitHub Branch Automation

| Step | GitHub API Call | Blocking? |
|---|---|---|
| Create branch | `POST /repos/{owner}/{repo}/git/refs` | No — failure logged |
| Fetch commits | `GET /repos/{owner}/{repo}/commits?sha={branch}` | Yes — for git activity view |
| Merge PR | `PUT /repos/{owner}/{repo}/pulls/{pr_number}/merge` | Yes — must succeed |
| Delete branch | `DELETE /repos/{owner}/{repo}/git/refs/heads/{branch}` | No — failure logged |

### Branch Naming Convention
```
task/{slugified-title-30-chars}-{mongodb-objectid}
```
Example: `task/add-login-page-507f191e810c19729de860ea`

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| Task not found | 404 | `{ message: "Task not found" }` |
| Project not found | 404 | `{ message: "Project not found" }` |
| Not authorized | 403 | `{ message: "Not authorized" }` |
| Branch creation fails | 201 | Task still created (branch name stored in DB) |
| PR merge fails | 500 | Error from GitHub API |
| Branch deletion fails | 200 | PR merged, branch deletion logged as warning |
| Server error | 500 | `{ message: "Server error" }` |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ENCRYPTION_KEY` | Yes (prod) | GitHub token decryption |
| `GITHUB_APP_ID` | Yes | GitHub App for installation Octokit |
| `GITHUB_PRIVATE_KEY` | Yes | GitHub App private key |

---

## Cross-References

- [14-project-crud.md](./14-project-crud.md) — Parent project routes
- [15-project-steps-pipeline.md](./15-project-steps-pipeline.md) — Steps that contain tasks
- [22-github-oauth-integration.md](./22-github-oauth-integration.md) — GitHub installation Octokit
- [23-github-webhook-handler.md](./23-github-webhook-handler.md) — Webhooks for branch/PR events
- [05-database-schema-and-models.md](./05-database-schema-and-models.md) — ProjectTask model
