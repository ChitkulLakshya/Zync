# Frontend Session Error Handling

## Overview
This document outlines the investigation and resolution of an edge-case bug where the `/dashboard/projects` ("My Projects") screen would permanently freeze on a "Loading GitHub projects..." text after local server restarts.

## The Problem
During development, if the terminal running the backend server is restarted, any in-memory database or locally volatile database instance gets wiped. However, the user's browser retains an active Firebase authentication session (persisted in IndexedDB).
When the user refreshed the frontend app:
1. Firebase Auth declared the user "logged in".
2. The `useMe` React Query hook automatically called the backend `/api/users/me` endpoint using the valid Firebase token.
3. The backend, having just been wiped, could not find the corresponding MongoDB `User` document, and correctly responded with a `404 User Not Found` error.
4. The `useMe` hook caught the `404`, returning `null` as the `userData`.
5. In `MyProjectsView.tsx`, the logic `if (!userData)` simply returned a `<div>` reading "Loading GitHub projects...". Because the data would never resolve, the user was permanently trapped on this fake loading screen without any explanation.

## The Solution
We updated the frontend UI component to gracefully intercept this specific state mismatch (Authentication exists, but Database Record does not).

### Implementation Details
We modified `src/components/views/MyProjectsView.tsx` to explicitly check the `userLoading` state alongside the missing `userData`:
```typescript
if (!userData) {
  if (!userLoading) {
    // We finished loading, but userData is still falsy (404 Not Found)
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center space-y-4">
         <h2 className="text-xl font-bold">Session Error</h2>
         <p className="text-muted-foreground">Your user profile could not be found in the database. Please log out and log back in to restore your session.</p>
      </div>
    );
  }
  return (
    <div className="p-8 text-sm text-muted-foreground">Loading GitHub projects…</div>
  );
}
```

By adding this conditional check, if a database wipe occurs in the future, the user will now immediately see a "Session Error" prompting them to log out and log back in. The act of logging back in safely hits the `/api/users/sync` endpoint, completely restoring their missing MongoDB document and returning the app to a functional state.

**File Changed:** `src/components/views/MyProjectsView.tsx`
