# ZYNC API Documentation 📡

Base URL: `http://localhost:5000/api`

> **Note**: Most endpoints require a valid Firebase ID Token in the `Authorization` header: `Bearer <token>`.

---

## 🔐 Authentication & Users

### User Management
Base Path: `/api/users`

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| **POST** | `/sync` | Sync Firebase User to MongoDB (Login/Signup). Payload: `{ uid, email, displayName, photoURL }` | No |
| **GET** | `/me` | Get current user profile. | Yes |
| **GET** | `/:uid` | Get public profile of a user. | Yes |
| **PUT** | `/:uid` | Update user profile. Payload: `{ firstName, lastName, theme, ... }` | Yes |
| **POST** | `/verify-phone/request` | Send verification code to user's phone. | Yes |
| **POST** | `/verify-phone/confirm` | Confirm phone verification code. | Yes |
| **POST** | `/delete/request` | Request account deletion (Email code). | Yes |
| **POST** | `/delete/confirm` | Confirm account deletion. | Yes |

---

## 🤖 AI & Projects

### Project Generation
Base Path: `/api/generate-project`

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| **POST** | `/` | Generate a full project architecture using Gemini. Payload: `{ name, description, ownerId }`. Returns `Project` object. | No |

### Project Management
Base Path: `/api/projects`

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | Get all projects for user (`?ownerId=...`). | Yes |
| **GET** | `/:id` | Get specific project details. | Yes |
| **PATCH** | `/:id` | Update project (e.g., link GitHub repo). | Yes |
| **DELETE** | `/:id` | Delete a project. | Yes |
| **POST** | `/:id/team` | Add user to team. Payload: `{ userId }`. | Yes |
| **POST** | `/:projectId/quick-task` | Create a task from external source (Notes). | Yes |
| **PUT** | `/:pid/steps/:sid/tasks/:tid` | Update task status/assignee. | Yes |

---

## 🐙 GitHub Integration

### OAuth & Sync
Base Path: `/api/github` (Source: `routes/github.js`)

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| **POST** | `/callback` | Exchange OAuth code for token. Payload: `{ code }`. | Yes |
| **POST** | `/connect` | Manual token connect (Legacy). | Yes |
| **DELETE** | `/disconnect` | Remove GitHub integration. | Yes |
| **GET** | `/repos` | List repositories. | Yes |
| **GET** | `/stats` | Get user public stats. | Yes |
| **GET** | `/events` | Get user activity feed. | Yes |
| **GET** | `/contributions` | Get contribution graph data (GraphQL). | Yes |

### Webhooks
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/github-app` | **Primary Webhook**. Receives `push` events, verifies signature, uses Groq to identify tasks, and updates Prisma DB. |
| **POST** | `/api/webhooks/github` | **Legacy Webhook**. Similar logic but different mount point. |

---

## 📝 Notes & Folders
Base Path: `/api/notes`

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | Get all notes. Query: `?userId=...&folderId=...` | Yes |
| **POST** | `/` | Create note. Payload: `{ title, content, ownerId, folderId }`. | Yes |
| **GET** | `/:id` | Get single note. | Yes |
| **PUT** | `/:id` | Update note content. | Yes |
| **DELETE** | `/:id` | Delete note. | Yes |
| **GET** | `/folders` | Get folders. Query: `?userId=...` | Yes |
| **POST** | `/folders` | Create folder. | Yes |
| **POST** | `/folders/:id/share` | Share folder. Payload: `{ collaboratorIds: [] }`. | Yes |

---

## 🎥 Google Meet
Base Path: `/api/meet`

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| **POST** | `/invite` | Create Instant Meet & Email Invites. Payload: `{ senderId, receiverIds[] }`. | Yes |

---

## ⏱️ Sessions & Analytics
Base Path: `/api/sessions`

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| **POST** | `/start` | Start tracking a session. Payload: `{ userId }`. | Yes |
| **PUT** | `/:id` | Heartbeat update (every 1m). Payload: `{ activeIncrement }`. | Yes |
| **GET** | `/:userId` | Get session history. | Yes |

---

## 🎨 Design & Inspiration
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/design/search` | Search Behance/Unsplash. Query: `?q=...` | Yes |
| **GET** | `/api/inspiration` | Search Inspiration (Legacy). | Yes |

---

## 📂 File Uploads
Base Path: `/api/upload`

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| **POST** | `/` | Upload file (Multipart Form). Key: `file`. Returns `{ fileUrl }`. | Yes |
