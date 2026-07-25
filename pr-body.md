## Description

This PR introduces a significant refactor to the team settings and messaging workflow, enhancing the UX with dynamic layouts and premium design aesthetics.

### 📝 Commit Breakdown

1. **feat(backend): implement activity logging and optimize image processing**
   - Introduced a new backend Activity schema for auditing.
   - Built out Firebase syncing strategies for real-time state consistency.
   - Wrote operations scripts for Redis caching and Cloudinary image optimization to ensure the new heavy UI remains extremely fast.

2. **feat(ui): implement quick chat profile header and refactor team settings**
   - Team Settings Refactor: Migrated the legacy Settings Page into a persistent sliding TeamSettingsSidebar. 
   - Bug Fixes: Resolved the severe prev.map is not a function crash occurring on team edits by restructuring state to handle discrete object changes rather than arrays. Fixed the Meet view custom logo render bug.
   - Quick Chat Profile UI: Built out an incredibly rich, dynamically adapting Profile Header (complete with Avatars, status indicators, bios, and pill-tags) for the new ChatView.

3. **feat(ui): orchestrate quick chat layout and dynamic floating button**
   - Quick Chat Sliding Animation: Integrated ChatView directly into PeopleView to support seamless 1-on-1 Quick Chats that slide over the right-hand Team Settings column specifically when clicking a Close Friend.
   - Dynamic Action Button Positioning: Completely overhauled the positioning of the floating 'Create/Join Team (+)' button. By default it sits over the right-hand settings column; however, when Quick Chat is opened, it smoothly animates out of the way into the Members list (middle column) to avoid blocking text input.

4. **fix(ui): clean up remaining mobile layout and settings views**
   - Stripped away obsolete legacy code.
   - Updated structural dependencies in MobileLayout, DesktopView, and CreateTeamDialog to safely embrace the new TeamSettingsSidebar architecture without regressions.

### 🧪 Verification
- Verified compilation (npx tsc --noEmit) passes cleanly on all modified files.
- Manual verification of the Quick Chat layout and + button sliding animation confirms extremely buttery transitions and pixel-perfect dark theme compliance.
