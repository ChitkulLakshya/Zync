# Collaborator Onboarding Feature & Changes

## Overview
This document summarizes the changes made to Zync to support the new Open-Source Collaborator Onboarding flow.

## What was implemented?
1. **GitHub Profile Fetching Component (`BetaOnboarding.tsx`)**
   - Built a sleek, glassmorphic onboarding component to replace the standard email signup.
   - Users can now type their GitHub username to fetch and display their GitHub profile.
   - Includes a debounced API request (300-500ms) to ensure optimal performance when querying the public GitHub API.
   - Animated loading spinner, error states, and smooth slide-up/fade-in transitions for the profile card.

2. **Backend API Route (`collaboratorRoutes.js`)**
   - Added a new backend route at `/api/collaborator/register` to handle contributor signups.
   - Validates the GitHub username and ensures data integrity.
   - **Automated GitHub Integration:** Uses `@octokit/rest` to automatically send a collaborator invite to the user on the Zync GitHub repository with `push` permission. This requires `GITHUB_ADMIN_TOKEN`, `GITHUB_REPO_OWNER`, and `GITHUB_REPO_NAME` to be configured in `.env`.
   - Sends a welcome email using `nodemailer` confirming their interest in contributing to the open-source project.
   - Mounted the new route correctly in `backend/index.js`.

3. **GitHub Branch Protection Rules (Manual Setup Required)**
   - To ensure that the newly invited collaborators (who have `push` access to create feature branches) cannot merge to the `main` branch, the organization owner must set up Branch Protection Rules:
     1. Go to your repository **Settings** -> **Branches** on GitHub.
     2. Add a new branch protection rule for the `main` branch.
     3. Check **"Require a pull request before merging"**.
     4. Check **"Require review from Code Owners"**.
     5. Check **"Restrict who can push to matching branches"** and select only the organization owners/administrators.
     6. Save the rules.

4. **Landing Page CTA Update (`CTASection.tsx`)**
   - Replaced generic "Join Beta" text with open-source community-driven messaging.
   - Added typography enhancements using custom font combinations (serif/italic) to highlight key terms like "builder", "passionate developers", "designers", and "open-source enthusiasts".

5. **Desktop Preview Sizing Fix (`DesktopPreview.tsx`)**
   - Corrected the enlarged dashboard views rendered inside the laptop preview mockup.
   - Wrapped the active view sections in a relative container with a precise scale factor (`0.7` scale with `142.857%` bounds), adjusting the content elements to a perfect layout ratio that matches the sidebar proportions seamlessly.

## Security & Reliability Checks
- Performed `npm run typecheck` to ensure the frontend compiles without TypeScript errors.
- Ran `npm audit fix` across the backend to resolve outstanding moderate security vulnerabilities.
