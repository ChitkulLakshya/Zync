# Bug Fix: Team Settings UI State Crash (`prev.map is not a function`)

## 🐛 The Bug
During the `feature/team-quick-chat-ui` sprint, modifying team settings (such as creating a new team or editing existing team parameters) triggered a fatal UI crash on the frontend:

```text
Uncaught TypeError: prev.map is not a function
    at TeamSettingsSidebar.tsx:127
```

## 🔍 Root Cause Analysis
The crash was isolated to `TeamSettingsSidebar.tsx`, specifically within the React state hook logic responsible for mutating the local UI state after a backend mutation succeeded. 

The underlying problem was a structural mismatch in the state object:
- The component was initialized anticipating `prev` to be an `Array` (since `TeamSettingsSidebar` often handles iterations of teams).
- However, when a discrete update payload was dispatched to the reducer/state hook, it was mistakenly passed an `Object` instead of an `Array`.
- Calling `.map()` on an `Object` instantly crashes the React rendering cycle.

## 🛠️ The Fix
1. **State Isolation**: We refactored `TeamSettingsSidebar` to operate exclusively on the discrete `Object` representation of a single team rather than trying to map over a global array of teams internally.
2. **Prop Drilling Safeties**: We ensured that any modifications made to the team inside the sidebar securely passed the updated discrete `Object` up to the parent `PeopleView` context.
3. **Array Safeties**: For arrays that *were* required (like team members lists), we added defensive fallback checks (`prev?.map` and `Array.isArray(prev)`) to guarantee execution safety even if an API promise resolved unexpectedly.

## ✅ Verification
- Testing team creation and data updates inside `TeamSettingsSidebar` now successfully commit to the database and update the UI cleanly without triggering a React hydration crash.
