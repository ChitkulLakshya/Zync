# Zync Tech Stack Overview

Zync is built using a modern, scalable, and real-time web stack designed for highly concurrent collaboration.

### Frontend
- **Framework**: React with TypeScript, Vite
- **Styling**: TailwindCSS, Framer Motion, Radix UI Primitives
- **Real-time & State**: Yjs (CRDTs for conflict-free collaborative editing), Socket.IO Client, React Query
- **Data Fetching**: Axios

### Backend
- **Framework**: Node.js, Express
- **Real-time Engine**: Socket.IO, Yjs (Sync server)
- **Database ORM/ODM**: Prisma (SQL), Mongoose (MongoDB)
- **Caching & Pub/Sub**: Redis
- **Authentication**: Firebase Admin SDK

### AI & Integrations
- **LLM Providers**: Google Gemini API, Groq SDK
- **Automation**: Puppeteer (Web scraping for design inspiration), Octokit (GitHub API sync)

### DevOps & CI
- **Package Manager**: npm (with workspaces/postinstall hooks)
- **CI/CD**: GitHub Actions (Jest, Playwright)
