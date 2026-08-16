# 53 — Frontend Routing & Layout

**NEW document** — React Router structure, lazy loading, protected routes, layout components, navigation

---

## Feature Summary

The Zync frontend uses React Router DOM for client-side routing. Routes are organized into public (login, register), protected (dashboard, projects, settings), and modal-based routes. Layout components provide the app shell with sidebar navigation, top bar, and content area.

---

## Architecture Diagram

```
┌─────────────────── REACT ROUTER ────────────────────────┐
│                                                         │
│  App.tsx                                                │
│  └─ <BrowserRouter>                                     │
│     └─ <Routes>                                         │
│        ├─ / (Public)                                    │
│        │   ├─ /login → Login.tsx                        │
│        │   ├─ /register → Register.tsx                  │
│        │   └─ /beta → BetaApplication.tsx               │
│        │                                                │
│        ├─ / (Protected, wrapped in ProtectedRoute)      │
│        │   └─ AppLayout.tsx                             │
│        │      ├─ Sidebar (navigation)                   │
│        │      ├─ TopBar (search, notifications)         │
│        │      └─ <Outlet>                               │
│        │         ├─ /dashboard → DashboardHome.tsx      │
│        │         ├─ /projects → ProjectsView.tsx        │
│        │         ├─ /projects/:id → ProjectWorkspace    │
│        │         ├─ /messages → MessagesPage.tsx        │
│        │         ├─ /notes → NotesView.tsx              │
│        │         ├─ /teams → TeamsView.tsx              │
│        │         ├─ /meetings → MeetingsView.tsx        │
│        │         ├─ /settings → SettingsView.tsx        │
│        │         └─ /calendar → CalendarView.tsx        │
│        │                                                │
│        └─ * → NotFound.tsx                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Route Protection

### ProtectedRoute Component
```tsx
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  return children;
};
```
- Checks Firebase Auth state
- Redirects to `/login` if not authenticated
- Shows spinner during auth state loading

### Auth Context
**File:** `src/context/AuthContext.tsx`
- Uses `onAuthStateChanged` from Firebase Auth
- Provides `{ user, loading, login, logout }`
- All protected routes consume this context

---

## Lazy Loading

```tsx
const DashboardHome = lazy(() => import('./views/DashboardHome'));
const ProjectWorkspace = lazy(() => import('./views/ProjectWorkspace'));
const MessagesPage = lazy(() => import('./views/MessagesPage'));

// Wrapped in Suspense:
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<DashboardHome />} />
    ...
  </Routes>
</Suspense>
```
- Reduces initial bundle size
- Each view loaded on demand
- Suspense fallback shows loading spinner

---

## Layout Components

### AppLayout
**File:** `src/components/layout/AppLayout.tsx`
- App shell with sidebar + topbar + content area
- Uses `<Outlet />` for nested routes
- Responsive: sidebar collapses on mobile

### Sidebar
**File:** `src/components/layout/Sidebar.tsx`
- Navigation links: Dashboard, Projects, Messages, Notes, Teams, Meetings, Calendar, Settings
- Active route highlighting
- User avatar at bottom
- Collapsible on mobile (hamburger menu)

### TopBar
**File:** `src/components/layout/TopBar.tsx`
- Global search bar
- Notifications bell (unread chat count)
- User dropdown menu (profile, settings, logout)

---

## Navigation Flow

```
Login → Auth check → Redirect to /dashboard
  ↓
Dashboard → Sidebar navigation
  ├─ Projects → Project list → Click project → ProjectWorkspace
  ├─ Messages → Conversation list → Click chat → Chat window
  ├─ Notes → Note list → Click note → Note editor
  ├─ Teams → Team list → Click team → Team detail
  └─ Settings → Profile/Integrations/Security tabs
```

---

## Cross-References

- [08-firebase-auth-flow.md](./08-firebase-auth-flow.md) — Auth context and protected routes
- [01-frontend-architecture.md](./01-frontend-architecture.md) — Frontend structure overview
- [50-socket-io-initialization.md](./50-socket-io-initialization.md) — Socket context provider
