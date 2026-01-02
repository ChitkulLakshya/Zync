# Zync

Zync is a modern, AI-powered collaboration platform designed to streamline team communication and project management. It combines real-time messaging, presence tracking, and robust project planning tools into a unified, responsive interface.

![Zync Dashboard](https://via.placeholder.com/800x400?text=Zync+Dashboard+Preview)

## 🚀 Key Features

### 🤝 Collaboration & Communication
- **Real-time Chat**: Instant messaging powered by Firebase Firestore.
- **Presence System**: See who is online, offline, or away in real-time.
- **Read Receipts**: "Seen" status for messages.
- **Responsive Design**: Seamless experience across Desktop and Mobile devices.

### 👤 User Management
- **Comprehensive Profile**: Manage personal details, birthday, and contact info.
- **Security**: 
  - Multi-factor authentication support (Phone/SMS).
  - Email verification flows.
  - Account deletion with safety checks.
- **Preferences**: Dark/Light mode toggles and notification settings.

### 🛠️ Project Tools
- **AI-Powered Planning**: Generate project architectures using Google Gemini AI.
- **Task Management**: Organize tasks and events (Coming Soon).
- **GitHub Integration**: Link repositories for development tracking.

## 💻 Tech Stack

### Frontend
- **Framework**: React (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Library**: Shadcn UI (Radix Primitives)
- **Icons**: Lucide React
- **State/Query**: TanStack Query

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **AI**: Google Generative AI SDK

### Services
- **Authentication**: Firebase Auth (Email, Phone, Google)
- **Real-time DB**: Firebase Realtime Database (Presence)
- **NoSQL DB**: Firebase Firestore (Chat Messages)

## 📂 Project Structure

```
Zync/
├── backend/                 # Node.js/Express Server
│   ├── models/              # Mongoose Schemas (User, etc.)
│   ├── routes/              # API Routes
│   └── index.js             # Server Entry Point
├── src/                     # React Frontend
│   ├── components/
│   │   ├── landing/         # Landing Page Sections
│   │   ├── layout/          # Navbar, Sidebar
│   │   ├── ui/              # Shadcn UI Components
│   │   └── views/           # Main App Views (Desktop/Mobile/Settings)
│   ├── lib/                 # Utilities & Firebase Config
│   └── App.tsx              # Main Application Component
└── ...config files
```

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Instance (Local or Atlas)
- Firebase Project (Auth, Firestore, Realtime DB enabled)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/zync.git
   cd zync
   ```

2. **Frontend Setup**
   ```bash
   npm install
   # Create .env file with Firebase config
   npm run dev
   ```

3. **Backend Setup**
   ```bash
   cd backend
   npm install
   # Create .env file with MONGODB_URI and API keys
   npm start
   ```

### Environment Variables

**Frontend (.env)**
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
# ... other firebase config
```

**Backend (backend/.env)**
```env
MONGODB_URI=mongodb://localhost:27017/zync
PORT=5000
GEMINI_API_KEY=...
```

## 📄 License

This project is licensed under the MIT License.

2. **Backend**:
   - Create a `.env` file in the `backend` directory.
   - Add your MongoDB URI and Port:
     ```env
     MONGO_URI=your_mongodb_connection_string
     PORT=5000
     ```

### Running the Application

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend development server:
   ```bash
   # In a new terminal window
   npm run dev
   ```

## License

This project is licensed under the MIT License.
