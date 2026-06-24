# Dashboard Loading Execution Plan (April 2026)

## Purpose

Create a single, trustworthy loading experience across all dashboard pages using this policy:

1. Do not show any loading UI for waits under 300 ms.
2. Use skeletons for cards/lists when wait is likely over 300 ms.
3. Use spinners for short blocking actions under about 3 seconds.
4. Use progress bars for long operations where step or percentage is known.
5. Use optimistic UI for high-success actions with mandatory rollback.
6. Always preserve user trust with visible progress for long operations.

## Detailed Scan Snapshot (Current State)

The scan covered route shell, desktop and mobile dashboard layout, all section views, and key hooks/apis.

### Routing and shell

1. Top-level lazy routes are in src/App.tsx with one generic Suspense text fallback.
2. Dashboard sections are switched in src/components/views/layout/DesktopView.tsx.
3. Mobile uses separate tab rendering in src/components/views/layout/MobileView.tsx.

### Observed loading patterns today

1. Mixed usage of plain text loaders, boneyard skeletons, local loading booleans, and optimistic mutations.
2. No uniform 300 ms delay gate.
3. No global progress orchestration for long actions.
4. Refetch often replaces content instead of stale-while-refresh behavior.

### Existing optimistic behavior already present

1. People close-friend toggle optimistic mutation in src/components/views/people/PeopleView.tsx.
2. Notes drag/drop optimistic local move in src/components/notes/NotesLayout.tsx.
3. Local-first optimistic mutation path in src/hooks/useSyncData.ts.

## Standard Loading Contract

### Global rules

1. Delay all loading indicators by 300 ms.
2. Never blank an already-rendered page during refetch.
3. Refetch uses subtle inline indicator, not full skeleton reset.
4. Mutation loading is scoped to the exact button/row/dialog.
5. Long operations must show determinate progress or explicit step phases.
6. Optimistic actions must have rollback, retry, and user-facing failure explanation.

### UI primitive catalog to implement

1. DelayedLoaderGate: central 300 ms display threshold.
2. SectionSkeleton: reusable card/list skeleton presets.
3. InlineRefreshChip: tiny refetch indicator for headers/panels.
4. ActionSpinner: button or row-level spinner for short mutations.
5. StepProgressBar: for long operations with known stages.
6. OfflineBanner: global and section-level offline notice with retry.
7. ErrorPanel: consistent recoverable error block with Retry action.

## Per-Page Loading Contracts

### Dashboard shell

Files:
1. src/App.tsx
2. src/components/views/layout/DesktopView.tsx
3. src/components/views/layout/MobileView.tsx

Contract:
1. Replace generic Suspense text fallback with delayed route-transition loading.
2. Keep sidebar/header mounted during section transitions.
3. For transitions under 300 ms, show nothing.
4. For 300 ms to 3 s, show compact spinner near section title.
5. For over 3 s (route chunk + data), show section skeleton with preserved chrome.

### Dashboard page

File:
1. src/components/views/dashboard/DashboardView.tsx

Current:
1. Full text loader: Loading dashboard.
2. Multiple queries combined into one blocking state.

Target:
1. Initial load: delayed card/list skeletons.
2. Refetch: preserve cards, show InlineRefreshChip.
3. GitHub unlink/connect action: ActionSpinner on control.
4. Empty state and disconnected state remain visible and non-blocking.

### Workspace page

File:
1. src/components/workspace/Workspace.tsx

Current:
1. Uses Skeleton wrapper for full page.
2. Repo modal fetches show text + spinner.

Target:
1. Initial load: card-grid skeleton after delay gate.
2. Refetch projects/notes: keep existing cards visible, subtle top refresh indicator.
3. Repo list loading in modal: short spinner if quick; switch to list skeleton if over 300 ms.
4. Multi-create project flow: add step progress (selected -> creating -> complete).
5. Delete/link/create actions remain scoped button spinners.

### My Projects page

File:
1. Do not show any loading UI for waits under 300 ms.
2. Use Boneyard skeletons for cards/lists when wait is likely over 300 ms.
Current:
1. Text-only early return loader for userData missing.
2. Skeleton wrapper for grid.
5. StepProgressBar: for long operations with known stages.
6. OfflineBanner: global and section-level offline notice with retry.
7. ErrorPanel: consistent recoverable error block with Retry action.

Skeleton implementation standard:
1. Use Boneyard skeleton primitives for all page/list/card skeleton states.
2. Do not introduce ad hoc shimmer blocks or CSS-only placeholder clones when a Boneyard preset exists.
3. Keep skeleton shapes aligned to the final layout so the loading state reads as a preview, not a separate design.
2. Keep tab content stable during refetch/pagination.
3. Connect GitHub uses ActionSpinner only on connect button.
4. Pagination fetch shows inline page loader, not full grid reset.

1. Initial load: delayed Boneyard card/list skeletons.

File:
1. Initial load: delayed Boneyard card-grid skeleton after delay gate.

Current:
1. Initial: delayed Boneyard calendar skeleton.

Target:
1. Initial load: Boneyard list skeleton after 300 ms.
2. Country switch refetch: keep current calendar visible and show small header refresh chip.
3. Error fetching holidays/countries: ErrorPanel with retry.
1. Replace text loaders with split-pane Boneyard skeletons (left list + editor skeleton).

### Tasks page
1. Preserve sidebar and header always; only list area loads.
2. Use Boneyard skeleton cards for the member list when query latency exceeds 300 ms.
3. Keep optimistic toggle, add explicit rollback toast with Retry action.
4. Invite action stays button-level spinner.
5. Add offline fallback for team/member list from cache.
Current:
1. Whole-page Skeleton wrapper.
4. Contact/request fetches: delayed Boneyard list skeleton only in side panels.

Target:
1. Team select dialog: delayed Boneyard skeleton list for teams.
2. Refetch: keep task list visible with inline refresh chip.
3. Task status transitions and create task: ActionSpinner only on affected row/button.
1. Replace full-screen text loader with structured Boneyard project skeleton.

### Notes page

Files:
1. src/components/notes/NotesLayout.tsx
2. src/components/notes/NoteEditor.tsx

Current:
1. Text-only loading notes and loading editor states.
2. Already has optimistic drag/drop update.

Target:
1. Replace text loaders with split-pane skeletons (left list + editor skeleton).
2. Keep optimistic drag/drop and rename/create updates.
3. Add rollback visual marker and quick retry when optimistic action fails.
4. Refetch should never blank editor while note content exists.

### People page

File:
1. src/components/views/people/PeopleView.tsx

Current:
1. Member cards skeleton block exists.
2. Team and user queries loaded independently.
3. Optimistic close-friend toggle already exists.

Target:
1. Preserve sidebar and header always; only list area loads.
2. Keep optimistic toggle, add explicit rollback toast with Retry action.
3. Invite action stays button-level spinner.
4. Add offline fallback for team/member list from cache.

### Chat and Messages

Files:
1. src/components/views/chat/ChatLayout.tsx
2. src/components/views/chat/ChatView.tsx
3. src/components/views/chat/MessagesPage.tsx

Current:
1. Mostly no skeleton strategy; mixed local loading flags.
2. Upload uses isUploading state.

Target:
1. Do not use full-page loaders in chat.
2. Keep conversation visible during list refresh.
3. Message send/upload remains action-level spinner.
4. Contact/request fetches: delayed list skeleton only in side panels.
5. Add failed-send state with retry for trust.

### Meet page

File:
1. src/components/views/meet/MeetView.tsx

Current:
1. Team query has loading in dialog text.
2. Instant meeting creates a temporary new window and waits.

Target:
1. Team select dialog: delayed skeleton list for teams.
2. Start instant meeting: short spinner then step progress (creating link, notifying participants, opening room).
3. Schedule meeting: button-level spinner and progress for long operations.
4. Meetings list refresh keeps existing list visible.

### Settings page

File:
1. src/components/views/settings/SettingsView.tsx

Current:
1. Heavy shared loading flag across many actions.
2. Many independent operations reuse same loading flag.

Target:
1. Split loading by operation key (profileSave, githubConnect, googleConnect, supportSubmit, deleteFlow).
2. Only disable and spin affected controls.
3. Keep form visible during save/refetch.
4. Long operations (linking providers) use step progress panel.

### Project details page

File:
1. src/pages/ProjectDetails.tsx

Current:
1. Full-screen text loader for project details.

Target:
1. Replace full-screen text loader with structured project skeleton.
2. Refetch preserves tabs/sections.
3. Task mutation operations use row-level spinners and optimistic where safe.
4. Analysis/generation workflows expose progress bar with clear phases.

## Shared Architecture Work

## 1) Loading orchestrator

Implement a lightweight loading orchestrator that receives events from:
1. Route lazy transitions.
2. React Query query/mutation lifecycle.
3. Long operation workflows.

Responsibilities:
1. Apply 300 ms gate.
2. Select loader type by operation class.
3. Prevent double loaders (route + page).
4. Emit telemetry.

## 2) Query policy alignment

Use React Query to enforce stale-while-refresh behavior:
1. Keep previous data on refetch where possible.
2. Avoid full unmounts for refetch states.
3. Prefer section-level loading indicators over page resets.

## 3) Optimistic policy

For high-success operations:
1. Apply optimistic update immediately.
2. Store rollback snapshot.
3. On failure, restore snapshot and show contextual retry action.
4. Track rollback rate by operation.

## 4) Offline policy

1. Global offline detector and section-level badges.
2. Show cached data if available.
3. Disable only network-dependent destructive actions.
4. Add one-click retry when connectivity resumes.

## Phased Rollout Plan (Rollback-Safe)

## Phase 1: Foundation and Instrumentation

Tasks:
1. Build loading primitives and DelayedLoaderGate.
2. Add loading orchestrator and telemetry event schema.
3. Add feature flags: loading_orchestrator, page_contracts, optimistic_contracts.

Acceptance:
1. No loader appears before 300 ms in controlled tests.
2. Telemetry events emitted for query/mutation/route load.

Verification:
1. Unit tests for threshold and loader selection.
2. Integration tests for route + query overlap suppression.

Rollback:
1. Disable loading_orchestrator flag.

## Phase 2: Shell and Navigation Unification

Tasks:
1. Replace App-level generic Suspense fallback.
2. Integrate section transition loading in DesktopView and MobileView.

Acceptance:
1. Dashboard chrome never disappears during section switches.
2. No double loader flashes.

Verification:
1. Route transition E2E on desktop and mobile.

Rollback:
1. Re-enable legacy Suspense fallback.

## Phase 3: Core Productivity Pages

Scope:
1. DashboardView
2. Workspace
3. MyProjectsView
4. TasksView
5. CalendarView

Tasks:
1. Replace text-only loaders.
2. Add delayed skeletons and refetch chips.
3. Add scoped mutation spinners.

Acceptance:
1. All five pages conform to contract.
2. Refetch does not blank content.

Verification:
1. Page-level integration tests under simulated latency.

Rollback:
1. Per-page contract flag toggles.

## Phase 4: Collaboration Pages [COMPLETED]

Scope:
1. NotesLayout
2. PeopleView
3. ChatLayout
4. MessagesPage
5. MeetView

Tasks:
1. Standardize list skeletons and mutation states.
2. Harden optimistic rollback messaging.
3. Add offline and retry behavior.

Acceptance:
1. Collaboration pages maintain continuity during refresh.
2. Optimistic failures are recoverable and visible.

Verification:
1. Optimistic failure injection tests.
2. Offline simulation tests.

Rollback:
1. Disable optimistic_contracts for affected operations.

## Phase 5: Settings & Project Details (COMPLETED)

**Goal:** Transition Settings and Project management from monolithic flags to granular, operation-specific loading indicators with step-based progress.

Scope:
1. SettingsView
2. ProjectDetails
3. DesignView progressive fetch tuning

Tasks:
1. Split monolithic loading states into operation-specific states.
2. Add progress bars/step indicators for long tasks.
3. Replace remaining text-only loaders.

Acceptance:
1. Long-running operations provide explicit progress.
2. No global UI freezes from one loading flag.

Verification:
1. Integration tests for provider linking, profile save, project analysis flows.

Rollback:
1. Fall back to action spinners while keeping telemetry.

## Phase 6: Hardening, Metrics Gates, and Full Enablement

Tasks:
1. Run cohort rollout (10%, 50%, 100%).
2. Compare trust/perf metrics pre and post.
3. Fix regressions and remove dead loading paths.

Acceptance:
1. Metrics targets achieved for two release cycles.
2. No critical UX regressions.

Verification:
1. Full regression pass: unit, integration, E2E.

Rollback:
1. Roll cohort back via feature flags.

## Metrics and Success Gates

Track:
1. loader_shown_under_300ms_rate (target near zero)
2. median_visible_loading_ms
3. p95_visible_loading_ms
4. refetch_blank_screen_rate (target zero)
5. optimistic_rollback_rate (operation-specific)
6. retry_success_rate
7. offline_recovery_time
8. repeated_click_rate_during_loading (trust proxy)

Release gates:
1. No increase in failed user actions.
2. Reduced visible loader flashes.
3. Improved completion rate for key flows (task updates, note actions, meeting scheduling).

## Risk Register

1. Double-loading from route and page loaders.
Mitigation: orchestrator ownership and suppression rules.

2. Over-skeletonization causing noisy UI.
Mitigation: skeleton only for list/card regions and delayed gate.

3. Optimistic drift from server state.
Mitigation: mandatory rollback snapshots and invalidate on settle.

4. Shared loading booleans blocking unrelated UI (notably Settings).
Mitigation: operation-scoped loading states.

5. Offline inconsistencies across pages.
Mitigation: shared offline policy and retry primitives.

## Definition of Done

1. Every dashboard page listed above has a documented and implemented loading contract.
2. No loading UI under 300 ms across audited flows.
3. Refetch preserves existing content on all pages.
4. Long operations show progress.
5. Optimistic actions include rollback and retry.
6. Telemetry and rollout flags are in place.
7. Regression suite passes before full rollout.

## Suggested Execution Order by PR

1. PR-1: primitives + orchestrator + telemetry + flags.
2. PR-2: route shell and desktop/mobile navigation loading unification.
3. PR-3: dashboard/workspace/projects/tasks/calendar contracts.
4. PR-4: notes/people/chat/messages/meet contracts.
5. PR-5: settings/project details/design long-flow progress and final cleanup.
6. PR-6: rollout hardening, dead-path removal, docs update.
