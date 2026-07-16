# Backend GitHub API Pagination Enhancement

## Overview
This document outlines the enhancement made to the backend GitHub integration to resolve a silent omission of user repositories caused by API pagination defaults.

## The Problem
Users who had linked their GitHub accounts were noticing that not all of their repositories were appearing in the "Add Project" / "Import Existing" modal checklist.
Upon investigating the `/user-repos` route in the backend, it was discovered that the GitHub Octokit `request('GET /installation/repositories')` API implements default pagination, automatically capping responses at 30 repositories per page. Because the frontend `Workspace.tsx` was not designed to send subsequent paginated requests, any repositories beyond the initial 30 were silently truncated from the user interface.

## The Solution
Instead of placing the burden of pagination on the frontend (which would require complex looping and UI loading states), the backend route was updated to autonomously fetch and combine all paginated repositories into a single payload.

### Implementation Details
We modified the `/user-repos` route in `backend/routes/github.js`:
1. Increased the `per_page` query parameter to the GitHub API maximum of `100`.
2. Wrapped the `octokit.request` call in a `while` loop that checks the response headers for a `rel="next"` pagination link.
3. To prevent potential infinite loops or server timeouts for extreme edge cases, the loop is hard-capped at 5 iterations, effectively allowing the server to fetch up to 500 repositories in one go.
4. The server iteratively concatenates the fetched repositories into a single `allRepos` array.
5. This massive, combined array is then formatted and cached in Redis under the `gh:user-repos:${uid}` key for 5 minutes, allowing subsequent frontend requests to instantly pull the complete list without pinging GitHub.

**File Changed:** `backend/routes/github.js`
- Route: `router.get('/user-repos', ...)`
