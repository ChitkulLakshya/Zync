# Task Board Redesign & Automation — Detailed Changelog

> **Date:** July 26, 2026  
> **Scope:** Full-stack redesign of the Zync Task Board experience — backend webhook automation, new API endpoints, schema changes, and a complete frontend UI overhaul.  
> **Goal:** Transform the task board from a manual drag-and-drop Kanban into a read-only, automation-driven board that moves cards automatically based on real GitHub developer activity (commits, branch creation, PRs), with a rich detail dialog showing live Git information.

---

## Table of Contents

1. [Overview of Changes](#1-overview-of-changes)
2. [Backend Changes](#2-backend-changes)
   - 2.1 [ProjectTask Schema — `merged` Field](#21-projecttask-schema--merged-field)
   - 2.2 [GitHub Webhook Worker — Auto Status Transitions on Push](#22-github-webhook-worker--auto-status-transitions-on-push)
   - 2.3 [Project Routes — Git Activity Endpoint](#23-project-routes--git-activity-endpoint)
   - 2.4 [Project Routes — Merge PR Endpoint Rework](#24-project-routes--merge-pr-endpoint-rework)
3. [Frontend Changes](#3-frontend-changes)
   - 3.1 [KanbanBoard.tsx — Complete Rewrite](#31-kanbanboardtsx--complete-rewrite)
   - 3.2 [TaskDetailDialog.tsx — New Component](#32-taskdetaildialogtsx--new-component)
   - 3.3 [TaskBoardView.tsx — Pivot Selectors & Data Aggregation](#33-taskboardviewtsx--pivot-selectors--data-aggregation)
   - 3.4 [DesktopView.tsx — Tab Buttons & Sidebar Flatten](#34-desktopviewtsx--tab-buttons--sidebar-flatten)
4. [Status Flow & Column Mapping](#4-status-flow--column-mapping)
5. [Real-Time Sync Architecture](#5-real-time-sync-architecture)
6. [Pending / Known Issues](#6-pending--known-issues)

---

## 1. Overview of Changes

### What Changed

| Area | Before | After |
|------|--------|-------|
| **Board interaction** | Manual drag-and-drop between columns | Read-only; cards move automatically via GitHub webhooks |
| **Card UI** | Full task info, progress dots, Start Task button | Minimal: task title + assignee avatar + relative date |
| **Column order** | PR Raised was in the middle | PR Raised is last (5th column) |
| **Column count** | Variable / scrollable | Fixed 5 columns, fit to screen width via `grid-cols-5` |
| **Task detail** | Side drawer (`TaskDetailDrawer`) | Centered modal dialog (`TaskDetailDialog`) with live Git data |
| **PR merge** | Changed task status to `Completed` (regressed card) | Sets `merged: true` flag; card stays in PR Raised column |
| **Git activity** | Only last commit stored in Mongo | Live fetch of up to 30 commits from GitHub API per task |
| **Sidebar** | Nested children under Tasks | Flat sidebar; tab buttons in header area |
| **Header** | Title only | Title + "My Tasks" / "Task Board" tab toggle row below header |

### Files Modified

| File | Type | Summary |
|------|------|---------|
| `backend/models/ProjectTask.js` | Modified | Added `merged` boolean field |
| `backend/services/githubWebhookWorker.js` | Modified | Auto status transitions on push webhook |
| `backend/routes/projectRoutes.js` | Modified | New git-activity endpoint; reworked merge-pr endpoint |
| `src/components/workspace/KanbanBoard.tsx` | Rewritten | Removed drag-drop, reordered columns, simplified cards, dialog integration |
| `src/components/workspace/TaskDetailDialog.tsx` | New file | Centered modal with live commit list, PR link, merge button |
| `src/components/views/TaskBoardView.tsx` | Modified | Pivot selectors, data aggregation, live updates |
| `src/components/views/DesktopView.tsx` | Modified | Tab buttons in header, sidebar flatten, sub-view state |

---

## 2. Backend Changes

### 2.1 ProjectTask Schema — `merged` Field

**File:** `backend/models/ProjectTask.js` (line ~105)

A new boolean field `merged` was added to the `ProjectTask` Mongoose schema:

```javascript
merged: { type: Boolean, default: false },
```

**Purpose:**
- Tracks whether a task's pull request has been merged via the Zync UI.
- Prevents the merge-pr endpoint from regressing the task's Kanban column status (previously, merging set status to `Completed`, which moved the card backward).
- The frontend reads this flag to display a "Merged" state on the Merge button in `TaskDetailDialog`.

**Schema location context:**
The field sits alongside other GitHub integration fields:
```
githubBranchName, completionCommitMessage, githubPrUrl, githubPrNumber, merged
```

---

### 2.2 GitHub Webhook Worker — Auto Status Transitions on Push

**File:** `backend/services/githubWebhookWorker.js` (lines ~307–363)

#### What Was Added

A new block in the `handlePush` webhook handler that automatically progresses a task's Kanban status when commits are pushed to the task's linked branch.

#### Logic Flow

```
GitHub Push Webhook
  │
  ├─ Extract ref (e.g. refs/heads/task/feature-x)
  ├─ Check if ref starts with "refs/heads/task/"
  │
  ├─ Find ProjectTask by githubBranchName
  │
  ├─ Determine current status position:
  │   isBeforeInProgress = ['ready','pending','backlog','active'].includes(currentStatus)
  │   isBeforeDone = isBeforeInProgress || currentStatus === 'in progress'
  │
  ├─ Rule 1: Any commit → "In Progress"
  │   If isBeforeInProgress → set status = 'In Progress'
  │
  ├─ Rule 2: Completion commit → "Done"
  │   If commit.message === task.completionCommitMessage
  │     → set commitCode, commitMessage
  │     → If isBeforeDone → set status = 'Done'
  │     → Emit notification to project owner
  │
  ├─ Persist update via ProjectTask.updateOne
  │
  └─ Emit socket event 'task-updated' via taskIO.emitToProject
      → Triggers live board refresh on all connected clients
```

#### Key Code

```javascript
const ref = payload.ref; // e.g. refs/heads/task/something
if (ref && ref.startsWith('refs/heads/task/')) {
  const branchName = ref.replace('refs/heads/', '');
  const task = await ProjectTask.findOne({ githubBranchName: branchName });
  if (task) {
    const currentStatus = String(task.status || '').toLowerCase();
    const isBeforeInProgress = ['ready', 'pending', 'backlog', 'active'].includes(currentStatus);
    const isBeforeDone = isBeforeInProgress || currentStatus === 'in progress';

    const taskUpdate = {};

    // Any commit → In Progress
    if (isBeforeInProgress) {
      taskUpdate.status = 'In Progress';
    }

    // Completion commit → Done
    if (task.completionCommitMessage) {
      const match = commitsToProcess.find(
        (c) => c.message.trim() === task.completionCommitMessage.trim()
      );
      if (match) {
        taskUpdate.commitCode = match.id.substring(0, 7);
        taskUpdate.commitMessage = match.message;
        if (isBeforeDone) {
          taskUpdate.status = 'Done';
        }
        // Emit notification
      }
    }

    if (Object.keys(taskUpdate).length > 0) {
      await ProjectTask.updateOne({ _id: task._id }, { $set: taskUpdate });
      taskIO.emitToProject(String(linkedProject._id), 'task-updated', { ... });
    }
  }
}
```

#### Status Transition Rules

| Trigger | From Status | To Status | Condition |
|---------|-------------|-----------|-----------|
| Any commit pushed to task branch | Ready / Pending / Backlog / Active | In Progress | Always |
| Commit message matches `completionCommitMessage` | Ready / Pending / Backlog / Active / In Progress | Done | `task.completionCommitMessage` exists and matches |
| PR opened (existing webhook handler) | In Progress / Done | PR Raised | Existing logic, unchanged |

#### Guard Conditions

- **No regression:** Status only moves forward. If a task is already `Done` or `PR Raised`, a new commit won't move it back to `In Progress`.
- **PR Raised without completion commit:** If a PR is raised while the task is in `In Progress` (no completion commit was made), the existing PR webhook handler moves it directly from `In Progress` to `PR Raised`.

---

### 2.3 Project Routes — Git Activity Endpoint

**File:** `backend/routes/projectRoutes.js` (lines ~1886–1954)

#### New Endpoint

```
GET /api/projects/:projectId/steps/:stepId/tasks/:taskId/git-activity
```

**Auth:** `authMiddleware` (JWT required)

**Authorization:** User must be project owner or team member.

#### Response Shape

```json
{
  "branch": "task/feature-x",
  "commitCount": 5,
  "commits": [
    {
      "sha": "abc1234",
      "message": "feat: add login form",
      "author": "johndoe",
      "date": "2026-07-25T10:00:00Z",
      "url": "https://github.com/owner/repo/commit/abc1234..."
    }
  ],
  "prUrl": "https://github.com/owner/repo/pull/42",
  "prNumber": 42,
  "merged": false
}
```

#### Implementation Details

1. **Validates** project exists and user has access (`project.ownerUid === req.user.uid` or in `project.team`).
2. **Fetches task** by `taskId` to get `githubBranchName`, `githubPrUrl`, `githubPrNumber`, `merged`.
3. **If no branch or repo info:** Returns base response with zeros/empty arrays.
4. **Calls GitHub API** via Octokit:
   ```
   GET /repos/{owner}/{repo}/commits?sha={branchName}&per_page=30
   ```
5. **Maps commits** to `{ sha, message, author, date, url }` objects.
6. **Fallback:** If GitHub API fails, falls back to the single stored commit (`task.commitMessage`, `task.commitCode`) if available.

#### Why This Design

- Avoids storing full commit history in MongoDB (commits are fetched live from GitHub).
- Up to 30 commits per request — enough for the dialog without excessive API calls.
- Graceful degradation: if GitHub API is unavailable, shows the last known commit from the webhook.

---

### 2.4 Project Routes — Merge PR Endpoint Rework

**File:** `backend/routes/projectRoutes.js` (lines ~1956–2038)

#### Endpoint

```
POST /api/projects/tasks/:taskId/merge-pr
```

#### What Changed

**Before:**
```javascript
await ProjectTask.findByIdAndUpdate(taskId, {
  $set: { status: 'Completed', updatedAt: Date.now() }
});
```
This moved the card from "PR Raised" back to "Done" — a visual regression on the board.

**After:**
```javascript
await ProjectTask.findByIdAndUpdate(taskId, {
  $set: { merged: true, updatedAt: Date.now() }
});
```
The task stays in the "PR Raised" column. The `merged` flag lets the UI show a "Merged" button state.

#### Full Flow

1. **Validate** task exists and has `githubPrNumber` + `githubBranchName`.
2. **Validate** requester is project owner (`project.ownerUid === req.user.uid`).
3. **Build Octokit** from GitHub App installation.
4. **Merge PR** via GitHub API:
   ```
   PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge
   ```
   Merge method: `squash`.
5. **Delete branch** via GitHub API:
   ```
   DELETE /repos/{owner}/{repo}/git/refs/heads/{branchName}
   ```
   (Non-blocking — if deletion fails, merge still succeeds.)
6. **Set `merged: true`** on the task document.
7. **Emit socket event** `task-updated` with `{ merged: true }` for live UI update.

---

## 3. Frontend Changes

### 3.1 KanbanBoard.tsx — Complete Rewrite

**File:** `src/components/workspace/KanbanBoard.tsx` (full rewrite, 261 lines)

#### Removed

- **Drag-and-drop handlers:** All `onDragEnd`, `onDragStart`, `onDragUpdate`, `DndContext`, `Draggable`, `Droppable` logic removed.
- **Start Task button:** Removed from card footer.
- **Progress dots:** Removed from card header.
- **Task status dropdown:** Removed inline status editing.
- **Delete task button:** Removed from card.

#### Column Configuration

```typescript
const COLUMNS = ['Ready', 'Active', 'In Progress', 'Done', 'PR Raised'];
```

Column order: **PR Raised is last** (5th column), per user requirement.

#### Column Mapping

Various backend status values are normalized to the 5 display columns:

```typescript
const COLUMN_MAPPING: Record<string, string> = {
  'Pending': 'Ready',
  'Backlog': 'Ready',
  'Ready': 'Ready',
  'Active': 'Active',
  'In Progress': 'In Progress',
  'Completed': 'Done',
  'Done': 'Done',
  'In Review': 'PR Raised',
  'PR Raised': 'PR Raised',
};
```

#### Layout

- **5-column grid:** `grid grid-cols-5 gap-3 min-w-0` — fits all 5 columns to screen width without horizontal scroll.
- **Column header:** Sticky, backdrop-blurred, with column name + task count badge.
- **Column body:** Scrollable (`overflow-y-auto`), with `AnimatePresence` for smooth card transitions.

#### Card Design

Each card shows:
1. **Task title** (max 2 lines, `line-clamp-2`)
2. **Assignee avatar** (24×24px, with `AvatarImage` + `AvatarFallback` initials)
3. **Relative date label** (e.g. "Today", "Yesterday", "3 days ago")

No other UI elements — deliberately minimal per user request.

#### Relative Date Helper

```typescript
const relativeDayLabel = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return formatDistanceToNow(date, { addSuffix: true });
};
```

Uses `date-fns` `isToday`, `isYesterday`, and `formatDistanceToNow`.

#### Card Click → Auto Status + Dialog

When a card is clicked:

```typescript
const handleTaskOpen = (task: Task & { stepId: string }) => {
  const isReadyLike = ['Ready', 'Pending', 'Backlog'].includes(task.status);
  const isAssignee = task.assignedTo && currentUser?.uid && task.assignedTo === currentUser.uid;

  // Auto-move Ready → Active when assignee opens their own task
  if (resolvedTaskId && resolvedStepId && !isOwner && isAssignee && isReadyLike) {
    onUpdateTask(resolvedStepId, resolvedTaskId, { status: 'Active' });
  }

  setActiveTask(task); // Opens TaskDetailDialog
};
```

This implements the "Active = user has opened or seen the task" rule.

#### Dialog Integration

```tsx
<TaskDetailDialog
  task={activeTask as TaskDetailTask | null}
  open={Boolean(activeTask)}
  onOpenChange={(open) => { if (!open) setActiveTask(null); }}
  isOwner={isOwner}
  onMerged={() => setActiveTask(null)}
/>
```

---

### 3.2 TaskDetailDialog.tsx — New Component

**File:** `src/components/workspace/TaskDetailDialog.tsx` (246 lines, new file)

#### Purpose

A centered modal dialog that opens when a Kanban card is clicked. Displays rich task and Git information that doesn't fit on the minimal card.

#### UI Sections

1. **Status Badge** — Shows current task status (capitalized).
2. **Task Title** — Large, bold heading.
3. **Description** — Full task description text (or "No description provided.").
4. **Completed Banner** — Green banner with checkmark icon, shown only when status is `Done`/`Completed` and not `PR Raised`.
5. **Branch Section** — Shows the GitHub branch name in a monospace code block with a `GitBranch` icon.
6. **Commits Section** — Live-fetched commit list:
   - Section header with `GitCommit` icon and commit count.
   - Loading spinner while fetching.
   - "No commits yet." message if empty.
   - Each commit: short SHA (7 chars) + first line of message + relative timestamp.
7. **Pull Request Section** (shown only when status is `PR Raised`/`In Review`):
   - "Open in GitHub" button (opens PR URL in new tab).
   - "Merge" button (visible only to project owner).
   - Merge button shows "Merging..." during request, "Merged" after success.

#### Data Fetching

On dialog open, fetches from the new git-activity endpoint:

```typescript
const res = await fetch(
  `${API_BASE_URL}/api/projects/${task.projectId}/steps/${task.stepId}/tasks/${taskId}/git-activity`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

#### Merge Handler

```typescript
const handleMerge = async () => {
  const res = await fetch(`${API_BASE_URL}/api/projects/tasks/${taskId}/merge-pr`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    toast({ title: 'Pull request merged' });
    setActivity((prev) => (prev ? { ...prev, merged: true } : prev));
    onMerged?.(); // Closes dialog
  }
};
```

#### Component Props

```typescript
interface TaskDetailDialogProps {
  task: TaskDetailTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwner?: boolean;
  onMerged?: () => void;
}
```

#### Exported Types

```typescript
export interface TaskDetailTask {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  status: string;
  githubBranchName?: string;
  githubPrUrl?: string;
  githubPrNumber?: number;
  projectId?: string;
  stepId?: string;
}
```

#### Dependencies

- `@/components/ui/dialog` — Dialog primitives
- `lucide-react` — Icons: `GitBranch`, `GitPullRequest`, `GitMerge`, `GitCommit`, `ExternalLink`, `CheckCircle2`, `Loader2`
- `date-fns` — `formatDistanceToNow` for commit timestamps
- `@/lib/firebase` — `auth` for ID token
- `@/hooks/use-toast` — Toast notifications

---

### 3.3 TaskBoardView.tsx — Pivot Selectors & Data Aggregation

**File:** `src/components/views/TaskBoardView.tsx` (462 lines)

#### Overview

The `TaskBoardView` is the container for the cross-project Kanban board. It was created to provide an aggregated, pivotable view of tasks across all projects the user has access to.

#### Pivot Modes

Three pivot modes allow filtering the board by different dimensions:

| Mode | Label | Icon | Filter Logic |
|------|-------|------|-------------|
| `user` | By User | `UserIcon` | Shows tasks assigned to a specific user across all projects |
| `repo` | By Repo | `GithubIcon` | Shows all tasks in a single selected project/repository |
| `team` | By Team | `UsersIcon` | Shows tasks assigned to any member of a selected team |

#### Data Loading

```typescript
const [fetchedProjects, ownedTeamsRes, myTeamsRes] = await Promise.all([
  fetchProjects(),                           // All accessible projects with nested steps/tasks
  fetch(`${API_BASE_URL}/api/teams/owned`),  // Teams owned by user
  fetch(`${API_BASE_URL}/api/teams/mine`),   // Teams user is a member of
]);
```

Teams are deduplicated via a `Map` keyed by `_id`.

#### Board Steps Construction

The `boardSteps` useMemo builds the `steps[]` array fed to `KanbanBoard`:

1. Creates a `stepsById` map to aggregate tasks from different projects under the same step ID.
2. For each pivot mode, iterates projects → steps → tasks and includes matching tasks.
3. Each included task is tagged with its origin `{ projectId, projectName }` in `taskProjectMapRef` for later REST routing.
4. Step titles are prefixed with project name: `"ProjectName · StepTitle"`.

#### Live Updates

```typescript
useTaskUpdates({
  userId: currentUser?.uid,
  projectIds: allProjectIds,
  onTaskChange: useCallback(() => {
    loadDataRef.current(); // Re-fetch all data on any task change
  }, []),
});
```

Joins socket rooms for **all** loaded projects, so updates arrive regardless of which pivot/filter is active.

#### Task Update Handler

`handleUpdateTask` routes updates to the correct project's REST endpoint:

```
PUT /api/projects/{projectId}/steps/{stepId}/tasks/{taskId}
```

Uses `taskProjectMapRef` to resolve the origin project. Includes optimistic local update with revert on failure.

#### UI Layout

```
┌─────────────────────────────────────────────────────┐
│ [By User] [By Repo] [By Team]  [Select ▾]  N tasks ⟳ │  ← Pivot selector bar
├─────────────────────────────────────────────────────┤
│                                                       │
│  Ready    Active    In Progress    Done    PR Raised  │  ← KanbanBoard
│  ┌────┐   ┌────┐    ┌────┐       ┌────┐   ┌────┐     │
│  │card│   │card│    │card│       │card│   │card│     │
│  └────┘   └────┘    └────┘       └────┘   └────┘     │
│                                                       │
└─────────────────────────────────────────────────────┘
```

#### Empty State

When no tasks match the selected pivot, shows a centered empty state with an `Inbox` icon and contextual message.

---

### 3.4 DesktopView.tsx — Tab Buttons & Sidebar Flatten

**File:** `src/components/views/DesktopView.tsx`

#### Changes

**1. New State: `tasksSubView`**

```typescript
const [tasksSubView, setTasksSubView] = useState<'My Tasks' | 'Task Board'>(() => {
  if (isPreview) return 'My Tasks';
  const stored = localStorage.getItem('ZYNC-tasks-sub-view');
  return stored === 'Task Board' ? 'Task Board' : 'My Tasks';
});
```

Persisted to `localStorage` under key `ZYNC-tasks-sub-view`.

**2. Sidebar Flattened**

The Tasks sidebar item no longer has nested children. It's a flat item like Dashboard, Projects, etc. The sub-view selection (My Tasks vs Task Board) is handled via tab buttons in the header area instead.

**3. Tab Buttons in Header**

When `activeSection === 'Tasks'`, a row of tab buttons appears below the header:

```tsx
{activeSection === 'Tasks' && (
  <div className="px-6 pb-3 shrink-0">
    <div className="inline-flex items-center gap-1 bg-card/50 border border-border/10 rounded-xl p-1 backdrop-blur-md">
      {(['My Tasks', 'Task Board'] as const).map((label) => (
        <button
          key={label}
          onClick={() => setTasksSubView(label)}
          className={cn(
            'h-8 px-3 text-xs font-medium rounded-lg transition-colors',
            tasksSubView === label
              ? 'bg-secondary text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
)}
```

**4. View Routing**

```typescript
case 'Tasks':
  return tasksSubView === 'Task Board' ? (
    <TaskBoardView currentUser={currentUser} users={usersList} />
  ) : (
    <TasksView currentUser={currentUser} users={usersList} />
  );
```

**5. Header Title**

The header shows only `activeSection` (e.g. "Tasks") without any sub-title, keeping it clean.

---

## 4. Status Flow & Column Mapping

### Complete Status Lifecycle

```
┌─────────┐     ┌────────┐     ┌─────────────┐     ┌──────┐     ┌───────────┐
│  Ready  │ ──► │ Active │ ──► │ In Progress │ ──► │ Done │ ──► │ PR Raised │
└─────────┘     └────────┘     └─────────────┘     └──────┘     └───────────┘
   │                │                │                  │             │
   │                │                │                  │             │
   │      User opens     Any commit    Completion     PR opened    PR merged
   │      / sees task    pushed to      commit           via         → merged
   │      (card click)   task branch    message          webhook       flag set
   │                      (webhook)     (webhook)            │
   │                                                                │
   └────────────────────────────────────────────────────────────────┘
              (Also: In Progress → PR Raised directly if
               PR is opened without a completion commit)
```

### Column Definitions

| Column | Meaning | Trigger |
|--------|---------|---------|
| **Ready** | Task has been assigned but not yet opened | Task created / assigned |
| **Active** | User has opened or seen the task | Card click by assignee (frontend auto-transition) |
| **In Progress** | Someone is making commits on the branch | Push webhook detects commit on `task/*` branch |
| **Done** | Completion commit message has been pushed | Push webhook detects `completionCommitMessage` match |
| **PR Raised** | User has raised a PR | PR webhook (existing) or manual PR creation |

### Status Normalization Map

Backend may store various status strings. The frontend normalizes them:

| Backend Status | Display Column |
|----------------|----------------|
| `Pending` | Ready |
| `Backlog` | Ready |
| `Ready` | Ready |
| `Active` | Active |
| `In Progress` | In Progress |
| `Completed` | Done |
| `Done` | Done |
| `In Review` | PR Raised |
| `PR Raised` | PR Raised |

---

## 5. Real-Time Sync Architecture

### Socket Event Flow

```
GitHub Webhook
      │
      ▼
githubWebhookWorker.js
      │
      ├─ Updates ProjectTask in MongoDB
      │
      └─ taskIO.emitToProject(projectId, 'task-updated', {
           projectId, stepId, taskId, changes, actor
         })
              │
              ▼
     Socket.io /tasks namespace
              │
              ▼
     Frontend: useTaskUpdates hook
              │
              ├─ Joins room for each project ID
              │
              └─ onTaskChange callback
                    │
                    ▼
              TaskBoardView.loadData()
                    │
                    ▼
              Re-fetches all projects
              → KanbanBoard re-renders
              → Card animates to new column
              → (framer-motion layout animation)
```

### Merge PR Socket Flow

```
User clicks "Merge" in TaskDetailDialog
      │
      ▼
POST /api/projects/tasks/:taskId/merge-pr
      │
      ├─ GitHub API: Merge PR (squash)
      ├─ GitHub API: Delete branch
      ├─ MongoDB: Set merged = true
      │
      └─ taskIO.emitToProject(projectId, 'task-updated', {
           changes: { merged: true }
         })
              │
              ▼
     Frontend: useTaskUpdates
              │
              ▼
     TaskBoardView re-fetches
     → KanbanBoard updates
     → TaskDetailDialog shows "Merged" state
```

---

## 6. Pending / Known Issues

### Still To Do

| # | Task | Priority | Status |
|---|------|----------|--------|
| 1 | Fix missing user/team avatars in pivot selectors (TaskBoardView) | Medium | Pending |
| 2 | Move tab buttons directly into DesktopView header row (remove extra row) | Medium | Pending |
| 3 | Run lint/type verification (`npm run lint`, `tsc --noEmit`) | Medium | Pending |
| 4 | End-to-end testing of full webhook → board flow | High | Pending |

### Known Limitations

- **Git activity endpoint** fetches max 30 commits per call. Tasks with extensive commit history will only show the most recent 30.
- **Avatar fetching in pivot selectors:** The `SelectItem` components in TaskBoardView currently show text only (user display name, repo name, team name). User photos and team logos are not rendered in the dropdown items. Fixing this requires wrapping `SelectItem` content with `Avatar`/`TeamLogoDisplay` components.
- **Tab buttons placement:** Currently rendered as a separate row below the header. User requested they be merged directly into the header title row to save vertical space.
- **Completion commit matching:** The webhook matches `commit.message.trim() === task.completionCommitMessage.trim()` — an exact match. Multi-line commit messages or slight variations won't match.

---

## Appendix: File Reference Index

| File | Absolute Path |
|------|---------------|
| ProjectTask Model | `backend/models/ProjectTask.js` |
| Webhook Worker | `backend/services/githubWebhookWorker.js` |
| Project Routes | `backend/routes/projectRoutes.js` |
| KanbanBoard | `src/components/workspace/KanbanBoard.tsx` |
| TaskDetailDialog | `src/components/workspace/TaskDetailDialog.tsx` |
| TaskBoardView | `src/components/views/TaskBoardView.tsx` |
| DesktopView | `src/components/views/DesktopView.tsx` |
| TeamLogoDisplay | `src/components/ui/TeamLogoDisplay.tsx` |
| useTaskUpdates Hook | `src/hooks/use-task-updates.ts` |
| useTaskPersistence Hook | `src/hooks/useTaskPersistence.ts` |

---

*Document generated on July 26, 2026. Reflects the state of the codebase after the Task Board Redesign & Automation implementation session.*
