# Zync ⚡
> The Intelligent All-in-One Workspace for Teams and Developers.

Zync is a modern, feature-rich workspace platform designed to streamline collaboration, project management, and communication. It unifies your workflow by combining real-time chat, collaborative notes, video meetings, project tracking, and GitHub integration into a single, cohesive interface.

![Zync Workspace](https://via.placeholder.com/1200x600?text=Zync+Dashboard+Preview) *[Replace with actual screenshot]*

---

## 🚀 Key Features

### 🛠️ Project Management
- **Smart Dashboard**: Get a bird's-eye view of your productivity, active projects, and upcoming deadlines.
- **AI-Powered Creation**: Generate project structures and tasks automatically using integrated AI agents (Gemini/Groq).
- **Task Tracking**: Kanban-style or list-based task management to keep your team aligned.

### 💬 Real-Time Collaboration
- **Connect Chat**: An "Instagram Direct" style messaging interface for seamless team communication. Supports rich text, file sharing, and emojis.
- **Collaborative Notes**: Notion-style rich text editor (BlockNote) with real-time multi-user editing (YJS).
- **Online Status**: See who is active, away, or offline instantly.

### 📅 Calendar & Meetings
- **Smart Calendar**: Two-way sync with Google Calendar. visualizing your schedule and holidays.
- **Instant Meet**: Launch Google Meet video calls directly from the chat or project view with a single click.

### 💻 Developer Centric
- **GitHub Integration**: Link repositories, track commits, and manage webhooks directly within your workspace.
- **Activity Log**: Detailed session tracking and user activity monitoring.

---

## 🛠️ Technology Stack

**Frontend**
- **Framework**: React 18 + Vite (TypeScript)
- **Styling**: Tailwind CSS, Radix UI, Lucide Icons
- **State & Data**: React Query, Zustand/Context
- **Editor**: BlockNote (Prosemirror-based)

**Backend**
- **Runtime**: Node.js + Express
- **Database**: MongoDB (Primary), Redis (Caching/Sessions)
- **Real-time**: Socket.io
- **Auth**: Firebase Authentication

**Integrations**
- **AI**: Google Gemini, Groq SDK
- **Google**: Calendar API, Gmail API (Nodemailer OAuth2), Google Meet
- **GitHub**: Octokit SDK

---

## 🏁 Getting Started

Follow these steps to set up Zync locally.

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Redis server
- Firebase Project (for Auth)
- Google Cloud Project (for Calendar/Meet/Mail APIs)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/Zync.git
cd Zync
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Configure Environment
cp .env.example .env
# Edit .env and add your Firebase and API URL config
```

### 3. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure Environment
cp .env.example .env
# Edit .env with your MongoDB URI, Google API Keys, and Secrets
```

### 4. Run the Application
You need to run both the frontend and backend servers.

**Option 1: Concurrent (Recommended)**
Open two terminal tabs:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
# from root
npm run dev
```

Visit `http://localhost:5173` to access Zync.

---

## 🔑 Environment Variables

See `.env.example` in both root and `backend/` for the full list of required variables.

**Critical Backend Variables:**
- `MONGO_URI`: MongoDB Connection String
- `GOOGLE_CLIENT_ID` / `_SECRET`: OAuth2 credentials for Google Login & APIs
- `GOOGLE_REFRESH_TOKEN`: Required for offline access to Calendar/Mail APIs
- `GITHUB_ACCESS_TOKEN`: For GitHub integration features

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.
