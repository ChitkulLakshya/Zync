# Feature Architecture: GitHub Integration Enhancements

## Overview
This document outlines the recent enhancements made to the **My Projects** view and the **Workspace** dashboard, heavily focusing on deepening the GitHub integration within the Zync platform.

## 1. My Projects: Repository Settings Management
To allow developers to manage their linked GitHub repositories without ever leaving the Zync platform, we introduced native repository settings management directly inside the `MyProjectsView`.

### Features
- **Contextual Editing**: Repositories now feature an **"Edit Settings"** button, which dynamically appears only if the currently authenticated user is the repository owner.
- **Settings Dialog UI**: A responsive, blur-backed Modal (`Dialog`) was implemented to manage key repository metadata.
- **Modifiable Parameters**:
  - **Description**: A multi-line text area allowing updates to the repository description (enforced maximum of 350 characters).
  - **Website URL**: A dedicated input for updating the repository's `homepage` URL.
  - **Topics**: A text input to manage repository topic tags (comma-separated).
- **API Integration**: Upon saving, a `PATCH` request is securely dispatched to the Zync backend (`/api/github/repos/:owner/:repo/settings`) using the user's authentication token. The backend orchestrates the update with the GitHub API.
- **Revalidation**: Upon successful modification, React Query (`queryClient.invalidateQueries`) is utilized to instantly refresh the `['github']` and `['projects']` data caches, ensuring the UI reflects the changes instantly without a hard reload.

## 2. Workspace: Task Assignment & GitHub App Fallbacks
The `Workspace` component was enhanced to provide better error handling and feedback during collaborator task assignments, specifically regarding GitHub App installations.

### Enhancements
- **App Installation State**: Introduced a new state variable (`githubAppNotInstalled`) that tracks whether the Zync GitHub App is actively installed on the target repository.
- **Graceful Degradation**: When a user attempts to load assignable users or invite collaborators, the backend now returns this installation status. If the app is missing, the UI gracefully falls back to using Personal Access Tokens (PAT) or displays localized error messages indicating the missing installation.
- **State Management Polish**: Cleaned up the `useEffect` synchronization blocks to satisfy strict ESLint rules (ensuring curly braces around return statements inside hooks) and preventing unintended re-renders during project selection.

## Conclusion
These updates vastly improve the quality of life for project managers and developers utilizing Zync. By centralizing repository management and implementing strict, graceful error handling for missing GitHub integrations, the platform feels significantly more robust and integrated.
