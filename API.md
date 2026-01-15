# Zync API Documentation 📡

Base URL: `http://localhost:5000/api`

## Authentication
Most endpoints require a valid Firebase ID Token in the `Authorization` header.
```
Authorization: Bearer <valid_firebase_id_token>
```

---

## 🤖 AI Project Generation

### Generate Project Plan
Uses Google Gemini to create a full technical architecture and task list from a prompt.

- **Endpoint**: `POST /generate-project`
- **Auth Required**: No (Publicly accessible for now)
- **Request Body**:
  ```json
  {
    "name": "E-Commerce Platform",
    "description": "A full-stack online store with Stripe payments",
    "ownerId": "firebase_uid_123"
  }
  ```
- **Response** (`201 Created`):
  Returns the created `Project` object with populated `architecture` and `steps`.
  ```json
  {
    "_id": "65a1...",
    "name": "E-Commerce Platform",
    "architecture": {
      "highLevel": "Microservices based...",
      "frontend": { "tech": "React, Redux...", "components": [...] },
      "backend": { "tech": "Node, Express...", "services": [...] }
    },
    "steps": [
      {
        "title": "Phase 1: Foundation",
        "tasks": [
            { "title": "Setup Repo", "status": "Pending" },
            { "title": "Config DB", "status": "Pending" }
        ]
      }
    ]
  }
  ```

---

## 🐙 GitHub Integration

### Connect Account
Exchanges an OAuth code for an access token, encrypts it, and links it to the user.

- **Endpoint**: `POST /github/callback`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "code": "github_oauth_code_from_frontend"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "message": "GitHub connected successfully",
    "username": "octocat"
  }
  ```

### List Repositories
Fetches repositories from the connected GitHub account.

- **Endpoint**: `GET /github/repos`
- **Auth Required**: Yes
- **Request Body**: None
- **Response** (`200 OK`):
  Array of repository objects.
  ```json
  [
    {
      "id": 1296269,
      "name": "Hello-World",
      "full_name": "octocat/Hello-World",
      "private": false,
      "owner": "octocat",
      "html_url": "https://github.com/octocat/Hello-World"
    },
    ...
  ]
  ```

### Get User Stats
Fetches public profile statistics (Followers, Repos, etc.).

- **Endpoint**: `GET /github/stats`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "login": "octocat",
    "public_repos": 42,
    "followers": 1000,
    "html_url": "..."
  }
  ```

---

## 📅 Google Meet Integration

### Create Instant Meeting
Creates a Google Meet link via Calendar API and emails invites.

- **Endpoint**: `POST /meet/invite`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "senderId": "uid_sender",
    "receiverIds": ["uid_receiver_1", "uid_receiver_2"],
    "projectId": "optional_project_id" 
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "message": "Meeting created",
    "meetingUrl": "https://meet.google.com/abc-defg-hij"
  }
  ```

---

## 🛠️ Projects Management

### Get All Projects
Fetches projects owned by or shared with the user.

- **Endpoint**: `GET /projects`
- **Query Params**: `?ownerId=<uid>`
- **Response**: Array of Project objects.

### Update Project
Used to link a GitHub repo or update metadata.

- **Endpoint**: `PATCH /projects/:id`
- **Request Body**:
  ```json
  {
    "githubRepoName": "octocat/Hello-World",
    "isTrackingActive": true
  }
  ```

### Update Task Status
Updates a specific task within a project step.

- **Endpoint**: `PUT /projects/:projectId/steps/:stepId/tasks/:taskId`
- **Request Body**:
  ```json
  {
    "status": "In Progress",
    "assignedTo": "uid_user"
  }
  ```

---

## 👤 User Management

### Sync User
Creates or updates a user in MongoDB after Firebase login.

- **Endpoint**: `POST /users/sync`
- **Auth Required**: No (Called post-login)
- **Request Body**:
  ```json
  {
    "uid": "firebase_uid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "photoURL": "..."
  }
  ```

### Get Current Profile
- **Endpoint**: `GET /users/me`
- **Auth Required**: Yes
- **Response**: User object (including integration status).
