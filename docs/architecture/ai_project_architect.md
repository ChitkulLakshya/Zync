# 🧠 AI Project Architect

The AI Project Architect is a core backend service in Zync that instantly translates a user's rough project idea (Name and Description) into a fully populated, structured project workspace. 

This document details the exact technical implementation of the feature based on `backend/routes/generateProjectRoutes.js`.

---

## 🏗️ The Generation Flow

When a user submits a prompt via the UI to generate a new project, the frontend sends a `POST` request to `/api/generate-project`. The flow operates as follows:

### 1. AI Inference (Groq Engine)
Instead of Google Gemini, this specific orchestration relies on the **Groq SDK** (`groq-sdk`) to achieve ultra-low latency generation.
- **Model**: It utilizes an OpenAI-compatible model string (`openai/gpt-oss-120b`) routed through the Groq client.
- **Prompt Engineering**: The backend injects the user's `name` and `description` into a strict system prompt acting as a "senior software architect."
- **Structured Output**: The API is constrained using `response_format: { type: 'json_object' }` to guarantee the model returns parsable JSON rather than markdown.

### 2. The Required JSON Schema
The AI is instructed to return a strictly typed JSON object containing two primary root keys: `architecture` and `steps`.

#### `architecture` Object
A deep dive into the technical stack needed for the project:
- `highLevel`: A brief summary of the architecture.
- `frontend`: Specifies `structure`, `pages`, `components`, and `routing`.
- `backend`: Specifies `structure`, `apis`, `controllers`, `services`, and `authFlow`.
- **`database`**: Outlines `design`, `collections`, and `relationships`.
- `apiFlow`: Explains the frontend-backend communication.
- `integrations`: Lists external SDKs and libraries needed.

#### `steps` Array (The Kanban Board)
An array representing the actual phases/columns of the project.
- Each `step` contains: `title`, `description`, `type` (e.g., Frontend, Backend, Database).
- Each `step` contains a `tasks` array, which includes the `title` and `description` for individual Kanban cards.

### 3. Database Ingestion (Mongoose Bulk Operations)
Once the JSON is parsed and cleaned of any rogue markdown backticks, the backend orchestrates a highly efficient bulk-insert operation into the MongoDB database using **Mongoose**:

1. **Project Creation**: A new `Project` document is created. The entire `architecture` JSON blob is saved directly into the `Project.architecture` field.
2. **Steps Bulk Insert**: The backend maps over the generated `steps` and utilizes `Step.insertMany()` to create the Kanban columns simultaneously, assigning them an `order` index and linking them to the `projectId`.
3. **Tasks Bulk Insert**: Finally, it flattens all tasks from all steps into a single array and utilizes `ProjectTask.insertMany()` to create the cards, linking them to their respective newly generated `stepId`s with a default status of `Pending`.

### 4. Client Hydration
After the bulk inserts complete, the server calls `getProjectWithSteps()` to aggregate the newly created Project, its Steps, and its nested Tasks, returning the fully hydrated tree to the frontend in under a few seconds.
