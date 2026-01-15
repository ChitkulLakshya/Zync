# Reverse Engineered Entity Relationship Diagram (ERD) 🛠️

> **Source**: `backend/models/*.js`
> **Method**: Static analysis of Mongoose Schemas.

## 1. Mongoose ERD (Mermaid.js)

```mermaid
erDiagram
    %% CORE IDENTITIES
    User ||--o{ Project : "owns {ownerId}"
    User ||--o{ Folder : "owns {ownerId}"
    User ||--o{ Note : "creates {ownerId}"
    User ||--o{ Session : "tracks {userId}"

    %% PROJECT HIERARCHY (Embedded Documents)
    Project ||--|{ Step : "embeds [steps]"
    Step ||--|{ Task : "embeds [tasks]"

    %% DOCUMENT ORGANIZATION
    Project ||--o{ Note : "contains {projectId}"
    Folder ||--o{ Folder : "parent/child {parentId}"
    Folder ||--o{ Note : "contains {folderId}"

    %% DEFINITIONS
    User {
        String uid PK "Firebase UID"
        String email
        String role "user/admin"
        Object integrations "GitHub/Google Tokens"
    }

    Project {
        ObjectId _id PK
        String name
        String ownerId FK "User.uid"
        String[] team "User UIDs"
        Object architecture "AI Generated Config"
    }

    Step {
        String id "Generated ID"
        String title
        String status
        String type "Frontend/Backend"
    }

    Task {
        String id "Generated ID"
        String title
        String status "Backlog...Done"
        String assignedTo "User UID"
        Object commitInfo "Git Data"
    }

    Note {
        ObjectId _id PK
        String title
        Object content "BlockNote JSON"
        ObjectId projectId FK "Project._id"
        ObjectId folderId FK "Folder._id"
    }

    Folder {
        ObjectId _id PK
        String name
        ObjectId parentId FK "Folder._id (Recursive)"
        ObjectId projectId FK "Project._id"
    }

    Session {
        ObjectId _id PK
        String userId FK "User.uid"
        Date startTime
        Number duration "Seconds"
    }
```

## 2. Key Findings

### A. Strict Mongoose Relationships (Hybrid Refs)
Your database uses a hybrid approach to relationships:
1.  **Hard References (`ObjectId`)**: Used for `Notes`, `Folders`, and `Projects`. This allows population (`.populate('folderId')`).
2.  **Soft References (`String UID`)**: Used for **Users**. The `User` model is identified by the Firebase `uid` (String), not a MongoDB `_id`. Therefore, `Project.ownerId`, `Note.ownerId`, and `Task.assignedTo` store strings, not ObjectIds. **You cannot use standard Mongoose `.populate('ownerId')` here.** You must manually query the User collection.

### B. Embedded vs. Referenced Tasks
*   **Tasks are EMBEDDED**: `Tasks` do **not** have their own Collection. They exist only inside the `steps` array of a `Project` document.
*   **Implication**: To update a task, you must find the Project first, then traverse the arrays:
    ```javascript
    Project.findOneAndUpdate(
      { "_id": pid, "steps.tasks._id": tid }, 
      { $set: { "steps.$[s].tasks.$[t].status": "Done" } } ...
    )
    ```

### C. Missing Entities (External Data)
*   **Chat Messages**: No `Message` model was found. Based on your codebase, these are stored in **Firebase Firestore** (`chats` / `messages` collections) for real-time performance.
