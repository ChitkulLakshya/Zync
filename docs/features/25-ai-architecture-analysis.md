# 25 — AI Architecture Analysis

**NEW document** — Architecture analysis endpoint, repo context fetching, in-memory cache, Kilo Code Gateway integration

---

## Feature Summary

When a user links a GitHub repo to a Zync project, they can trigger an AI-powered architecture analysis. The backend fetches the repo's file tree and key files (package.json, README.md, etc.), sends them to the Kilo Code Gateway (an LLM API), and receives a structured JSON analysis of the project's architecture. Results are cached in-memory with a 6-hour TTL and invalidated when the repo's `pushed_at` timestamp changes.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  ProjectWorkspace.tsx → Architecture tab                │
│  ├─ "Analyze Architecture" button                       │
│  │   └─ POST /api/projects/:id/analyze-architecture     │
│  ├─ "Force Refresh" toggle                              │
│  │   └─ POST ...?forceRefresh=true                      │
│  ├─ ArchitectureViewer.tsx                              │
│  │   ├─ High-level summary                              │
│  │   ├─ Frontend structure (pages, components, routing) │
│  │   ├─ Backend structure (APIs, controllers, services) │
│  │   ├─ Database design (collections, relationships)    │
│  │   └─ Integrations list                               │
│  └─ Quota chip: "2/4 used this week"                    │
│      └─ GET /api/usage/quota                            │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  projectRoutes.js → POST /:id/analyze-architecture      │
│                                                         │
│  1. Load project + GitHub repo details                  │
│  2. Check in-memory architecture cache                  │
│     ├─ Cache key: projectId:repoFreshnessKey            │
│     ├─ TTL: 6 hours (ARCHITECTURE_CACHE_TTL_MS)         │
│     └─ Max entries: 100 (ARCHITECTURE_CACHE_MAX_ENTRIES)│
│  3. If cache hit + not forceRefresh: return cached      │
│  4. Build repo freshness key:                           │
│     ├─ GET /repos/{owner}/{repo} from GitHub API        │
│     └─ Key: full_name|default_branch|pushed_at|updated  │
│  5. If freshness matches cached: return cached          │
│  6. Reserve generation quota:                           │
│     └─ usageService.checkAndReserveGen(uid)             │
│        ├─ Per-user weekly limit (default 4)             │
│        └─ If exceeded: 429 "Generation limit reached"   │
│  7. Fetch repo context:                                 │
│     ├─ GET /repos/{owner}/{repo}/contents (file tree)   │
│     ├─ Fetch interesting files: package.json, README.md │
│     └─ Build context string                             │
│  8. Call Kilo Code Gateway:                             │
│     └─ analyzeArchitectureWithKilo({ repoContext, ... })│
│  9. Store result in memory cache                        │
│  10. If gateway fails: refundGen(uid, key)              │
│  11. Return architecture analysis JSON                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/projectRoutes.js`

### Architecture Cache Setup (lines 118-202)

#### Configuration
| Variable | Default | Description |
|---|---|---|
| `ARCHITECTURE_CACHE_TTL_MS` | 21600000 (6h) | Cache entry time-to-live |
| `ARCHITECTURE_CACHE_MAX_ENTRIES` | 100 | Maximum cached analyses |

#### In-Memory Cache
```js
const architectureAnalysisCache = new Map();
```
- **Key:** `${projectId}:${repoCacheKey}` (repo freshness fingerprint)
- **Value:** `{ architecture, expiresAt }`
- **Pruning:** Removes expired entries + evicts oldest if over max

#### Cache Functions
- `getArchitectureFromMemoryCache(projectId, repoCacheKey)` — returns cached or null
- `setArchitectureInMemoryCache(projectId, repoCacheKey, architecture)` — stores with TTL
- `pruneArchitectureMemoryCache()` — removes expired + evicts oldest

### Repo Freshness Key (lines 204-222)
```js
const buildRepoFreshnessKey = async (accessToken, owner, repo) => {
  const repoRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  const repoData = repoRes.data || {};
  return [
    repoData.full_name || `${owner}/${repo}`,
    repoData.default_branch || '',
    repoData.pushed_at || '',
    repoData.updated_at || '',
  ].join('|');
};
```
- If any of these change (new push, branch rename, repo rename), cache is invalidated
- Prevents serving stale architecture when repo has new commits

### fetchRepoContext (lines 291-370)
1. `GET /repos/{owner}/{repo}/contents` — root file tree
2. Build file list from response
3. Fetch interesting files:
   - `package.json` — dependencies, scripts
   - `requirements.txt` — Python deps
   - `go.mod` — Go deps
   - `README.md` — project description
4. Build context string: file structure + file contents
5. Return context for AI prompt

### POST /:id/analyze-architecture (lines 598-752)
1. Load project, get `githubRepoOwner` + `githubRepoName`
2. If no GitHub repo linked: 400 error
3. Get owner's GitHub access token (decrypt)
4. Build repo freshness key
5. Check cache:
   - If hit + freshness matches + not forceRefresh: return cached
6. `checkAndReserveGen(uid)` — check weekly quota
   - If `ok === false`: 429 "Generation limit reached"
7. `fetchRepoContext(accessToken, owner, repo)` — get file tree + contents
8. `analyzeArchitectureWithKilo({ repoContext, projectName: project.name })`
9. On success: `setArchitectureInMemoryCache(projectId, repoCacheKey, architecture)`
10. On failure: `refundGen(uid, key)` — refund the reserved generation
11. Return architecture JSON

---

## AI Response Schema

The Kilo Code Gateway returns a structured JSON object:

```json
{
  "highLevel": "Brief summary of the architecture",
  "frontend": {
    "structure": "Description of frontend organization",
    "pages": ["Inferred pages"],
    "components": ["Inferred key components"],
    "routing": "Inferred routing strategy"
  },
  "backend": {
    "structure": "Description of backend organization",
    "apis": ["Inferred API routes"],
    "controllers": ["Inferred controllers"],
    "services": ["Inferred services"],
    "authFlow": "Inferred authentication mechanism"
  },
  "database": {
    "design": "Description of data model",
    "collections": ["Inferred collections/tables"],
    "relationships": ["Inferred key relationships"]
  },
  "apiFlow": "How frontend communicates with backend",
  "integrations": ["React", "Express", "MongoDB", ...]
}
```

---

## Quota Integration

### checkAndReserveGen(uid)
- **Per-user weekly limit:** 4 generations (default, configurable)
- **Redis key:** `zync:kilo:user:<uid>:gens:wk:<isoWeek>`, TTL 7 days
- **Atomic reserve:** Lua script `INC_IF_UNDER_SCRIPT` — INCR only if under limit
- **Returns:** `{ ok, used, limit, reason, key }`
  - `ok: true` — reserved successfully
  - `ok: false, reason: 'weekly-limit'` — at/over limit → 429

### refundGen(uid, key)
- Called when Kilo Code Gateway fails
- DECRs the SAME weekly key that was reserved
- Prevents burning quota on failed calls
- Key stored from `checkAndReserveGen` return value

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No GitHub repo linked | 400 | `{ message: "No GitHub repo linked" }` |
| GitHub token missing | 400 | `{ message: "GitHub not connected" }` |
| Weekly quota exceeded | 429 | `{ message: "Generation limit reached" }` |
| Kilo Gateway timeout | 500 | Error + quota refunded |
| Kilo Gateway returns invalid JSON | 500 | Error + quota refunded |
| Repo contents fetch fails | 500 | Error + quota refunded |
| Server error | 500 | `{ message: "Server error" }` |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `KILO_CODE_GATEWAY_URL` | Yes | — | Kilo Code Gateway API URL |
| `KILO_CODE_GATEWAY_API_KEY` | Yes | — | API key for Kilo Gateway |
| `KILO_CODE_GATEWAY_MODEL` | No | `kilo-auto/free` | Model to use |
| `ARCHITECTURE_CACHE_TTL_MS` | No | 21600000 | Cache TTL (6 hours) |
| `ARCHITECTURE_CACHE_MAX_ENTRIES` | No | 100 | Max cached analyses |

---

## Cross-References

- [26-kilo-code-gateway.md](./26-kilo-code-gateway.md) — Gateway service deep dive
- [27-usage-service-quota.md](./27-usage-service-quota.md) — Quota management
- [14-project-crud.md](./14-project-crud.md) — Project endpoint that triggers analysis
- [21-github-oauth-integration.md](./21-github-oauth-integration.md) — GitHub token for repo access
- [03-performance-caching-strategy.md](./03-performance-caching-strategy.md) — Caching overview
