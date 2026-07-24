## Overview

This Pull Request introduces a comprehensive suite of bug fixes and enhancements targeting crucial UX flows and edge cases within the Zync Workspace and GitHub Integration logic.

### 🐛 Bug Fixes

1. **Chromium CSS Animation Glitch (Dialog)**
   - **Issue:** The 'Add Project' modal's scale-down closing animation was visually tearing on Chromium browsers when combined with a backdrop-blur.
   - **Fix:** Removed `backdrop-blur-xl` and `bg-background/80` specifically from the nested `<DialogContent>`, replacing it with a solid `bg-background`. This significantly smooths out the GPU compositing during the animation frame.

2. **Tabs Flexbox Overflow (Workspace Modal)**
   - **Issue:** The list of imported GitHub repositories was aggressively spilling out of the modal boundaries instead of scrolling cleanly.
   - **Fix:** Implemented a strict CSS absolute-positioning architecture. We wrapped the `<TabsContent>` inside a `relative flex-1 overflow-hidden min-h-0` container, and applied `absolute inset-0` directly to the active tab. This detaches the repository list from the fragile flex layout and strictly enforces bounding limits.

3. **Missing Session Data Freeze (My Projects)**
   - **Issue:** If the local MongoDB database is wiped but the Firebase Auth token remains active in the browser, the frontend was receiving a silent 404 from `/api/users/me` and freezing permanently on a "Loading GitHub projects..." text.
   - **Fix:** Upgraded `MyProjectsView.tsx` to explicitly check `userLoading`. If loading completes but `userData` remains falsy, it now gracefully presents a "Session Error" UI prompting the user to log out and log back in, which safely triggers `/api/users/sync` and restores the missing document.

### 🚀 Enhancements

1. **Robust GitHub Repository Pagination Limit**
   - **Issue:** The `/user-repos` route was defaulting to GitHub's standard 30-repository pagination limit, silently hiding older repositories for active users.
   - **Fix:** Refactored the route to implement an automated `while` loop utilizing `octokit.request` that fetches up to 500 repositories (5 pages of 100). The server concatenates the payloads and safely caches them in Redis, delivering a complete list instantly to the frontend.

2. **Added Detailed Markdown Documentation**
   - Introduced a new `docs/bug-fixes/` directory.
   - Added comprehensive markdown write-ups for the aforementioned fixes to ensure historical context and architectural reasoning is preserved for the team.

### 📝 Commit Breakdown
This branch encapsulates these exact improvements spread over 18 distinct granular commits, spanning the last two weeks of development iteratively.
