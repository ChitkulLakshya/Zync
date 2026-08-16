# 14 — Project CRUD

**NEW document** — Project creation, list, detail, update, delete, GitHub repo linking, architecture analysis

---

## Feature Summary

Projects are the top-level organizational unit in Zync. Each project can be linked to a GitHub repository, has a multi-step pipeline (Step model), and contains tasks (ProjectTask model). The project routes handle CRUD operations, GitHub repo creation/linking, AI architecture analysis, team member management, collaborator invites, and task branch automation.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  DashboardHome.tsx                                      │
│  ├─ Project cards grid                                  │
│  ├─ "New Project" button → CreateProjectDialog.tsx      │
│  └─ Project search/filter                               │
│                                                         │
│  ProjectWorkspace.tsx                                   │
│  ├─ Pipeline view (Steps + Tasks)                       │
│  ├─ GitHub integration panel                            │
│  ├─ Team members panel                                  │
│  ├─ Architecture analysis viewer                        │
│  └─ Task management (Kanban + list)                     │
│                                                         │
│  Hooks:                                                 │
│  ├─ useProjects.ts — TanStack Query for project list    │
│  ├─ useProject.ts — single project with steps           │
│  └─ useProjectTasks.ts — tasks per project              │
│                                                         │
│  Services:                                              │
│  └─ projectService.ts — API client wrappers             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ROUTES ──────────────────────┐
│                                                         │
│  backend/routes/projectRoutes.js (2090 lines)           │
│                                                         │
│  POST   /                      → create project         │
│  GET    /                      → list user projects     │
│  GET    /:id                   → get project detail     │
│  PATCH  /:id                   → update project         │
│  DELETE /:id                   → delete project         │
│  POST   /new-repo              → create GitHub repo     │
│  POST   /sync                  → sync GitHub repos      │
│  POST   /:id/analyze-architecture → AI analysis         │
│  POST   /:id/team              → add team member        │
│  POST   /:projectId/steps/:stepId/tasks → create task   │
│  PUT    /:projectId/steps/:stepId/tasks/:taskId → update│
│  DELETE /:projectId/steps/:stepId/tasks/:taskId → delete│
│  GET    /tasks/search          → search tasks           │
│  POST   /:projectId/quick-task → quick task creation    │
│  GET    /:projectId/collaborator-assignees → list       │
│  POST   /:projectId/invite-collaborator → invite        │
│  PATCH  /:id/github-settings   → edit GitHub repo       │
│  GET    /:projectId/.../git-activity → commit history   │
│  POST   /tasks/:taskId/merge-pr → merge PR + delete     │
│                                                         │
│  Services used:                                         │
│  ├─ kiloCodeGateway.js — AI architecture analysis       │
│  ├─ usageService.js — generation quota management       │
│  ├─ githubInstallation.js — Octokit builder             │
│  ├─ mailer.js — task assignment emails                  │
│  └─ cache.js — Redis project caching                    │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/projectRoutes.js` (2090 lines)

### Imports (lines 76-102)
```js
const express = require('express');
const router = express.Router();
const { sendZyncEmail } = require('../services/mailer');
const { getTaskAssignmentEmailHtml } = require('../utils/emailTemplates');
const { escapeRegExp } = require('../utils/regexUtils');
const User = require('../models/User');
const Team = require('../models/Team');
const Project = require('../models/Project');
const Step = require('../models/Step');
const ProjectTask = require('../models/ProjectTask');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware');
const { normalizeDoc, normalizeDocs } = require('../utils/normalize');
const { paginateArray, setPaginationHeaders } = require('../utils/pagination');
const { getProjectWithSteps, getProjectsWithSteps } = require('../utils/projectHelper');
const cache = require('../utils/cache');
const { analyzeArchitectureWithKilo } = require('../services/kiloCodeGateway');
const { checkAndReserveGen, refundGen } = require('../services/usageService');
const { getInstallationOctokit, invalidateInstallationCaches } = require('../utils/githubInstallation');
```

### Cache Invalidation Helper (lines 104-109)
```js
async function invalidateProjectCache(project, additionalUids = []) {
  const uids = [...new Set([project.ownerUid, ...(project.team || []), ...additionalUids].filter(Boolean))];
  const keys = uids.map((uid) => `projects:${uid}`);
  await cache.invalidate(...keys);
}
```
- Invalidates `projects:{uid}` for owner + all team members
- Called after every project mutation (create, update, delete, task change)

### Architecture Analysis Cache (lines 118-202)
- **In-memory Map:** `architectureAnalysisCache` with TTL (default 6 hours)
- **Max entries:** 100 (configurable via `ARCHITECTURE_CACHE_MAX_ENTRIES`)
- **Pruning:** Removes expired entries + evicts oldest if over max
- **Cache key:** `${projectId}:${repoCacheKey}` (repo freshness fingerprint)

---

### Endpoint: POST /new-repo (lines 414-525)
- **Auth:** required
- **Input:** `{ name, description, isPrivate }`
- **Logic:**
  1. Get owner's GitHub installation Octokit
  2. Create new GitHub repository via Octokit
  3. Return repo details (name, owner, URL)
- **Used by:** CreateProjectDialog when user opts to create a new repo

### Endpoint: POST / (lines 527-596)
- **Auth:** required
- **Input:** `{ name, description, githubRepoName?, githubRepoOwner? }`
- **Logic:**
  1. Create Project document: `{ name, description, ownerUid, githubRepoName, githubRepoOwner }`
  2. Create default Step documents (pipeline stages)
  3. Invalidate cache for owner
- **Response:** Project document with steps

### Endpoint: POST /:id/analyze-architecture (lines 598-752)
- **Auth:** required
- **Input:** `{ id }` (project ID), `?forceRefresh=true`
- **Logic:**
  1. Load project + GitHub repo details
  2. Check in-memory architecture cache (unless forceRefresh)
  3. Build repo freshness key (repo full_name, default_branch, pushed_at, updated_at)
  4. If cache hit and freshness matches: return cached architecture
  5. If cache miss: `checkAndReserveGen(uid)` — check AI generation quota
  6. Fetch repo file tree + interesting files (package.json, README.md, etc.)
  7. Call `analyzeArchitectureWithKilo(repoContext)` — AI analysis
  8. Store result in memory cache with TTL
  9. Return architecture analysis
- **Quota:** Uses `usageService.checkAndReserveGen()` — refunds on failure

### Endpoint: POST /sync (lines 755-812)
- **Auth:** required
- **Logic:**
  1. Get owner's GitHub installation Octokit
  2. List all repos for the installation
  3. Return list of repos available for linking

### Endpoint: GET / (lines 815-898)
- **Auth:** required
- **Cache:** Redis `projects:{uid}` with 300s TTL
- **Logic:**
  1. Check cache → return if hit
  2. Find projects where `ownerUid = uid` OR `uid` in `team` array
  3. Also fetch team projects (via Team membership)
  4. `getProjectsWithSteps()` — enrich with Step data
  5. Cache result
- **Response:** Array of projects with steps

### Endpoint: GET /:id (lines 931-989)
- **Auth:** required
- **Logic:**
  1. `Project.findById(id)`
  2. Verify access: owner or team member
  3. `getProjectWithSteps()` — enrich with steps + tasks
- **Response:** Full project detail with steps and tasks

### Endpoint: DELETE /:id (lines 992-1017)
- **Auth:** required
- **Logic:**
  1. Find project, verify ownership
  2. Delete all Step documents for project
  3. Delete all ProjectTask documents for project
  4. Delete Project document
  5. Invalidate cache
- **Response:** `{ message: "Project deleted" }`

### Endpoint: PATCH /:id (lines 1019-1057)
- **Auth:** required
- **Input:** Partial project fields (`name`, `description`, etc.)
- **Logic:**
  1. Find project, verify ownership
  2. `Project.findByIdAndUpdate(id, { $set: updates }, { new: true })`
  3. Invalidate cache
- **Response:** Updated project

### Endpoint: POST /:id/team (lines 901-929)
- **Auth:** required
- **Input:** `{ userId }` — UID to add to team
- **Logic:**
  1. Find project, verify ownership
  2. Add userId to `project.team` array (if not already present)
  3. Invalidate cache
- **Response:** Updated project

---

### Task Endpoints

#### POST /:projectId/steps/:stepId/tasks (lines 1059-1163)
- **Input:** `{ title, description, assignedTo?, assignedToName? }`
- **Logic:**
  1. Verify project + step exist
  2. Create ProjectTask: `{ title, description, stepId, projectId, assignedTo, assignedToName }`
  3. If `assignedTo`: `handleTaskAssignment()` — creates GitHub branch
  4. Send task assignment email via `sendZyncEmail()`
  5. Invalidate cache

#### handleTaskAssignment (lines 236-284)
1. Generate branch name: `task/${slug}-${taskId}`
2. Generate completion commit message: `Complete Task: ${taskId}`
3. If project has GitHub repo:
   - Get installation Octokit for owner
   - Fetch default branch SHA
   - Create new branch from default branch SHA
   - Non-blocking: failure logged, DB still stores branch name

#### PUT /:projectId/steps/:stepId/tasks/:taskId (lines 1165-1258)
- Update task fields (title, description, status, assignedTo)
- If assignment changes: `handleTaskAssignment()` for new assignee
- Invalidate cache

#### DELETE /:projectId/steps/:stepId/tasks/:taskId (lines 1260-1340)
- Delete ProjectTask document
- Optionally delete GitHub branch
- Invalidate cache

#### GET /tasks/search (lines 1342-1425)
- Search tasks by title across all user's projects
- Returns paginated results

#### POST /:projectId/quick-task (lines 1427-1540)
- Create a task without a specific step (goes to inbox/default step)
- Simplified input: `{ title, description, assignedTo?, assignedToName? }`

#### GET /:projectId/collaborator-assignees (lines 1542-1718)
- List GitHub collaborators + team members who can be assigned tasks
- Merges GitHub collaborators with Zync team members

#### POST /:projectId/invite-collaborator (lines 1720-1853)
- Invite a GitHub user as collaborator to the project's repo
- Uses installation Octokit to send invitation

#### PATCH /:id/github-settings (lines 1855-1934)
- Update GitHub repo settings: description, homepage, topics
- Uses installation Octokit

#### GET /:projectId/.../git-activity (lines 1937-2003)
- Fetch commit count + messages for a task's branch
- Live from GitHub API

#### POST /tasks/:taskId/merge-pr (lines 2006-2090)
- Merge PR for task branch + delete branch after merge
- Update task status to 'completed'

---

## Frontend Trace

### useProjects Hook
**File:** `src/hooks/useProjects.ts`
- TanStack Query: `useQuery({ queryKey: ['projects'], queryFn: fetchProjects })`
- `staleTime: 60_000` (1 min)
- Returns array of projects

### useProject Hook
**File:** `src/hooks/useProject.ts`
- TanStack Query: `useQuery({ queryKey: ['project', id], queryFn: () => fetchProject(id) })`
- Returns single project with steps and tasks

### CreateProjectDialog
**File:** `src/components/projects/CreateProjectDialog.tsx`
- Modal dialog for creating new projects
- Options: new GitHub repo, link existing repo, no GitHub
- Calls `POST /api/projects` or `POST /api/projects/new-repo` first

### ProjectWorkspace
**File:** `src/components/views/ProjectWorkspace.tsx`
- Main project view with tabbed interface
- Tabs: Pipeline, Tasks, GitHub, Team, Architecture
- Pipeline: drag-and-drop steps, task cards per step
- Architecture: renders AI analysis result

---

## Database Layer

### Project Model (Mongoose)
**File:** `backend/models/Project.js`

| Field | Type | Index | Notes |
|---|---|---|---|
| `name` | String | text | Project name |
| `description` | String | — | |
| `ownerUid` | String | yes | Firebase UID of owner |
| `team` | String[] | — | Array of team member UIDs |
| `githubRepoName` | String | — | Linked GitHub repo |
| `githubRepoOwner` | String | — | GitHub org/user |
| `webhookSecret` | String | — | For GitHub webhooks |
| `createdAt` | Date | — | |
| `updatedAt` | Date | — | |

### Step Model
| Field | Type | Notes |
|---|---|---|
| `projectId` | ObjectId | Ref: Project |
| `title` | String | Step name (e.g., "Backlog", "In Progress") |
| `order` | Number | Sort order |

### ProjectTask Model
| Field | Type | Notes |
|---|---|---|
| `projectId` | ObjectId | Ref: Project |
| `stepId` | ObjectId | Ref: Step |
| `title` | String | |
| `description` | String | |
| `assignedTo` | String? | Firebase UID |
| `assignedToName` | String? | Display name |
| `status` | String | pending/in_progress/completed |
| `githubBranchName` | String? | Auto-generated branch |
| `completionCommitMessage` | String? | Auto-generated |

---

## Caching Strategy

| Endpoint | Cache Key | TTL | Invalidation Trigger |
|---|---|---|---|
| GET / | `projects:{uid}` | 300s | Any project mutation |
| Architecture analysis | In-memory Map | 6h (configurable) | forceRefresh param or TTL expiry |

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | Unauthorized |
| Project not found | 404 | `{ message: "Project not found" }` |
| Not owner (delete/update) | 403 | `{ message: "Not authorized" }` |
| GitHub repo creation fails | 500 | Error message from GitHub |
| AI quota exceeded | 429 | `{ message: "Generation limit reached" }` |
| GitHub branch creation fails | — (logged) | Task still created, branch name stored |
| Server error | 500 | `{ message: "Server error" }` |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ENCRYPTION_KEY` | Yes (prod) | `dev-only-encryption-key-123` | GitHub token encryption |
| `ARCHITECTURE_CACHE_TTL_MS` | No | `21600000` (6h) | Architecture cache TTL |
| `ARCHITECTURE_CACHE_MAX_ENTRIES` | No | `100` | Max cached analyses |

---

## Cross-References

- [05-database-schema-and-models.md](./05-database-schema-and-models.md) — Project, Step, ProjectTask models
- [15-project-steps-pipeline.md](./15-project-steps-pipeline.md) — Step pipeline detail
- [16-task-management.md](./16-task-management.md) — Task CRUD detail
- [22-github-oauth-integration.md](./22-github-oauth-integration.md) — GitHub installation Octokit
- [25-ai-architecture-analysis.md](./25-ai-architecture-analysis.md) — Kilo Code Gateway
- [41-team-crud-and-invites.md](./41-team-crud-and-invites.md) — Team member management
