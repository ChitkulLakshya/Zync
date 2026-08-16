# 36 — Project Generation

**NEW document** — AI-powered project scaffolding, architecture blueprint generation, auto-create steps and tasks

---

## Feature Summary

Users can generate a complete project blueprint from a name and description. The AI generates a full architecture (frontend, backend, database, API design), and Zync auto-creates the project with default steps and suggested tasks based on the AI output.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  DashboardHome.tsx                                      │
│  ├─ "Generate Project" button                           │
│  │   └─ GenerateProjectDialog.tsx                       │
│  │      ├─ Name input                                   │
│  │      ├─ Description textarea                         │
│  │      ├─ Model selector (optional)                    │
│  │      └─ Submit → POST /api/generate-project          │
│  │                                                      │
│  ├─ GeneratedProjectPreview.tsx                         │
│  │   ├─ Architecture blueprint viewer                   │
│  │   ├─ Suggested pages, components, APIs               │
│  │   ├─ "Create Project" confirm button                 │
│  │   └─ "Discard" button                                │
│  │                                                      │
│  └─ Quota chip: "2/4 used this week"                    │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  backend/routes/generateProjectRoutes.js                │
│                                                         │
│  POST /  → generate project blueprint + create          │
│                                                         │
│  Flow:                                                  │
│  1. checkAndReserveGen(uid) → quota check               │
│  2. generateArchitectureWithKilo({ name, description }) │
│  3. Create Project from blueprint                       │
│  4. Create Steps from AI suggested pages/screens        │
│  5. Create ProjectTasks from AI suggested APIs/features │
│  6. Invalidate project cache                            │
│  7. If gateway fails: refundGen(uid, key)               │
│  8. Return project + architecture blueprint             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/generateProjectRoutes.js`

### POST / (line 199+)
- **Auth:** required
- **Input:** `{ name, description, ownerId }`
- **Logic:**
  1. **Reserve quota:** `checkAndReserveGen(uid)` — 429 if exceeded
  2. **Generate architecture:** `generateArchitectureWithKilo({ projectName: name, projectDescription: description })`
  3. **Create Project:** `Project.create({ name, description, ownerUid: uid })`
  4. **Create Steps from AI:** For each suggested page/screen, create a Step
  5. **Create Tasks from AI:** For each suggested API endpoint, create a ProjectTask
  6. **Invalidate cache:** `cache.invalidate('projects:' + uid)`
  7. **On failure:** `refundGen(uid, key)` — refund quota
  8. **Return:** `{ project, architecture, steps, tasks }`

### AI Blueprint Schema
```json
{
  "highLevel": "Detailed architecture explanation",
  "frontend": {
    "structure": "Frontend organization",
    "pages": ["Home", "Dashboard", "Settings", ...],
    "components": ["Header", "Sidebar", "Card", ...],
    "routing": "React Router DOM"
  },
  "backend": {
    "structure": "Modular controller-service pattern",
    "apis": ["/api/auth/login", "/api/users", ...],
    "controllers": ["AuthController", "UserController", ...],
    "services": ["AuthService", "EmailService", ...],
    "authFlow": "Firebase Auth JWT"
  },
  "database": {
    "design": "Document-based NoSQL",
    "collections": ["users", "projects", "tasks", ...],
    "relationships": ["User → Projects (1:N)", ...]
  },
  "apiFlow": "REST API with TanStack Query caching",
  "integrations": ["React", "Express", "MongoDB", ...]
}
```

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| Quota exceeded | 429 | `{ error: "Generation limit reached" }` |
| Gateway not configured | 503 | `{ error: "AI service not configured" }` |
| Gateway timeout | 500 | Error + quota refunded |
| Invalid AI response | 500 | Error + quota refunded |
| Server error | 500 | `{ error: "Server error" }` |

---

## Cross-References

- [25-ai-architecture-analysis.md](./25-ai-architecture-analysis.md) — Analyze existing repos
- [26-kilo-code-gateway.md](./26-kilo-code-gateway.md) — generateArchitectureWithKilo
- [27-usage-service-quota.md](./27-usage-service-quota.md) — Quota management
- [14-project-crud.md](./14-project-crud.md) — Project creation
- [15-project-steps-pipeline.md](./15-project-steps-pipeline.md) — Step creation
