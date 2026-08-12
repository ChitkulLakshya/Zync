# 🏗️ Zync Tech Stack Overview

Zync is a highly complex, full-stack application designed for real-time, conflict-free collaboration. This document provides a comprehensive breakdown of the entire technology stack, verified directly against the production `package.json` files.

> 📡 **Looking for hosting/cloud services?** See [`service_inventory.md`](./service_inventory.md) for the complete inventory of Vercel, Render, MongoDB Atlas, Firebase, Cloudinary, AI gateways, and third-party APIs.

---

## 🎨 Frontend Architecture

The frontend is a blazing fast Single Page Application (SPA) built with modern React, heavily utilizing CRDTs for local-first sync.

### Core Framework & Build
- **React 18** (`react`, `react-dom`, `react-router-dom`): Component architecture and routing.
- **Vite** (`vite`): Next-generation, blazing fast build tool and development server.
- **TypeScript** (`typescript`): Strongly typed codebase for enterprise-grade safety.

### Real-Time Engine & Local-First State
- **Yjs** (`yjs`, `y-protocols`): The core CRDT (Conflict-free Replicated Data Type) engine that powers Zync's collaborative editing.
- **IndexedDB Sync** (`y-indexeddb`, `dexie`): Enables local-first offline capabilities, persisting Yjs document state locally in the browser.
- **WebSockets** (`socket.io-client`): Handles the transport layer for real-time cursor presence and chat.
- **React Query** (`@tanstack/react-query`): Manages asynchronous server state and caching for REST endpoints (via native `fetch`).

### Rich Text Editor & Visual Canvas
- **BlockNote** (`@blocknote/react`, `@blocknote/mantine`): A powerful block-based rich text editor built on top of ProseMirror, allowing Notion-like slash commands and blocks.
- **React Markdown** (`react-markdown`, `remark-gfm`): Parsing and rendering standard Markdown into the canvas.

### UI & Styling System
- **Tailwind CSS v4** (`tailwindcss`, `@tailwindcss/postcss`, `tailwind-merge`): Utility-first CSS framework for rapid, responsive UI design.
- **Radix UI** (`@radix-ui/react-*`): Unstyled, accessible UI primitives (Dialogs, Popovers, Dropdowns, Sliders) serving as the foundation of the design system.
- **Mantine** (`@mantine/core`, `@mantine/hooks`): Used for advanced, complex components alongside Radix.
- **Framer Motion** (`framer-motion`): Powers the liquid glass micro-animations and layout transitions.
- **Lucide React** (`lucide-react`): The primary iconography set.

### Utilities & Advanced Components
- **Drag & Drop**: `@dnd-kit/core` & `sortable` for Kanban boards and block reordering.
- **Data Visualization**: `recharts` and `chart.js` for rendering dashboards and analytics.
- **Calendars**: `react-big-calendar` and `react-day-picker` for timeline and date management.

---

## ⚙️ Backend Architecture

The backend is an event-driven Node.js server designed to handle high-frequency WebSocket traffic alongside heavy AI orchestration and web scraping.

### Core Framework
- **Node.js & Express** (`express`): The robust API layer.
- **Security & Middleware**: `helmet` (HTTP headers), `cors`, `express-rate-limit` (DDoS protection).
- **Validation**: `zod` for rigorous runtime payload validation.

### Database & Storage Layer
Zync utilizes a pure NoSQL database architecture, using MongoDB as the single source of truth, but uniquely accesses it via dual ORM/ODM layers.
- **MongoDB (Primary Database)**: Powers the entire application.
- **Prisma** (`@prisma/client`): Configured specifically for MongoDB (`provider = "mongodb"`), handling the relational querying of Projects, Teams, and Users with strict type-safety.
- **Mongoose** (`mongoose`): Operating side-by-side with Prisma, used for complex, unstructured data operations (like deeply nested Chat objects and flexible user states).
- **Redis** (`redis`): Acts as a high-performance in-memory cache and a Pub/Sub message broker for scaling Socket.IO across multiple Node instances.
- **Cloudinary** (`cloudinary`): Manages media uploads and image delivery.
- **Multer** (`multer`): Handles multipart/form-data for file uploads.

### Authentication
- **Firebase Admin SDK** (`firebase-admin`): Handles secure, scalable user authentication, JWT verification, and OAuth providers.
- **CryptoJS** (`crypto-js`): For internal cryptographic operations and token hashing.

### Real-Time Sync Server
- **Socket.IO** (`socket.io`): The server-side WebSocket engine that broadcasts Yjs document updates, chat messages, and cursor positions to connected clients.

---

## 🤖 AI & Automation Engines

Zync integrates several advanced services to automate project management and provide intelligent context.

### Generative AI (LLMs)
- **Kilo Code Gateway** (`kilo-auto/free` via REST): Primary Architecture Agent — processes natural language chat and outputs structured JSON architecture maps. Configured via `KILO_CODE_GATEWAY_URL` / `KILO_CODE_GATEWAY_API_KEY`.
- **Groq** (`groq-sdk`): High-speed, low-latency AI completions for project scaffolding (`taskGenerator.js`) and GitHub commit analysis (`commitAnalysisService.js`). Configured via `GROQ_API_KEY`.

### Web Scraping & Orchestration
- **Puppeteer** (`puppeteer`, `puppeteer-extra-plugin-stealth`): Used for headless browser automation (e.g., the Design Inspiration service scraping Behance/Dribbble).
- **Cheerio** (`cheerio`): For lightweight, fast HTML parsing and metadata extraction.

### Third-Party API Integrations
- **GitHub API** (`octokit`): Enables Zync's bidirectional Kanban sync, allowing tasks to reflect automatically as GitHub Issues and PRs.
- **Google APIs** (`googleapis`): For calendar sync and deep Google Workspace integration.
- **Nodemailer** (`nodemailer`): For sending transactional emails, invites, and notifications.

---

## 🛠 DevOps, Testing, & Tooling

- **Monorepo Management**: Uses `npm` with root-level `postinstall` hooks to manage the frontend and backend lifecycle synchronously.
- **Development**: `concurrently` runs both the Vite dev server and the Express backend simultaneously via a custom `scripts/run-dev.cjs` orchestrator.
- **E2E Testing**: **Playwright** (`@playwright/test`) ensures critical user flows work across modern browsers.
- **Unit Testing**: **Jest** (`jest`, `ts-jest`) validates backend logic and utility functions.
- **Component Documentation**: **Storybook** (`storybook`) acts as the interactive sandbox for frontend UI components.
