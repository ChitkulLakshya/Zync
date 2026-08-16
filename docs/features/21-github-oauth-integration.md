# 21 — GitHub OAuth Integration

**NEW document** — GitHub connect/disconnect, OAuth callback, installation flow, repos, stats, events, contributions

---

## Feature Summary

GitHub integration in Zync supports two modes: (1) OAuth token-based access (personal access token or OAuth flow) and (2) GitHub App installation-based access. Users connect their GitHub account, which enables repo listing, architecture analysis, task branch automation, collaborator invites, and contribution stats.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  SettingsView.tsx → Integrations tab                    │
│  ├─ "Connect GitHub" button                             │
│  │   └─ Opens GitHub OAuth popup                        │
│  │      └─ Returns access token → POST /api/github/connect │
│  ├─ "Install GitHub App" link                           │
│  │   └─ Redirects to GitHub App install URL             │
│  │      └─ Callback: POST /api/github/install           │
│  ├─ "Disconnect" button → DELETE /api/github/disconnect │
│  └─ GitHub stats panel (contributions graph)            │
│                                                         │
│  ProjectWorkspace.tsx                                   │
│  ├─ Repo selection dropdown (GET /api/github/repos)     │
│  ├─ Architecture analysis (uses installation Octokit)   │
│  └─ Task branch creation (uses installation Octokit)    │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ROUTES ──────────────────────┐
│                                                         │
│  backend/routes/github.js (900+ lines)                  │
│                                                         │
│  POST   /connect              → store OAuth token       │
│  DELETE /disconnect           → remove GitHub link      │
│  POST   /callback             → exchange code for token │
│  GET    /repos                → list user's repos       │
│  POST   /install              → store installation ID   │
│  GET    /installation-status  → check app installation  │
│  GET    /user-repos           → list repos via install  │
│  GET    /stats                → GitHub stats            │
│  GET    /events               → recent GitHub events    │
│  GET    /contributions        → contribution graph data │
│  GET    /readme               → fetch repo README       │
│  PATCH  /repos/:owner/:repo/settings → edit repo       │
│                                                         │
│  Services:                                              │
│  ├─ githubInstallation.js → Octokit builder (self-heal) │
│  ├─ encryption.js → AES-256 token encryption            │
│  └─ cache.js → Redis caching for repos/stats            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/github.js` (900+ lines)

### POST /connect (lines 169-225)
- **Auth:** required
- **Input:** `{ accessToken }` — GitHub OAuth access token from popup
- **Logic:**
  1. `encrypt(accessToken)` — AES-256 encrypt token
  2. `User.findOneAndUpdate({ uid }, { $set: { githubIntegration: { connected: true, accessToken: encrypted, connectedAt: new Date() } } })`
  3. Invalidate cache
- **Response:** `{ message: "GitHub connected", user }`

### DELETE /disconnect (lines 228-257)
- **Auth:** required
- **Logic:**
  1. `User.findOneAndUpdate({ uid }, { $set: { githubIntegration: { connected: false, accessToken: null, username: null } } })`
  2. Invalidate cache
- **Response:** `{ message: "GitHub disconnected" }`

### POST /callback (lines 260-331)
- **Auth:** required
- **Input:** `{ code }` — OAuth code from GitHub redirect
- **Logic:**
  1. Exchange code for access token via `POST https://github.com/login/oauth/access_token`
  2. Fetch GitHub user profile: `GET https://api.github.com/user`
  3. Encrypt access token
  4. Store in User document: `githubIntegration: { connected, accessToken, username, connectedAt }`
  5. Invalidate cache
- **Response:** `{ message: "GitHub connected", user, githubUsername }`

### GET /repos (lines 334-402)
- **Auth:** required
- **Logic:**
  1. Get user's encrypted GitHub token
  2. Decrypt token
  3. `GET https://api.github.com/user/repos?per_page=100&sort=updated`
  4. Return repo list (name, full_name, private, description, updated_at)
- **Cache:** Redis with 60s TTL

### POST /install (lines 405-444)
- **Auth:** required
- **Input:** `{ installationId }` — from GitHub App install callback
- **Logic:**
  1. Store `installationId` on User document
  2. `User.findOneAndUpdate({ uid }, { $set: { 'githubIntegration.installationId': installationId } })`
  3. Invalidate installation caches
- **Response:** `{ message: "Installation saved" }`

### GET /installation-status (lines 448-548)
- **Auth:** required
- **Logic:**
  1. Check if user has `installationId` in GitHub integration
  2. If yes: verify installation is still valid via GitHub API
  3. Self-healing: if installation ID is stale, re-discover from GitHub
  4. Return `{ installed: boolean, installationId }`
- **Purpose:** Frontend uses this to show "Install GitHub App" vs "Connected"

### GET /user-repos (lines 552-674)
- **Auth:** required
- **Query:** `?refresh=true` — force refresh, bypass cache
- **Logic:**
  1. Get installation Octokit for user (self-healing resolver)
  2. List repos accessible to installation
  3. Cache result in Redis
  4. On refresh: invalidate cache + re-fetch
- **Response:** Array of repos with name, owner, private, description

### GET /stats (lines 677-720)
- **Auth:** required
- **Logic:**
  1. Decrypt GitHub token
  2. Fetch user profile: `GET https://api.github.com/user`
  3. Return: public_repos, followers, following, total_private_repos
- **Response:** GitHub profile stats

### GET /events (lines 723-774)
- **Auth:** required
- **Logic:**
  1. Decrypt GitHub token
  2. `GET https://api.github.com/users/{username}/events/public`
  3. Return recent events (push, pull_request, issues, etc.)
- **Response:** Array of GitHub events

### GET /contributions (lines 777-854)
- **Auth:** required
- **Logic:**
  1. Decrypt GitHub token
  2. Fetch contribution data (scraped from GitHub profile or API)
  3. Return daily contribution counts for contribution graph
- **Response:** `[{ date, count }, ...]`

### GET /readme (lines 857-906)
- **Auth:** required
- **Query:** `?owner=...&repo=...`
- **Logic:**
  1. Decrypt GitHub token
  2. `GET https://api.github.com/repos/{owner}/{repo}/readme`
  3. Decode base64 content
  4. Return README markdown
- **Response:** `{ content: string, encoding: string }`

### PATCH /repos/:owner/:repo/settings (lines 908+)
- **Auth:** required
- **Input:** `{ description?, homepage?, topics? }`
- **Logic:**
  1. Get installation Octokit
  2. `PATCH /repos/{owner}/{repo}` via Octokit
  3. Update repo settings on GitHub
- **Response:** Updated repo details

---

## Two-Mode GitHub Access

### Mode 1: OAuth Token (Personal Access)
- User connects via GitHub OAuth popup
- Access token stored encrypted in `User.githubIntegration.accessToken`
- Used for: `/repos`, `/stats`, `/events`, `/contributions`, `/readme`
- Limitation: Can only access user's own repos, not org repos (unless token has org scope)

### Mode 2: GitHub App Installation
- User installs Zync GitHub App on their account/org
- `installationId` stored in `User.githubIntegration.installationId`
- Used for: `/user-repos`, task branch creation, PR merging, collaborator invites
- Advantage: App-level permissions, can access org repos, installation-scoped tokens
- Self-healing: `getInstallationOctokit()` re-discovers stale installation IDs

---

## Self-Healing Installation Resolver
**File:** `backend/utils/githubInstallation.js`

```
getInstallationOctokit(ownerUid):
  1. Get user's stored installationId
  2. Create installation-scoped Octokit
  3. If token is stale/invalid:
     a. Re-fetch installations from GitHub
     b. Find matching installation
     c. Update stored installationId
     d. Create new Octokit
  4. Return Octokit instance
```

- Prevents hard failures when installation ID changes (repo deleted, app reinstalled)
- Called by: project routes (branch creation, PR merge), collaborator invite, repo settings

---

## Frontend Trace

### GitHub OAuth Popup Flow
**File:** `src/components/views/SettingsView.tsx`
1. User clicks "Connect GitHub"
2. Opens popup: `window.open(GITHUB_OAUTH_URL)`
3. Popup redirects to GitHub auth page
4. After auth, GitHub redirects back with `code` param
5. Popup sends code to parent window via `postMessage`
6. Parent calls `POST /api/github/callback` with code
7. On success: update `useMe` query, show connected state

### GitHub App Install Flow
1. User clicks "Install GitHub App"
2. `window.open(GITHUB_APP_INSTALL_URL)`
3. User selects org/account on GitHub
4. GitHub redirects to callback URL with `installation_id`
5. Frontend calls `POST /api/github/install` with installationId
6. On success: update installation status

### GitHub Stats Panel
**File:** `src/components/dashboard/GitHubStats.tsx`
- Fetches `GET /api/github/contributions`
- Renders contribution graph (calendar heatmap)
- Shows: total repos, followers, following

---

## Database Layer

### User.githubIntegration (Mongoose Mixed field)
```js
{
  connected: boolean,
  accessToken: string (encrypted),  // AES-256 encrypted
  username: string,
  connectedAt: string (ISO date),
  installationId: number | null
}
```

- `accessToken` is excluded from API responses via `.select('-githubIntegration.accessToken')`
- `installationId` is used by `githubInstallation.js` to create Octokit instances

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | Unauthorized |
| GitHub token missing/invalid | 400 | `{ message: "GitHub not connected" }` |
| GitHub API rate limited | 429 | Error from GitHub |
| Installation not found | 404 | `{ message: "Installation not found" }` |
| Repo not found | 404 | Error from GitHub |
| Encryption fails | 500 | `{ message: "Server error" }` |
| Server error | 500 | `{ message: "Server error" }` |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_CLIENT_ID` | Yes | OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | Yes | OAuth app client secret |
| `GITHUB_APP_ID` | Yes | GitHub App ID |
| `GITHUB_PRIVATE_KEY` | Yes | GitHub App private key (PEM) |
| `ENCRYPTION_KEY` | Yes (prod) | AES-256 encryption key for tokens |
| `GITHUB_APP_REDIRECT_URI` | No | OAuth callback URL |

---

## Cross-References

- [14-project-crud.md](./14-project-crud.md) — Uses GitHub installation for repo creation
- [16-task-management.md](./16-task-management.md) — Task branch automation via Octokit
- [22-github-webhook-handler.md](./22-github-webhook-handler.md) — GitHub App webhooks
- [02-security-auth-architecture.md](./02-security-auth-architecture.md) — Token encryption
- [09-user-profile-management.md](./09-user-profile-management.md) — /sync-github endpoint
