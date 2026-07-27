# GitHub App Installation False-Negative Fix

## Overview
This document details the investigation and resolution of a critical bug where the **"Install Zync GitHub App"** prompt was incorrectly displayed on the "My Workspace" page when clicking "Add Project" or "Link GitHub Repository" — even though the app was already installed. The bug was most reliably triggered by **creating a repository** from within Zync or **deleting a repository** on GitHub that was linked to a workspace project.

## The Problem

### Symptoms
- User has the Zync GitHub App installed on their GitHub account.
- User creates a new repository via Zync's "Add Project" modal, or deletes a linked repo on GitHub.
- On the next open of "Add Project" or "Link GitHub Repository", the UI shows:
  > "No repositories found. [Install Zync App on GitHub]"
- The prompt persists indefinitely, even after page refresh.
- The only escape was to uninstall and reinstall the GitHub App.

### Root Cause Analysis

The bug had **four independent root causes** that compounded:

#### 1. Backend: `installationId` Wiped on Transient Errors
The `/user-repos` endpoint in `backend/routes/github.js` treated `user.githubIntegration.installationId` as the single source of truth. Whenever a GitHub API call returned `401` or `404`, the code nulled the `installationId` from the `User` document.

However, GitHub returns `401`/`404` for many **transient** reasons that have nothing to do with the app being uninstalled:
- **Stale Octokit tokens**: Octokit caches installation access tokens for ~1 hour. Creating or deleting a repo invalidates these cached tokens, causing `401 Bad credentials` on the next call.
- **Rate limiting** / secondary rate limits.
- **Transient GitHub outages** (5xx responses sometimes surfaced as 401/404).

Once the `installationId` was nulled, every subsequent request short-circuited to `notInstalled: true`, and the UI showed the install prompt **forever**.

#### 2. Frontend: `repos.length === 0` Treated as "Not Installed"
`Workspace.tsx` used a naive check: if `repos.length === 0`, it unconditionally showed the "Install Zync App on GitHub" link. This meant any failure — transient error, rate limit, stale token, or genuinely having zero accessible repos — all collapsed into the same "install the app" message.

#### 3. `generateProjectRoutes.js` / `projectRoutes.js`: New Repo Not Granted to App
Repos created via Zync used the user's **personal access token** (via `POST /user/repos`). On a "selected repositories" installation, the GitHub App would not automatically gain access to the new repo. The code never called `PUT /user/installations/:id/repositories/:repoId` to grant the App access, so the App couldn't see the newly created repo — which looked identical to "app not installed" from the frontend's perspective.

#### 4. Webhooks: Installation Events Not Synced
The webhook worker (`githubWebhookWorker.js`) did not handle `installation.deleted`, `installation.created`, `installation.unsuspend`, or `new_permissions_accepted` actions. This meant:
- If a user uninstalled the app on GitHub, the `installationId` stayed in the DB (false "installed").
- If a user reinstalled (which mints a new `installationId`), the old stale ID remained, causing all API calls to fail.

---

## The Solution

A multi-layered fix was implemented across 7 files, centered on a new **self-healing installation resolver**.

### Architecture: Self-Healing Installation Resolver

The core insight: **the stored `installationId` is a cache, not the truth. GitHub is the truth.**

The new `backend/utils/githubInstallation.js` module implements a 3-step resolution strategy:

1. **VERIFY** — Check the stored ID against `GET /app/installations/{id}` (authenticated as the App via JWT). Returns `valid`, `suspended`, `missing`, or `unknown`.
2. **REDISCOVER** — If the stored ID is missing/stale, query `GET /users/{login}/installation` and `GET /orgs/{login}/installation` to find the current installation. Re-persist the discovered ID.
3. **REPORT** — Only report `NOT_INSTALLED` when GitHub authoritatively returns `404` on rediscovery. Every other failure is treated as `TRANSIENT` and the stored ID is preserved.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    resolveInstallation(uid)                         │
│                                                                     │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │ 1. VERIFY   │───▶│ 2. REDISCOVER │───▶│ 3. REPORT             │  │
│  │ stored ID   │    │ by login      │    │ OK / NOT_INSTALLED /  │  │
│  │ vs GitHub   │    │ (user + org)  │    │ SUSPENDED / UNKNOWN   │  │
│  └─────────────┘    └──────────────┘    └───────────────────────┘  │
│         │                   │                        │              │
│    valid? → OK         found? → persist          404? → clear ID   │
│    suspended? → STOP   not found? → check        else → keep ID    │
│    unknown? → OK       authoritative?             (transient)      │
│    missing? → rediscover                               │            │
└─────────────────────────────────────────────────────────────────────┘
```

### Files Changed

---

#### 1. `backend/utils/githubAppAuth.js`
**Change**: Exported `getAppJwt` for reuse by the installation resolver.

```js
module.exports = { getInstallationAccessToken, getAppJwt };
```

**Why**: The resolver needs to authenticate as the GitHub App itself (via JWT) to verify and rediscover installations. Previously `getAppJwt` was internal-only.

---

#### 2. `backend/utils/githubInstallation.js` (NEW FILE)
**Change**: Created the self-healing installation resolver module.

**Key exports**:
- `RESOLUTION` — Enum: `OK`, `NOT_INSTALLED`, `NOT_CONNECTED`, `SUSPENDED`, `UNKNOWN`
- `resolveInstallation(uid, { forceRefresh })` — The 3-step resolver described above. Returns `{ installationId, reason, login }`.
- `getInstallationOctokit(uid, { forceRefresh })` — Builds an installation-scoped Octokit client. Creates a fresh `App` instance each time to avoid Octokit's internal token cache. Retries once with `forceRefresh: true` if the first attempt fails with a non-app-specific error.
- `persistInstallationId(uid, installationId)` — Saves a resolved installation ID to the `User` document and invalidates derived caches.
- `invalidateInstallationCaches(uid)` — Clears both `gh:installation:{uid}` and `gh:user-repos:{uid}` from Redis.
- `verifyInstallationId(id)` — Checks if a stored ID is `valid`, `suspended`, `missing`, or `unknown`.
- `discoverInstallationId(login)` — Queries GitHub by user login and org login to find an installation ID.
- `installationCacheKey(uid)` / `reposCacheKey(uid)` — Redis key helpers.

**Caching**: Installation resolution is cached in Redis for 5 minutes (`INSTALLATION_CACHE_TTL_SECONDS = 300`). Long enough to avoid hammering GitHub, short enough that a real uninstall is noticed quickly.

**Critical design decision**: `isAuthoritativeMissing(error)` only returns `true` for HTTP `404` or `410`. A `401` (which could be a stale token or server misconfiguration) is treated as transient — the stored ID is never cleared for it.

---

#### 3. `backend/routes/github.js`
**Changes**:

**`/user-repos` endpoint (rewritten)**:
- Now uses `getInstallationOctokit(uid, { forceRefresh })` instead of manually constructing Octokit.
- Distinguishes between 5 response states:
  - `notConnected` (400) — No GitHub account linked at all.
  - `notInstalled` (400) — GitHub authoritatively confirms no installation. Only state that clears `installationId`.
  - `suspended` (400) — Installation exists but is suspended.
  - `transient` (503) — Could not reach GitHub. Does NOT clear `installationId`.
  - `noRepoAccess` (200) — App is installed but has zero accessible repos. Returns `repos: []` with `noRepoAccess: true`. Does NOT show install prompt.
- Extracted `listInstallationRepos(octokit)` helper for retry capability.
- On first `listInstallationRepos` failure, retries once with `getInstallationOctokit(uid, { forceRefresh: true })` to handle stale tokens.
- Supports `?refresh=1` query param to bypass Redis cache.

**`/installation-status` endpoint (NEW)**:
- Returns granular installation status: `{ connected, installed, notInstalled, suspended, indeterminate, login }`.
- Uses `resolveInstallation(uid, { forceRefresh: true })`.
- Returns `503` with `indeterminate: true` on transient failures — the UI must NOT show the install prompt in this case.

**`/install` endpoint (updated)**:
- Now calls `invalidateInstallationCaches(uid)` after saving the installation ID, in addition to the existing `cache.delByPattern`.

---

#### 4. `backend/routes/projectRoutes.js`
**Changes**:

**`buildInstallationOctokitFromOwner` (simplified)**:
- Now delegates to `getInstallationOctokit(ownerUid)` from the resolver, instead of manually constructing Octokit with the raw stored `installationId`.
- This means branch creation, PR merging, and collaborator lookups all benefit from the self-healing logic.

**`/new-repo` endpoint (updated)**:
- After creating a repo with the user's personal token, now calls `PUT /user/installations/:installationId/repositories/:repoId` to grant the Zync GitHub App access to the new repo.
- Best-effort: a failure (e.g., 304 = already accessible on "all repositories" installs) does not fail project creation.
- Replaced `cache.invalidate('gh:user-repos:uid')` with `invalidateInstallationCaches(ownerUid)` to bust both repo and installation token caches.

---

#### 5. `backend/routes/generateProjectRoutes.js`
**Changes**:

Same fix as `projectRoutes.js` `/new-repo`:
- After creating a repo via `POST /user/repos`, grants the App access via `PUT /user/installations/:id/repositories/:repoId`.
- Calls `invalidateInstallationCaches(uid)` instead of just `cache.invalidate('gh:user-repos:uid')`.

**Why this file separately**: `generateProjectRoutes.js` has its own `/new-repo` endpoint that was not using the installation resolver at all. It created repos with the personal token and only invalidated the repo cache, leaving the installation token cache stale.

---

#### 6. `backend/services/githubWebhookWorker.js`
**Changes**:

**Installation event handling (rewritten)**:
Now handles `installation` and `installation_repositories` events with full action coverage:
- `action === 'deleted'` — Clears `installationId` from the `User` document and invalidates caches. This is the **only** place allowed to conclude "the app was uninstalled".
- `action === 'created' | 'unsuspend' | 'new_permissions_accepted'` — Persists the current `installationId` via `persistInstallationId()` and invalidates caches. This is what lets a re-install (which mints a new ID) reattach to the right Zync user immediately.
- All other actions (e.g., `added`, `removed` repositories) — Invalidates caches so the next read reflects the updated repo set.

**User matching**: Matches by stored `installationId` first, then falls back to matching by `githubIntegration.username` (GitHub login). The login fallback is what lets a re-install with a new ID find the right user.

**`repository.deleted` event (updated)**:
- Now calls `invalidateInstallationCaches(linkedProject.ownerUid)` in addition to invalidating project caches. Deleting a repo invalidates cached installation tokens, so both must be cleared.

---

#### 7. `src/components/workspace/Workspace.tsx`
**Changes**:

**`repoLoadState` state variable (NEW)**:
```typescript
const [repoLoadState, setRepoLoadState] = useState<
  'idle' | 'ok' | 'not-connected' | 'not-installed' | 'suspended' | 'no-repo-access' | 'error'
>('idle');
```

**`loadRepos` function (NEW)**:
- Single source of truth for repo loading. Replaces duplicated inline fetch logic in both `handleOpenLinkModal` and `handleOpenCreateModal`.
- Accepts `{ force: boolean }` option. When `true`, appends `?refresh=1` to the API call to bypass Redis cache.
- Sets `repoLoadState` based on backend response:
  - `response.ok` + repos → `ok`
  - `response.ok` + empty repos → `no-repo-access`
  - `data.notInstalled` → `not-installed`
  - `data.notConnected` → `not-connected`
  - `data.suspended` → `suspended`
  - Everything else → `error`

**`handleOpenLinkModal` (updated)**:
- Now calls `loadRepos({ force: true })` — always force-refreshes so a stale cache from a previous open doesn't show the wrong state.

**`handleOpenCreateModal` (updated)**:
- Replaced old inline fetch with `loadRepos({ force: true })`.

**Both "No repositories found" UI blocks (rewritten)**:
Both the "Link GitHub Repository" dialog and the "Add Project" Import tab now show state-aware messaging:

| `repoLoadState` | Message shown | Install link? |
|---|---|---|
| `not-installed` | "The Zync GitHub App is not installed on your account." | Yes |
| `not-connected` | "Please connect your GitHub account first." | No |
| `suspended` | "The Zync GitHub App installation is suspended. Re-enable it on GitHub." | No |
| `no-repo-access` | "No repositories accessible. Grant the Zync App access to repositories on GitHub." | Yes (manage permissions) |
| `error` | "Could not load repositories. Please try again." | No |
| default (idle/ok with 0 repos) | "No repositories found." | No |

---

## Data Flow After Fix

```
User clicks "Add Project"
        │
        ▼
Workspace.tsx: loadRepos({ force: true })
        │
        ▼
GET /api/github/user-repos?refresh=1
        │
        ▼
github.js: getInstallationOctokit(uid, { forceRefresh: true })
        │
        ▼
githubInstallation.js: resolveInstallation(uid)
        │
        ├── 1. VERIFY stored ID ── GET /app/installations/{id} (App JWT)
        │       ├── valid → use it
        │       ├── suspended → return SUSPENDED
        │       ├── unknown → use stored ID anyway (transient)
        │       └── missing → fall through to rediscover
        │
        ├── 2. REDISCOVER ── GET /users/{login}/installation + /orgs/{login}/installation
        │       ├── found → persistInstallationId() → use it
        │       └── 404 authoritative → clear ID → return NOT_INSTALLED
        │
        └── 3. Build fresh Octokit (no cached token)
                │
                ▼
        GET /installation/repositories (paginated)
                │
                ├── success → return repos (or noRepoAccess if empty)
                └── failure → retry once with forceRefresh
                        ├── success → return repos
                        └── GITHUB_APP_NOT_INSTALLED → return notInstalled
                            └── other → return transient (503)
        │
        ▼
Workspace.tsx: setRepoLoadState based on response
        │
        ▼
UI shows appropriate message (install link ONLY if not-installed)
```

## Webhook Sync Flow

```
GitHub sends webhook
        │
        ├── installation: deleted
        │   └── Clear installationId from User → invalidate caches
        │
        ├── installation: created / unsuspend / new_permissions_accepted
        │   └── persistInstallationId() → invalidate caches
        │
        ├── installation_repositories: added / removed
        │   └── invalidate caches (repo set changed)
        │
        └── repository: deleted
            └── Delete linked project + steps + tasks → invalidate all caches
```

## Testing Checklist

- [ ] Open "Add Project" modal when app is installed → should show repo list, not install prompt
- [ ] Create a new repo via Zync → immediately reopen "Add Project" → should show the new repo, not install prompt
- [ ] Delete a linked repo on GitHub → reopen "Add Project" → should show remaining repos, not install prompt
- [ ] Uninstall the Zync App on GitHub → reopen "Add Project" → should show "Install Zync App on GitHub" link
- [ ] Reinstall the Zync App on GitHub → reopen "Add Project" → should show repo list again (webhook persists new ID)
- [ ] Open "Link GitHub Repository" on a project → should show repo list
- [ ] App installed but zero repos granted → should show "Grant the Zync App access" message, not install prompt
- [ ] GitHub API down → should show "Could not load repositories. Please try again." — never the install prompt
- [ ] App suspended on GitHub → should show "installation is suspended" message

## Files Modified

| File | Type | Summary |
|---|---|---|
| `backend/utils/githubAppAuth.js` | Modified | Exported `getAppJwt` |
| `backend/utils/githubInstallation.js` | **New** | Self-healing installation resolver |
| `backend/routes/github.js` | Modified | Rewrote `/user-repos`, added `/installation-status`, updated `/install` |
| `backend/routes/projectRoutes.js` | Modified | `buildInstallationOctokitFromOwner` uses resolver; `/new-repo` grants App access |
| `backend/routes/generateProjectRoutes.js` | Modified | `/new-repo` grants App access + invalidates installation caches |
| `backend/services/githubWebhookWorker.js` | Modified | Handles installation created/deleted/unsuspend; repo deletion busts installation caches |
| `src/components/workspace/Workspace.tsx` | Modified | `repoLoadState` tracking, `loadRepos` helper, state-aware messaging in both modals |
