# Activity Log Visibility & Permissions Update
**Date:** August 06, 2026

## Overview
This document details the bug fixes and enhancements made to the Zync Activity Log system to address two primary issues:
1. Default profile photos not fetching for OAuth providers (Google, LinkedIn, GitHub).
2. The "Activity Log" sidebar menu item loading late ("popping in") due to asynchronous API data fetching.

## Changes Implemented

### 1. OAuth Profile Photo Resolution
**Issue:** User profile photos coming from OAuth providers (Google, GitHub, LinkedIn) or Cloudinary were failing to render or loading broken images inside the Activity Summary Card.

**Root Cause:**
External image URLs often require correct origin handling and referrer policies, especially when they are fully qualified external URLs (e.g., `https://lh3.googleusercontent.com/...`). The previous implementation was rendering raw avatar strings which sometimes lacked proper formatting or triggered CORS/referrer blocks.

**Fix:**
- Updated `ActivitySummaryCard.tsx` to wrap the `photoURL` properties using the existing `getFullUrl()` utility function. This ensures all URLs are correctly formatted.
- Added `referrerPolicy="no-referrer"` to the `<img />` tags. This prevents external providers (like Google) from blocking the image request based on the referring origin (Zync).

**Affected Files:**
- `src/components/views/activity/ActivitySummaryCard.tsx`

### 2. Activity Log Sidebar Visibility & Pop-In Fix
**Issue:** The "Activity log" item in the sidebar was experiencing a noticeable layout shift. When a user loaded the app, the sidebar rendered without the Activity Log, and then it suddenly "popped in" a split second later.

**Root Cause:**
The sidebar menu (in both `DesktopView` and `MobileView`) was conditionally rendering the Activity Log using the `canViewActivityLog` boolean. This boolean depended on `myTeams`, which is populated asynchronously via a network request to `/api/teams/mine` on mount. As a result, the sidebar item was delayed until the network request completed.

**Fix:**
- **Sidebar Unrestricted:** Removed the `canViewActivityLog` check from `DesktopView.tsx` and `MobileView.tsx` sidebar item definitions. The Activity Log tab is now rendered instantly for *all* users, effectively eliminating the layout shift.
- **Conditional Analytics Rendering:** While all users can now access the Activity Log (to view their own personal statistics), we restricted the team-level dropdowns ("Select Team" and "Select Member").
- In `ActivitySummaryCard.tsx`, the dropdown blocks are now conditionally rendered wrapped in `{normalizedTeamFilterOptions.length > 0 && (...) }`. 
- **Dynamic Role Adaptability:** `normalizedTeamFilterOptions` is derived from the teams the user owns or administers. If a regular member is promoted to admin, or creates their own team, the array instantly populates and the dropdowns dynamically appear.

**Affected Files:**
- `src/components/views/DesktopView.tsx`
- `src/components/views/MobileView.tsx`
- `src/components/views/activity/ActivitySummaryCard.tsx`

## Testing & Verification
- Linting ran cleanly via `npm run lint` across the repository.
- Layout shift verified fixed.
- Non-admins successfully see their own activity data but are restricted from viewing the broader team activity analytics.
