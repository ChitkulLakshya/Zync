# 44 — Link & Repo Management

**NEW document** — GitHub repo linking/unlinking to projects, repo sync, project-repo association

---

## Feature Summary

The link routes handle associating GitHub repositories with Zync projects. Users can link a repo (stores repo ID on project), unlink a repo (removes association), and sync repo details. This enables architecture analysis, task branch automation, and PR merging.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  ProjectWorkspace.tsx → Settings tab                    │
│  ├─ Repo selector dropdown                              │
│  │   └─ GET /api/github/repos → list repos              │
│  ├─ "Link Repo" button                                  │
│  │   └─ POST /api/links/link-repo                       │
│  ├─ "Unlink Repo" button                                │
│  │   └─ POST /api/links/unlink-repo                     │
│  └─ Linked repo display (name, URL, branch)             │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  backend/routes/linkRoutes.js                           │
│                                                         │
│  POST /link-repo   → associate repo with project        │
│  POST /unlink-repo → remove repo from project           │
│                                                         │
│  Logic (link):                                          │
│  1. Verify project ownership                            │
│  2. Update project: githubRepoId, githubRepoName,       │
│     githubRepoOwner, githubDefaultBranch                │
│  3. Invalidate project cache                            │
│  4. Return updated project                              │
│                                                         │
│  Logic (unlink):                                        │
│  1. Verify project ownership                            │
│  2. Clear repo fields on project                        │
│  3. Invalidate cache                                    │
│  4. Return updated project                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/linkRoutes.js`

### POST /link-repo (line 85)
- **Auth:** required
- **Input:** `{ projectId, githubRepoId }`
- **Logic:**
  1. Get project: `Project.findById(projectId)`
  2. Verify ownership: `project.ownerUid === uid` or team membership
  3. Fetch repo details from GitHub API (using user's token)
  4. Update project:
     ```js
     project.githubRepoId = githubRepoId;
     project.githubRepoName = repoData.name;
     project.githubRepoOwner = repoData.owner.login;
     project.githubDefaultBranch = repoData.default_branch;
     await project.save();
     ```
  5. Invalidate cache: `cache.invalidate('projects:' + uid)`
  6. Return updated project

### POST /unlink-repo (line 121)
- **Auth:** required
- **Input:** `{ projectId, githubRepoId }`
- **Logic:**
  1. Get project, verify ownership
  2. Clear repo fields:
     ```js
     project.githubRepoId = null;
     project.githubRepoName = null;
     project.githubRepoOwner = null;
     project.githubDefaultBranch = null;
     await project.save();
     ```
  3. Invalidate cache
  4. Return updated project

---

## Database Changes

### Project Model — GitHub Fields
| Field | Type | Notes |
|---|---|---|
| `githubRepoId` | Number | GitHub repo ID |
| `githubRepoName` | String | Repo name (e.g., "zync-meet") |
| `githubRepoOwner` | String | Owner login (e.g., "zync-meet") |
| `githubDefaultBranch` | String | Default branch (e.g., "main") |

These fields are set on link and cleared on unlink.

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | Unauthorized |
| Project not found | 404 | `{ error: "Project not found" }` |
| Not owner | 403 | `{ error: "Unauthorized" }` |
| GitHub API error | 500 | `{ error: "Failed to fetch repo details" }` |
| Server error | 500 | `{ error: "Server error" }` |

---

## Cross-References

- [14-project-crud.md](./14-project-crud.md) — Project model with GitHub fields
- [21-github-oauth-integration.md](./21-github-oauth-integration.md) — GitHub token for API calls
- [25-ai-architecture-analysis.md](./25-ai-architecture-analysis.md) — Requires linked repo
- [16-task-management.md](./16-task-management.md) — Branch creation uses linked repo
