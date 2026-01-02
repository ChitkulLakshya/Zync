# Zync - System Architecture & Design

## 1. High-Level System Architecture

Zync follows a modern, scalable, and modular architecture:

-   **Frontend**: React (Vite) + TypeScript + Tailwind CSS + Shadcn UI.
    -   Handles UI/UX, user interactions, and real-time updates.
    -   Communicates with the Backend API and Firebase Auth.
-   **Backend**: Node.js + Express.
    -   RESTful API for project management, task tracking, and GitHub integration.
    -   Connects to MongoDB for data persistence.
-   **Database**: MongoDB (Atlas).
    -   Stores Users, Projects, Tasks, Comments, and Organization data.
-   **Authentication**: Firebase Authentication.
    -   Handles Email/Password and GitHub OAuth.
-   **Integrations**:
    -   **GitHub API**: For tracking commits and linking repositories.
    -   **Google Meet**: For video conferencing.
    -   **AI Service (OpenAI/Gemini)**: For generating project architectures (Planned).

## 2. Feature Breakdown

### User Roles
-   **Administrator**: Full control over projects, teams, and tasks.
-   **Team Member**: Can view assigned tasks, update status, and push code.

### Core Modules
1.  **Authentication**: Secure login/signup via Firebase (Email, GitHub).
2.  **Project Management**: Create projects, generate AI architecture, view workflows.
3.  **Task Management**: Kanban/List view, assign tasks, set deadlines, track progress.
4.  **GitHub Integration**: Link repos, auto-complete tasks on commit push.
5.  **Communication**: In-app chat, file sharing, Google Meet integration.
6.  **Notifications**: Real-time alerts (In-app) and Email notifications.
7.  **Dashboard**: Personalized views for Admins and Team Members.

## 3. Database Schema Suggestions (MongoDB)

### Users Collection
```json
{
  "_id": "ObjectId",
  "firebaseUid": "String",
  "email": "String",
  "displayName": "String",
  "photoURL": "String",
  "githubHandle": "String",
  "role": "String (admin/member)",
  "createdAt": "Date"
}
```

### Projects Collection
```json
{
  "_id": "ObjectId",
  "name": "String",
  "description": "String",
  "ownerId": "ObjectId (User)",
  "githubRepo": "String (owner/repo)",
  "architecture": "Object (AI Generated)",
  "members": ["ObjectId (User)"],
  "createdAt": "Date"
}
```

### Tasks Collection
```json
{
  "_id": "ObjectId",
  "projectId": "ObjectId (Project)",
  "title": "String",
  "description": "String",
  "assignedTo": "ObjectId (User)",
  "status": "String (pending/in-progress/completed)",
  "priority": "String (low/medium/high)",
  "deadline": "Date",
  "githubCommitId": "String",
  "createdAt": "Date"
}
```

## 4. API Flow

### GitHub Integration Flow
1.  **User Action**: Team member pushes code to GitHub.
2.  **GitHub Webhook**: GitHub sends a payload to Zync Backend (`/api/webhooks/github`).
3.  **Backend Processing**:
    -   Parses commit message (e.g., "Fixes #123").
    -   Finds corresponding Task in MongoDB.
    -   Updates Task status to "Completed".
4.  **Frontend Update**: Real-time update via WebSocket or Polling reflects the change (Tick mark ✔️).

### Project Creation Flow
1.  **User Action**: Admin enters project idea prompt.
2.  **Frontend**: Sends prompt to Backend (`/api/projects/generate`).
3.  **Backend**: Calls AI Service to generate architecture.
4.  **Database**: Saves generated architecture to `Projects` collection.
5.  **Frontend**: Displays the generated plan for review.

## 5. User Flow Diagrams

### Login/Signup
`Landing Page` -> `Login/Signup Page` -> `Firebase Auth` -> `Dashboard`

### Task Completion
`Dashboard` -> `View Task` -> `Code & Push to GitHub` -> `System Auto-Updates Task` -> `Notification Sent`
