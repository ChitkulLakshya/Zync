# 📚 Zync Documentation Index

Organized navigation for all documentation in this repository. All docs are Markdown and live in the `docs/` folder.

---

## 🏛️ Architecture & System Design

| Document | Description |
|---|---|
| [Master Architecture Specification](architecture/ARCHITECTURE.md) | End-to-end system design, data flows, architectural decisions, and fact-check audit table. |
| [Tech Stack Overview](architecture/tech_stack_overview.md) | Complete dependency inventory (frontend, backend, databases, AI, testing). |
| [Service Inventory](architecture/service_inventory.md) | Cloud providers, hosting, AI gateways, and third-party APIs with configs. |
| [Security & Auth Architecture](architecture/security_and_auth_architecture.md) | Firebase JWT verification, Helmet headers, rate limiting, webhook HMAC validation. |
| [Performance & Caching Strategy](architecture/performance_and_caching_strategy.md) | Redis tiers, TanStack Query persisters, connection pooling, Event Loop monitoring. |

---

## 🤖 AI & Automation Subsystems

| Document | Description |
|---|---|
| [AI Project Architect](architecture/ai_project_architect.md) | Groq SDK project scaffolding: `/api/generate-project` flow, JSON schema, Mongoose bulk inserts. |
| [Kanban Board & GitHub Sync](architecture/kanban_github_sync.md) | Webhook ingestion → Groq commit analysis → Socket.IO broadcast pipeline. |
| [Instant Chat Messaging System](architecture/instant_chat_system.md) | Multi-tab socket registry, offline catchup delivery, read receipts. |
| [Real-Time Notes Editor](architecture/realtime_notes_editor.md) | Yjs CRDT binary relay over Socket.IO `/notes` namespace, IndexedDB persistence. |
| [Design Inspiration Service](architecture/design_inspiration_service.md) | Puppeteer Extra Stealth singleton, request interception, Redis caching. |

---

## 🎨 UI/UX & Design System

| Document | Description |
|---|---|
| [Agentic Liquid Glass UI](architecture/agentic_liquid_glass_ui.md) | Design token contract, 9-state component standards, Apple Liquid Glass aesthetics. |
| [Loading Animation Strategy](architecture/loading_animation_strategy.md) | Typographic Glass Lifts, Liquid Glass Skeleton shimmers, depth through translucency. |

---

## 📋 Guides & Operations

| Document | Description |
|---|---|
| [Contributor Onboarding](guides/COLLABORATOR_ONBOARDING.md) | GitHub-driven contributor signup flow. |
| [Contribution Workflow](guides/contribution_workflow.md) | Day-to-day git branching, commit conventions, PR process. |
| [Design Inspiration Guide](guides/DESIGN_INSPIRATION_GUIDE.md) | Server-side Puppeteer scraping for design gallery aggregation. |
| [LinkedIn OAuth Integration](guides/LINKEDIN_LOGIN_GUIDE.md) | Backend-managed Authorization Code Flow → Firebase Custom Tokens. |
| [Oracle Cloud VM Setup](guides/ORACLE_VM_SETUP.md) | Provisioning ARM instances, PM2, Nginx, Cloudflare Tunnel, SSL. |
| [FCM Backend Setup](guides/feature-fcm-backend-setup.md) | Firebase Admin Messaging initialization. |
| [FCM Frontend Setup](guides/feature-fcm-frontend-setup.md) | Client-side push notification permission flow. |

---

## 🔍 Audits & Reports

| Document | Description |
|---|---|
| [Project Audit](audit/PROJECT_AUDIT.md) | One-page technical overview: stack, differentiators, security posture. |
| [Public API Analysis](audit/PUBLIC_API_ANALYSIS.md) | GeoJS, Nager.Date, enterprise infrastructure APIs in use. |
| [Performance Audit](audit/PERFORMANCE_AUDIT.md) | Bundle analysis, lazy loading, Redis hit rates. |
| [Dependency Report](reports/DEPENDENCY_REPORT.md) | Full dependency inventory with versions and rationale. |

---

## 🛡️ Security & Governance

| Document | Description |
|---|---|
| [Security Policy (Root)](SECURITY.md) | Supported versions, vulnerability reporting, safe harbor. |
| [Security Policy (Detailed)](docs/security/SECURITY.md) | Enterprise security architecture, SLA tables, pre-commit checklist. |
| [Privacy Policy](docs/security/PRIVACY_POLICY.md) | Data handling, retention, user rights. |
| [Code of Conduct](docs/CODE_OF_CONDUCT.md) | Contributor Covenant v2.1 enforcement ladder. |
| [Governance](GOVERNANCE.md) | Maintainer rights, decision-making, release process. |
| [Changelog](CHANGELOG.md) | Semantic versioning history with security/fix/added sections. |

---

## 🐛 Bug Fixes & Changelogs

| Document | Description |
|---|---|
| [Backend GitHub Pagination](bug-fixes/backend-github-pagination.md) | Octokit pagination fix for repo listings. |
| [Backend Jest Node Protocol](bug-fixes/backend-jest-node-protocol-fix.md) | babel-jest + transformIgnorePatterns for ESM deps. |
| [Frontend Session Error Handling](bug-fixes/frontend-session-error-handling.md) | Firebase auth state persistence fixes. |
| [Frontend UI Fixes](bug-fixes/frontend-ui-fixes.md) | React Flow controls theming, TechIcon brand colors. |
| [GitHub App Install False Negative](bug-fixes/github-app-installation-false-negative.md) | Installation ID edge case handling. |
| [Team Settings State Fix](bug-fixes/team-settings-state-fix.md) | Zustand store hydration race condition. |

---

## 🗓️ Planning (Historical / Future)

| Document | Description |
|---|---|
| [Overhaul Plan](plans/Overhaul.md) | 6-week migration plan to Supabase/Oracle Cloud (not executed). |
| [Overhaul Prompts](plans/overhaul_prompts.md) | Prompt templates for the migration plan. |
| [Free Tier Scalability](plans/FREE_TIER_SCALABILITY_EXECUTION_REQUIREMENTS_APRIL_2026.md) | Free-tier capacity planning. |
| [Dashboard Loading](plans/DASHBOARD_LOADING_EXECUTION_PLAN_APRIL_2026.md) | Initial load optimization plan. |
| [Skeleton Migration](plans/SKELETON_MIGRATION_PLAN.md) | Component skeleton loading migration. |

---

## 🏷️ Quick Links (Root Files)

- [README.md](../README.md) — Project overview, quick start, roadmap
- [LICENSE](../LICENSE) — AGPL-3.0-only full text
- [CONTRIBUTING.md](CONTRIBUTING.md) — Contribution guidelines (mirrored in docs/)
- [SECURITY.md](../SECURITY.md) — Security policy (short form)
- [GOVERNANCE.md](../GOVERNANCE.md) — Governance model
- [CHANGELOG.md](../CHANGELOG.md) — Release history

---

## 🔧 Key Configuration Files

| File | Purpose |
|---|---|
| `.env.example` | Root frontend environment template |
| `backend/.env.example` | Backend environment template |
| `vercel.json` | Frontend deployment + security headers |
| `render.yaml` | Backend deployment config |
| `deploy.sh` | Oracle Cloud deploy script |
| `firebase.json` | Firebase hosting config |
| `firestore.rules` / `storage.rules` | Ownership-scoped security rules |

---

*Last updated: August 2025. Run `npm run format` to prettify Markdown.*