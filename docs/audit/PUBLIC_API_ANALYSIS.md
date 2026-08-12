# 🌐 Public APIs Integration Analysis

## Executive Summary

Zync leverages targeted, zero-auth public developer APIs to actively enrich collaboration, timezone awareness, and team scheduling. Rather than building speculative consumer features, the codebase integrates highly practical infrastructure APIs directly into its core backend services.

---

## 1. Active Public API Integrations (Codebase Verified)

| Service API | Integration File | Purpose & Impact |
| :--- | :--- | :--- |
| **GeoJS** (`get.geojs.io`) | `backend/services/geoService.js` | **Team Timezone Awareness**: Resolves client IP addresses to accurately determine user country and local timezone without requiring intrusive manual inputs. |
| **Nager.Date** (`date.nager.at`) | `backend/routes/calendarRoutes.js` | **Distributed Scheduling**: Dynamically queries international public holidays across 90+ countries. Merges with team calendars to prevent managers from scheduling critical sprints or meetings on developers' local holidays. |

---

## 2. Core Enterprise Infrastructure (Proprietary Integrations)

For core operational logic, Zync avoids unverified free public APIs in favor of robust enterprise SDKs:

- **Authentication**: Firebase Authentication IDP verified cryptographically via `firebase-admin`.
- **AI Orchestration**: Kilo Code Gateway (Architecture Agent chat) + Groq SDK (`groq-sdk` for project scaffolding & commit analysis).
- **Database & Storage Layer**: Dual Prisma/Mongoose ORM architecture running on a pure MongoDB cluster.
- **Multiplayer State**: WebSockets (`socket.io`) combined with Yjs CRDT binary persistence (`y-indexeddb`).

---

## 3. Excluded Consumer API Categories

Following strict enterprise design guidelines, consumer-grade APIs (e.g., Weather, Entertainment, Cryptocurrency, Anime) from standard public directories are explicitly excluded from the Zync build to maintain strict focus on developer productivity.
