# 01 — Tech Stack Overview

**Refactored from:** `docs/architecture/tech_stack_overview.md`
**Verified against:** `package.json` (root) + `backend/package.json`

---

## Feature Summary

Complete breakdown of every technology, framework, library, and SDK used across the Zync monorepo. This is the single source of truth for the tech stack.

---

## Architecture Diagram

```
┌─────────────────────── FRONTEND ───────────────────────┐
│ React 19 + Vite 8 + TypeScript 6                       │
│ Tailwind CSS v4 + Radix UI + Mantine 9                 │
│ Framer Motion + Lucide Icons                           │
│                                                        │
│ State:    TanStack Query 5 + Jotai                     │
│ Cache:    localStorage persister + Dexie (IndexedDB)   │
│ CRDT:     Yjs 13 + y-indexeddb + y-protocols           │
│ Editor:   BlockNote 0.51 + react-markdown              │
│ DnD:      @dnd-kit/core + sortable                     │
│ Charts:   recharts 3 + chart.js 4                      │
│ Calendar: react-big-calendar + react-day-picker        │
│ Realtime: socket.io-client 4                           │
│ PWA:      vite-plugin-pwa                              │
│ Crop:     react-easy-crop 6                            │
│ Flow:     @xyflow/react (architecture diagrams)        │
│ Layout:   react-resizable-panels                       │
│ Forms:    react-hook-form 7                            │
│ OTP:      input-otp                                    │
│ Emoji:    emoji-picker-react                           │
└────────────────────────────────────────────────────────┘

┌─────────────────────── BACKEND ────────────────────────┐
│ Node.js 22+ + Express 5 + CommonJS                     │
│                                                        │
│ Security:  helmet 8 + cors + express-rate-limit 8      │
│ Validation: zod 4                                      │
│ Auth:      firebase-admin 14                           │
│ Crypto:    crypto-js 4 (AES-256) + bcryptjs 3          │
│                                                        │
│ Database:  MongoDB Atlas (primary)                     │
│   Prisma 5  (relational queries: Projects, Teams)      │
│   Mongoose 9 (flexible docs: Chat, Notes, AI)          │
│ Cache:     redis 5 (cache + Pub/Sub)                   │
│                                                        │
│ Realtime:  socket.io 4 (4 namespaces)                  │
│ Upload:    multer 2 + cloudinary 2                     │
│ Image:     sharp 0.35                                  │
│                                                        │
│ AI:        groq-sdk 0.36 + Kilo Code Gateway (REST)    │
│ Scrape:    puppeteer 25 + puppeteer-extra-stealth      │
│            cheerio 1 + rss-parser 3                    │
│                                                        │
│ Integrations:                                          │
│   GitHub:   octokit 5                                  │
│   Google:   googleapis 173                             │
│   Email:    nodemailer 9                               │
│   PDF:      pg 8 (PostgreSQL for sheet logging)        │
└────────────────────────────────────────────────────────┘

┌─────────────────── DEVOPS & TESTING ───────────────────┐
│ Dev:     concurrently 10 + wait-on 9 + nodemon 3       │
│ Build:   Vite 8 (frontend) + Prisma generate (backend) │
│ Lint:    eslint 9 + typescript-eslint 8                │
│ Format:  prettier 3 + husky 9 + lint-staged 17         │
│ Test:    jest 30 (backend) + vitest 4 (frontend)       │
│          playwright 1.49 (E2E)                         │
│          mongodb-memory-server 11 (test DB)            │
│          msw 2 (mock service worker)                   │
│ Storybook: 10.3                                        │
│ Commits:  commitizen + cz-conventional-changelog       │
└────────────────────────────────────────────────────────┘
```

---

## Frontend Dependencies (from `package.json`)

### Core Framework
| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.7 | UI framework |
| `react-dom` | ^19.2.7 | DOM renderer |
| `react-router-dom` | ^7.18.1 | Client-side routing |
| `vite` | ^8.1.0 | Build tool + dev server |
| `typescript` | ^6.0.3 | Type safety |

### State & Caching
| Package | Version | Purpose |
|---|---|---|
| `@tanstack/react-query` | ^5.90.21 | Server state + REST cache |
| `@tanstack/query-sync-storage-persister` | ^5.96.1 | localStorage persistence |
| `@tanstack/react-query-persist-client` | ^5.96.1 | Persist query cache |
| `dexie` | ^4.4.2 | IndexedDB wrapper |
| `dexie-react-hooks` | ^4.4.0 | React hooks for Dexie |
| `yjs` | ^13.6.31 | CRDT engine |
| `y-indexeddb` | ^9.0.12 | Yjs offline persistence |
| `y-protocols` | ^1.0.7 | Yjs awareness protocol |

### UI & Styling
| Package | Version | Purpose |
|---|---|---|
| `tailwindcss` | ^4.1.18 | Utility CSS framework |
| `@tailwindcss/postcss` | ^4.1.18 | PostCSS integration |
| `tailwind-merge` | ^3.6.0 | Class deduplication |
| `tailwindcss-animate` | ^1.0.7 | Animation utilities |
| `framer-motion` | 12.42.2 | Spring physics animations |
| `lucide-react` | ^1.31.0 | Icon set |
| `@radix-ui/react-*` | various | 25+ accessible primitives |
| `@mantine/core` | ^9.4.0 | Advanced components |
| `@mantine/hooks` | ^9.4.0 | Mantine utilities |
| `class-variance-authority` | ^0.7.1 | Variant management |
| `clsx` | ^2.1.1 | Conditional classes |
| `sonner` | ^2.0.7 | Toast notifications |
| `vaul` | ^1.1.2 | Drawer component |
| `cmdk` | ^1.1.1 | Command palette |

### Editor & Content
| Package | Version | Purpose |
|---|---|---|
| `@blocknote/core` | ^0.51.4 | Block editor engine |
| `@blocknote/react` | ^0.51.4 | React bindings |
| `@blocknote/mantine` | ^0.51.4 | Mantine theme |
| `react-markdown` | ^10.1.0 | Markdown rendering |
| `remark-gfm` | ^4.0.1 | GitHub-flavored markdown |
| `emoji-picker-react` | ^4.18.0 | Emoji picker |

### Data Visualization
| Package | Version | Purpose |
|---|---|---|
| `recharts` | ^3.8.1 | Chart library |
| `chart.js` | ^4.5.1 | Canvas charts |
| `@xyflow/react` | ^12.11.2 | Architecture diagram flow |
| `elkjs` | ^0.12.0 | Layout algorithm for flow |

### Calendar & Date
| Package | Version | Purpose |
|---|---|---|
| `react-big-calendar` | ^1.19.4 | Calendar component |
| `react-day-picker` | ^9.14.0 | Date picker |
| `date-fns` | ^4.1.0 | Date utilities |

### Drag & Drop
| Package | Version | Purpose |
|---|---|---|
| `@dnd-kit/core` | ^6.3.1 | DnD engine |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable preset |
| `@dnd-kit/utilities` | ^3.2.2 | DnD utilities |

### Other
| Package | Version | Purpose |
|---|---|---|
| `socket.io-client` | ^4.8.3 | WebSocket client |
| `firebase` | ^12.9.0 | Client-side Firebase SDK |
| `googleapis` | 173.0.0 | Google API client |
| `input-otp` | ^1.4.2 | OTP input component |
| `react-easy-crop` | ^6.0.2 | Image cropper |
| `react-hook-form` | ^7.71.1 | Form management |
| `react-resizable-panels` | ^4.11.2 | Resizable layout panels |
| `simple-icons` | ^16.27.1 | Tech brand icons |
| `next-themes` | ^0.4.6 | Theme switching |

---

## Backend Dependencies (from `backend/package.json`)

### Core
| Package | Version | Purpose |
|---|---|---|
| `express` | ^5.2.1 | HTTP framework |
| `socket.io` | ^4.8.3 | WebSocket server |
| `helmet` | ^8.1.0 | Security headers |
| `cors` | ^2.8.5 | Cross-origin config |
| `express-rate-limit` | ^8.3.1 | Rate limiting |
| `zod` | 4.4.3 | Schema validation |
| `dotenv` | ^17.4.2 | Env var loading |

### Database
| Package | Version | Purpose |
|---|---|---|
| `mongoose` | 9.9.2 | MongoDB ODM |
| `@prisma/client` | ^5.22.0 | MongoDB ORM |
| `redis` | ^5.10.0 | Cache + Pub/Sub |
| `pg` | ^8.16.3 | PostgreSQL (sheet logging) |

### Auth & Security
| Package | Version | Purpose |
|---|---|---|
| `firebase-admin` | ^14.2.0 | JWT verification + FCM |
| `crypto-js` | ^4.2.0 | AES-256 encryption |
| `bcryptjs` | ^3.0.3 | Password hashing |

### File & Media
| Package | Version | Purpose |
|---|---|---|
| `multer` | ^2.0.2 | Multipart uploads |
| `cloudinary` | 2.10.0 | Image CDN |
| `sharp` | ^0.35.3 | Image processing |
| `mime-types` | ^3.0.2 | MIME type detection |

### AI & Scraping
| Package | Version | Purpose |
|---|---|---|
| `groq-sdk` | ^0.36.0 | Groq LPU API client |
| `puppeteer` | ^25.6.0 | Headless browser |
| `puppeteer-extra` | ^3.3.6 | Puppeteer plugins |
| `puppeteer-extra-plugin-stealth` | ^2.10.4 | Stealth evasion |
| `cheerio` | ^1.0.0-rc.12 | HTML parsing |
| `rss-parser` | ^3.13.0 | RSS feed parsing |

### Integrations
| Package | Version | Purpose |
|---|---|---|
| `octokit` | ^5.0.4 | GitHub API SDK |
| `googleapis` | ^173.0.0 | Google API SDK |
| `nodemailer` | ^9.0.1 | Email sending |
| `axios` | 1.19.0 | HTTP client |
| `yjs` | 13.6.32 | CRDT (server-side relay) |

---

## DevOps & Testing

| Package | Version | Purpose |
|---|---|---|
| `jest` | ^30.4.2 | Backend unit tests |
| `vitest` | ^4.1.9 | Frontend unit tests |
| `@playwright/test` | ^1.49.1 | E2E tests |
| `mongodb-memory-server` | ^11.2.0 | In-memory MongoDB for tests |
| `msw` | ^2.12.10 | Mock service worker |
| `supertest` | ^7.2.2 | HTTP assertion tests |
| `eslint` | ^9.39.5 | Code linting |
| `prettier` | ^3.4.2 | Code formatting |
| `husky` | ^9.1.7 | Git hooks |
| `lint-staged` | 17.0.8 | Staged file linting |
| `concurrently` | 10.0.3 | Parallel dev servers |
| `storybook` | ^10.3.3 | Component documentation |
| `vite-plugin-pwa` | ^1.2.0 | PWA manifest + service worker |

---

## NPM Scripts

### Root (`package.json`)
| Script | Command | Purpose |
|---|---|---|
| `dev` | `node scripts/run-dev.cjs` | Start both frontend + backend |
| `start` | `node backend/index.js` | Production start (backend only) |
| `build` | `vite build` | Build frontend SPA |
| `test` | `test:frontend && test:backend` | Run all tests |
| `test:e2e` | `playwright test` | E2E tests |
| `lint` | `eslint .` | Lint everything |

### Backend (`backend/package.json`)
| Script | Command | Purpose |
|---|---|---|
| `start` | `node index.js` | Start API server |
| `dev:watch` | `nodemon index.js` | Auto-restart on changes |
| `build` | `npx prisma generate` | Generate Prisma client |
| `test` | `jest` | Run backend tests |

---

## Cross-References

- [04-service-inventory.md](./04-service-inventory.md) — Cloud services and hosting
- [05-database-schema-and-models.md](./05-database-schema-and-models.md) — Prisma + Mongoose schema
- [06-middleware-stack.md](./06-middleware-stack.md) — Express middleware chain
