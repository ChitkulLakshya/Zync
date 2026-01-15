# Zync ⚡
> **The Intelligent All-in-One Workspace for Teams and Developers.**

Zync is a comprehensive collaboration platform that unifies project management, communication, and development workflows. It leverages AI to automate project setup, integrates deeply with GitHub for developer-centric tracking, and provides real-time tools like Chat, Notes, and Video Meetings in a single interface.

---

## 🏗️ Tech Stack

### Frontend (`/`)
- **Core**: [React 18](https://react.dev/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest), Context API
- **Real-time**: [Socket.io Client](https://socket.io/), [Firebase Firestore](https://firebase.google.com/) (Chat)
- **Editor**: [BlockNote](https://www.blocknotejs.org/) (Prosemirror-based rich text)
- **Auth**: [Firebase Authentication](https://firebase.google.com/docs/auth)

### Backend (`/backend`)
- **Runtime**: Node.js, Express.js
- **Database**: 
  - **MongoDB** (Primary Data: Users, Projects, Notes)
  - **Redis** (Session Store & Caching)
- **Authentication**: Firebase Admin SDK (Token Verification)
- **Real-time**: Socket.io (Signaling & Updates)
- **Integrations**: 
  - **Google Cloud**: Calendar API (Meet), Gmail API (OAuth2 Email)
  - **GitHub**: Octokit (Repos, Commits, Webhooks)
  - **AI**: Google Gemini / Groq SDK (Project Generation)

---

## 🏛️ System Architecture

### Directory Structure
- **`src/`**: React frontend code.
  - **`pages/`**: Top-level routes (Login, Dashboard, ProjectDetails).
  - **`components/views/`**: Feature-specific complex views (ChatView, CalendarView, TasksView).
  - **`components/ui/`**: Reusable atomic components.
- **`backend/`**: Node.js API server.
  - **`models/`**: Mongoose schemas.
  - **`routes/`**: API endpoint definitions.
  - **`services/`**: Business logic integrations (Mailer, GoogleMeet).
  - **`middleware/`**: Auth verification (`verifyToken`).

### Database Schema (MongoDB)
Based on `backend/models`, Zync uses a relational-style schema in a document database:

- **User**: Stores Profile, Firebase UID, and Integration tokens (GitHub/Google).
  - *Key Fields*: `uid`, `email`, `role`, `integrations.github.accessToken`.
- **Project**: The core entity.
  - *Key Fields*: `name`, `githubRepoIds`, `ownerId`, `team` (array of UIDs).
  - *Embedded*: `steps` (Phases) -> `tasks` (Task Items).
- **Note**: Collaborative documents.
  - *Key Fields*: `content` (JSON), `projectId`, `ownerId`.
- **Session**: Tracks user activity duration.
  - *Key Fields*: `startTime`, `endTime`, `activeDuration`.

### Authentication Flow
1. **Frontend**: User logs in via Google/GitHub using **Firebase Auth**.
2. **Token Exchange**: Frontend retrieves an **ID Token**.
3. **API Requests**: Token is sent in the `Authorization: Bearer <token>` header.
4. **Backend**: `authMiddleware.js` verifies the token using **Firebase Admin SDK**.
5. **Sync**: Verified User UID is matched/created in MongoDB for data association.

---

## 🚀 Features & Integrations

### 1. GitHub Integration 🐙
- **OAuth Login**: Connect GitHub accounts to fetch repositories.
- **Repo Linking**: Link GitHub repositories to Zync Projects.
- **Smart Tracking**: Webhooks (`backend/routes/githubAppWebhook.js`) listen for pushes/PRs and auto-update project tasks.

### 2. Intelligent Project Creation 🧠
- **AI Agents**: Uses Gemini/Groq to parse a project description and generate a full implementation plan (Phases -> Tasks) automatically.

### 3. Meetings & Calendar 📅
- **Google Sync**: Two-way synchronization with Google Calendar.
- **Instant Meet**: One-click generation of Google Meet links using the Calendar API (`backend/services/googleMeet.js`).

### 4. Real-time Chat 💬
- **Firestore**: Uses Firebase Cloud Firestore for instant message delivery and offline persistence.
- **Features**: File sharing, Emoji picker, Read receipts, Typing indicators.

### 5. Collaborative Notes 📝
- **Block-Based**: Notion-style editor via BlockNote.
- **Real-time**: Multi-user editing support (infrastructure ready via YJS/Socket.io).

---

## 🔌 API Reference

Key endpoints available in `backend/routes`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/users/sync` | Sync Firebase User to MongoDB |
| **GET** | `/api/projects/user/:uid` | Fetch all projects for a user |
| **POST** | `/api/projects/generate` | AI-generate a project plan |
| **POST** | `/api/meet/invite` | Create Google Meet & Email Invite |
| **GET** | `/api/github/repos` | List user's GitHub repositories |
| **POST** | `/api/notes` | Create a new note |

---

## 🔑 Environment Variables

Required `.env` configuration (see `.env.example` in respective directories):

### Root (Frontend)
- `VITE_API_URL`: Backend URL (e.g., `http://localhost:5000`)
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc. (Firebase Config)
- `VITE_GOOGLE_API_KEY`: For Google Maps/Calendar frontend SDKs

### Backend (`/backend`)
- **Database**: `MONGO_URI`, `REDIS_URL` (Optional)
- **Auth**: `GCP_SERVICE_ACCOUNT_KEY` (Firebase Admin User Setup)
- **AI**: `GEMINI_API_KEY`, `GROQ_API_KEY`
- **Google APIs**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_REDIRECT_URI`
- **GitHub**: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`
- **Email**: `GMAIL_USER` (OAuth2 user)

---

## 🛠️ Installation & Setup

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/Zync.git
cd Zync

# Frontend
npm install

# Backend
cd backend
npm install
```

### 2. Configure Environment
1. Create `.env` in root based on `.env.example`.
2. Create `.env` in `backend/` based on `backend/.env.example`.
3. **Important**: Run `node backend/scripts/get-refresh-token.js` to generate a valid Google Refresh Token for calendar/mail features.

### 3. Run Development Servers
Open two terminals:

**Backend:**
```bash
cd backend
npm run dev
# Server running on http://localhost:5000
```

**Frontend:**
```bash
# From root
npm run dev
# App accessible at http://localhost:5173
```
