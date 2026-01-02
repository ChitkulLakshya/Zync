# Zync

Zync is a beautiful online software for effective team collaboration, project management, task planning, and execution. It features AI-powered project architecture with GitHub integration.

## Features

- **Team Collaboration**: Manage your remote team better than in the office.
- **Project Management**: Create tasks and events at the team or project level.
- **AI-Powered Planning**: Generate project architectures and plans automatically.
- **GitHub Integration**: Seamlessly integrate with your development workflow.
- **Real-time Updates**: Keep everyone in sync with real-time status updates.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Express, MongoDB
- **Authentication**: Firebase Auth

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB instance
- Firebase project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/zync.git
   cd zync
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

### Configuration

1. **Frontend**:
   - Update `src/lib/firebase.ts` with your Firebase configuration.

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
