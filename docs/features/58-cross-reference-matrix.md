# 58 — Cross-Reference Matrix

**NEW document** — Complete cross-reference index, feature dependency graph, related documentation map

---

## Feature Cross-Reference Matrix

| Doc | Related Docs | Shared Components |
|---|---|---|
| 00-overview | All | — |
| 01-frontend-architecture | 53, 54, 55 | React, Vite, Tailwind |
| 02-security-auth | 08, 48, 51, 57 | Firebase Admin, AES-256 |
| 03-caching-strategy | 14, 21, 27, 33 | Redis |
| 04-service-inventory | All services | — |
| 05-database-schema | 52 | Mongoose models |
| 06-middleware-stack | 51 | Express middleware |
| 07-deployment-config | 56 | Environment variables |
| 08-firebase-auth | 02, 51, 55 | Firebase Admin SDK |
| 09-user-profile | 10, 32, 34, 39 | User model, Cloudinary |
| 10-account-deletion | 09, 28 | Email verification |
| 11-presence-system | 19, 23, 50 | Socket.IO /presence |
| 12-haveibeenpwned | 02 | HIBP API |
| 13-linkedin-oauth | 08 | LinkedIn API, Firebase |
| 14-project-crud | 15, 16, 25, 44 | Project model, cache |
| 15-steps-pipeline | 14, 16, 47 | Step model |
| 16-task-management | 14, 15, 22, 47 | ProjectTask, GitHub API |
| 17-notes-system | 18, 19, 20 | Note model |
| 18-folders-organization | 17, 39 | Folder model |
| 19-realtime-notes | 17, 20, 50 | Socket.IO /notes, Yjs |
| 20-notes-socket-handler | 19 | noteSocketHandler.js |
| 21-github-oauth | 14, 16, 22, 48 | GitHub API, encryption |
| 22-github-webhook | 16, 21, 46 | HMAC, queue |
| 23-instant-chat | 24, 38, 50 | Message model |
| 24-chat-socket-handler | 23, 50 | Socket.IO /chat |
| 25-ai-architecture | 14, 26, 27 | Kilo Gateway, cache |
| 26-kilo-code-gateway | 25, 27 | LLM API client |
| 27-usage-service-quota | 25, 26, 33 | Redis, Lua scripts |
| 28-email-service | 10, 16, 31, 42 | SMTP, nodemailer |
| 29-session-management | 30, 45 | Session model |
| 30-meeting-system | 29, 40, 45 | Google Calendar API |
| 31-team-crud | 28, 39 | Team model, Activity |
| 32-cloudinary-upload | 09, 38 | Cloudinary SDK |
| 33-redis-cache | 03, 14, 21, 27 | Redis client |
| 34-location-detection | 09 | Geo-IP API |
| 35-architecture-agent | 25, 26, 27 | Kilo Gateway |
| 36-project-generation | 14, 15, 26 | AI blueprint |
| 37-calendar-holidays | 30 | Holiday API |
| 38-file-upload | 23, 32 | Multer, Sharp |
| 39-user-search | 09, 18, 23, 31 | Regex, pagination |
| 40-google-oauth | 08, 28, 30 | Google APIs |
| 41-collaborator-beta | 28 | Collaborator model |
| 42-support-ticket | 28 | Email service |
| 43-design-inspiration | 04 | Cheerio, scraping |
| 44-link-repo | 14, 21 | Project + GitHub |
| 45-meet-routes | 29, 30, 40 | Meeting model |
| 46-webhook-routes | 22 | Webhook queue |
| 47-task-routes | 15, 16, 22, 50 | Socket.IO /tasks |
| 48-encryption | 02, 21, 40 | CryptoJS, AES-256 |
| 49-pagination-helpers | 14, 17, 23, 39 | Pagination utility |
| 50-socket-io-init | 11, 19, 24, 47 | Socket.IO server |
| 51-middleware-stack | 02, 08, 22 | Express middleware |
| 52-database-schema | 05 | All Mongoose models |
| 53-frontend-routing | 01, 08, 54 | React Router |
| 54-frontend-state | 01, 50, 55 | TanStack Query, Zustand |
| 55-api-client | 08, 54 | Axios interceptors |
| 56-environment-variables | All | .env reference |
| 57-error-handling | 33, 48, 51 | Fail-open patterns |
| 58-cross-reference | All | This document |

---

## Dependency Graph (Simplified)

```
Firebase Auth (08) ────┬── User Profile (09)
                       ├── LinkedIn OAuth (13)
                       ├── Google OAuth (40)
                       └── Middleware (51)

Socket.IO (50) ────┬── Presence (11)
                   ├── Chat (24)
                   ├── Notes (19, 20)
                   └── Tasks (47)

GitHub (21) ────┬── Webhooks (22)
                ├── Project CRUD (14)
                ├── Task Mgmt (16)
                └── Repo Linking (44)

AI Gateway (26) ────┬── Architecture Analysis (25)
                    ├── Architecture Chat (35)
                    └── Project Generation (36)

Redis (33) ────┬── Cache (03)
               └── Quota (27)

Email (28) ────┬── Account Deletion (10)
               ├── Task Assignment (16)
               ├── Team Invites (31)
               └── Support (42)
```

---

## Cross-References

- All documentation files (this is the master index)
