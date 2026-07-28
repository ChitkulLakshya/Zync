/**
 * @fileoverview App.tsx
 * @module App
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Client-Side Presentation & Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
// Imports the Toaster component from the custom UI library to render temporary toast notifications across the app.
import { Toaster } from "@/components/ui/toaster";
// Imports an alternative Toaster component (aliased as Sonner) from the UI library to support richer toast notification variations.
import { Toaster as Sonner } from "@/components/ui/sonner";
// Imports the TooltipProvider to wrap the app and manage the state and positioning of tooltip components globally.
import { TooltipProvider } from "@/components/ui/tooltip";
// Imports the PersistQueryClientProvider from TanStack Query to enable caching of React Query data to local storage.
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
// Imports the custom query persister configuration that defines how TanStack Query data is serialized and stored locally.
import { queryPersister } from "./lib/query-persister";
// Imports the pre-configured query client instance that holds the cache and configuration for all asynchronous data fetching.
import { queryClient } from "./lib/query-client";
// Imports routing components from react-router-dom to enable client-side navigation and URL synchronization.
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
// Imports the custom ThemeProvider to manage dark/light mode state and apply theme classes to the document body.
import { ThemeProvider } from "@/components/ThemeProvider";
// Imports motion components and AnimatePresence from framer-motion to enable page transition animations.
import { motion, AnimatePresence } from "framer-motion";
// Imports lazy and Suspense from React to enable code splitting, loading components only when they are needed.
import { lazy, Suspense } from "react";
// Imports a custom hook to detect if the user's viewport matches a mobile device breakpoint for responsive rendering.
import { useIsMobile } from "@/hooks/use-mobile";
import { ConfirmProvider } from "@/hooks/use-confirm";

// Dynamically imports the Index page component to split the bundle and load the landing page on demand.
const Index = lazy(() => import("./pages/Index"));
// Dynamically imports the Login page component to load user authentication views only when navigating to /login.
const Login = lazy(() => import("./pages/Login"));
// Dynamically imports the Signup page component to load account creation views on demand.
const Signup = lazy(() => import("./pages/Signup"));
// Dynamically imports the NotFound page component to handle 404 errors gracefully without bloating the main bundle.
const NotFound = lazy(() => import("./pages/NotFound"));
// Dynamically imports the main Dashboard page component for authenticated users.
const Dashboard = lazy(() => import("./pages/Dashboard"));
// Dynamically imports the NewProject page component for creating new projects within the dashboard.
const NewProject = lazy(() => import("./pages/NewProject"));
// Dynamically imports the ProjectDetails page component to view and manage specific project configurations.
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));
// Dynamically imports the PrivacyPolicy page component to serve legal text when requested.
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
// Dynamically imports the Privacy page component as a potential alternative or nested privacy view.
const Privacy = lazy(() => import("./pages/Privacy"));
// Dynamically imports the Terms page component to serve Terms of Service content when requested.
const Terms = lazy(() => import("./pages/Terms"));
// Dynamically imports the WelcomeToZync onboarding page component for first-time users.
const WelcomeToZync = lazy(() => import("./pages/WelcomeToZync"));
// Dynamically imports the mobile-specific Index page component for responsive layout splitting.
const IndexMobile = lazy(() => import("./mobile/pages/IndexMobile"));
// Dynamically imports the mobile-specific Login page component for optimized mobile authentication.
const LoginMobile = lazy(() => import("./mobile/pages/LoginMobile"));
// Dynamically imports the mobile-specific Signup page component.
const SignupMobile = lazy(() => import("./mobile/pages/SignupMobile"));
// Dynamically imports the mobile-specific NotFound page component.
const NotFoundMobile = lazy(() => import("./mobile/pages/NotFoundMobile"));
// Dynamically imports the mobile-specific Dashboard page component tailored for smaller viewports.
const DashboardMobile = lazy(() => import("./mobile/pages/DashboardMobile"));
// Dynamically imports the mobile-specific NewProject page component.
const NewProjectMobile = lazy(() => import("./mobile/pages/NewProjectMobile"));
// Dynamically imports the mobile-specific ProjectDetails page component.
const ProjectDetailsMobile = lazy(() => import("./mobile/pages/ProjectDetailsMobile"));
// Dynamically imports the mobile-specific PrivacyPolicy page component.
const PrivacyPolicyMobile = lazy(() => import("./mobile/pages/PrivacyPolicyMobile"));
// Dynamically imports the mobile-specific Privacy page component.
const PrivacyMobile = lazy(() => import("./mobile/pages/PrivacyMobile"));
// Dynamically imports the mobile-specific Terms page component.
const TermsMobile = lazy(() => import("./mobile/pages/TermsMobile"));
// Dynamically imports the mobile-specific Welcome onboarding page component.
const WelcomeToZyncMobile = lazy(() => import("./mobile/pages/WelcomeToZyncMobile"));
// Imports a custom hook to monitor user presence and activity levels within the application.
import { useActivityTracker } from "./hooks/use-activity-tracker";
// Imports a custom hook to listen for incoming chat messages and dispatch global toast notifications.
import { useChatNotifications } from "./hooks/use-chat-notifications";
// Imports a custom hook to keep the local user profile state in sync with the remote database.
import { useUserSync } from "./hooks/use-user-sync";
// Imports a custom hook to manage background synchronization of application data while the user is active.
import { useSyncData } from "./hooks/useSyncData";
import { usePushNotifications } from "./hooks/use-push-notifications";
// Imports the WakeUpService component to ping or initialize backend services as soon as the app loads.
import { WakeUpService } from "@/components/WakeUpService";

// Defines the AppContent functional component which manages routing, background tracking, and page transitions for the inner application shell.
const AppContent = () => {
  // Invokes the useActivityTracker hook to initialize mouse/keyboard event listeners that detect if the user is currently active or idle.
  useActivityTracker();
  // Invokes the useChatNotifications hook to subscribe to incoming real-time chat messages and trigger UI toast popups when they arrive.
  useChatNotifications();
  // Invokes the useUserSync hook to automatically fetch and synchronize the logged-in user's profile data with the global state on load.
  useUserSync();
  // Invokes the useSyncData hook to establish background intervals that pull the latest app data (projects, tasks) from the server.
  useSyncData();
  usePushNotifications();
  // Calls the useLocation hook from React Router to retrieve the current URL location object, which is needed to trigger route-based animations.
  const location = useLocation();
  // Calls the useIsMobile hook to check the current window width against a CSS media query, returning true if the viewport is mobile-sized.
  const isMobile = useIsMobile();

  // Defines a helper function to generate a unique animation key based on the current URL pathname.
  const getPageKey = (pathname: string) => {
    // Checks if the current pathname starts with the '/dashboard' prefix to group all dashboard sub-routes under a single animation key.
    if (pathname.startsWith('/dashboard')) {
      // Returns a constant string 'dashboard-layout' so that navigating between dashboard tabs does not trigger a full page unmount/remount animation.
      return 'dashboard-layout';
    }
    // Returns the exact pathname for non-dashboard routes so that each unique page gets its own distinct entry/exit animation.
    return pathname;
  };

  // Returns the JSX markup representing the rendered output of the AppContent component, enclosed in a React Fragment.
  return (
    <>
      {/* Renders the WakeUpService component silently in the DOM to send initial ping requests to sleeping backend servers. */}
      <WakeUpService />
      {/* Wraps the page content in AnimatePresence with mode='wait' to ensure the current page fully finishes its exit animation before the new page mounts. */}
      <AnimatePresence mode="wait">
        {/* Uses a framer-motion div to apply smooth enter/exit CSS transform and opacity animations to the current route component. */}
        <motion.div
          // Assigns a dynamic React key using the getPageKey function so framer-motion knows when the route has actually changed.
          key={getPageKey(location.pathname)}
          // Sets the initial animation state for a new page to be fully transparent and shifted 10 pixels downwards.
          initial={{ opacity: 0, y: 10 }}
          // Sets the target animation state for the page to fade in to full opacity and slide up to its natural position.
          animate={{ opacity: 1, y: 0 }}
          // Sets the exit animation state for the page to fade out and slide 10 pixels upwards when it is being unmounted.
          exit={{ opacity: 0, y: -10 }}
          // Configures the transition timing to last 200 milliseconds and use an 'easeOut' curve for a natural decelleration effect.
          transition={{ duration: 0.2, ease: "easeOut" }}
          // Applies Tailwind CSS classes 'h-full w-full' to ensure the animated wrapper takes up 100% of the parent container's height and width.
          className="h-full w-full"
        >
          {/* Wraps the routing layer in a Suspense boundary to catch lazy-loaded components. Uses clean background fallback to prevent dual loading text artifacts. */}
          <Suspense fallback={<div className="min-h-screen w-full bg-background" />}>
            {/* Initializes the React Router Routes container and binds it to the current location object to determine which Route to render. */}
            <Routes location={location}>
              {/* Defines the root '/' route and renders the Index component when the user visits the homepage. */}
              <Route path="/" element={<Index />} />
              {/* Defines the '/login' route, conditionally rendering the mobile or desktop Login component based on the isMobile boolean flag. */}
              <Route path="/login" element={isMobile ? <LoginMobile /> : <Login />} />
              {/* Defines the '/signup' route, conditionally rendering the mobile or desktop Signup component. */}
              <Route path="/signup" element={isMobile ? <SignupMobile /> : <Signup />} />
              {/* Defines the '/welcome' route for onboarding, conditionally rendering the mobile or desktop WelcomeToZync component. */}
              <Route path="/welcome" element={isMobile ? <WelcomeToZyncMobile /> : <WelcomeToZync />} />
              {/* Defines the base '/dashboard' route, conditionally rendering the mobile or desktop Dashboard shell component. */}
              <Route path="/dashboard" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              {/* Defines the '/dashboard/workspace' route to render the Dashboard component with the workspace view active. */}
              <Route path="/dashboard/workspace" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              {/* Defines a dynamic route '/dashboard/workspace/project/:id' to render the Dashboard component and load a specific project by ID. */}
              <Route path="/dashboard/workspace/project/:id" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              {/* Defines the '/dashboard/projects' route to render the Dashboard component with the projects list view active. */}
              <Route path="/dashboard/projects" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              {/* Defines the '/dashboard/calendar' route to render the Dashboard component with the calendar view active. */}
              <Route path="/dashboard/calendar" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              {/* Defines the '/dashboard/design' route to render the Dashboard component with the design view active. */}
              <Route path="/dashboard/design" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              {/* Defines the '/dashboard/tasks' route to render the Dashboard component with the tasks view active. */}
              <Route path="/dashboard/tasks" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              {/* Defines the '/dashboard/notes' route to render the Dashboard component with the notes view active. */}
              <Route path="/dashboard/notes" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              {/* Defines the '/dashboard/files' route to render the Dashboard component with the files view active. */}
              <Route path="/dashboard/files" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              {/* Defines the '/dashboard/activity' route to render the Dashboard component with the activity log view active. */}
              <Route path="/dashboard/activity" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              {/* Defines the '/dashboard/people' route to render the Dashboard component with the team members view active. */}
              <Route path="/dashboard/people" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              {/* Defines the '/dashboard/meet' route to render the Dashboard component with the video meeting integration active. */}
              <Route path="/dashboard/meet" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              {/* Defines the '/dashboard/settings' route to render the Dashboard component with the user settings view active. */}
              <Route path="/dashboard/settings" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              {/* Defines the '/dashboard/chat' route to render the Dashboard component with the messaging interface active. */}
              <Route path="/dashboard/chat" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              {/* Defines the '/dashboard/new-project' route to render the Dashboard component overlayed with a new project creation modal. */}
              <Route path="/dashboard/new-project" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              {/* Defines a standalone '/new-project' route outside the dashboard shell for a dedicated creation flow. */}
              <Route path="/new-project" element={isMobile ? <NewProjectMobile /> : <NewProject />} />
              {/* Defines a standalone '/projects/:id' dynamic route for viewing project details outside the standard dashboard shell. */}
              <Route path="/projects/:id" element={isMobile ? <ProjectDetailsMobile /> : <ProjectDetails />} />

              {/* Defines the '/privacy-policy' route to render the primary PrivacyPolicy page component. */}
              <Route path="/privacy-policy" element={isMobile ? <PrivacyPolicyMobile /> : <PrivacyPolicy />} />
              {/* Defines an alternative '/privacy' route that aliases to the Privacy page component. */}
              <Route path="/privacy" element={isMobile ? <PrivacyMobile /> : <Privacy />} />
              {/* Defines the '/terms' route to render the Terms of Service page component. */}
              <Route path="/terms" element={isMobile ? <TermsMobile /> : <Terms />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              {/* Defines a catch-all wildcard '*' route that acts as a fallback, rendering the NotFound component when no exact paths match. */}
              <Route path="*" element={isMobile ? <NotFoundMobile /> : <NotFound />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

// Defines the root App functional component which wraps the entire application in global providers before rendering AppContent.
const App = () => (
  // Wraps the app in PersistQueryClientProvider to intercept all TanStack Query requests and automatically cache their responses in IndexedDB/localStorage.
  <PersistQueryClientProvider
    // Passes the globally instantiated queryClient which contains the default fetch configurations and active query cache.
    client={queryClient}
    // Passes configuration options dictating how and when the cache should be persisted.
    persistOptions={{
      // Assigns the custom queryPersister function that handles writing and reading cache data from the browser storage APIs.
      persister: queryPersister,
      // Sets the maximum age for persisted cache data to 7 days (calculated in milliseconds: 1000ms * 60s * 60m * 24h * 7d), after which it is discarded.
      maxAge: 1000 * 60 * 60 * 24 * 7,
    }}
  >
    {/* Wraps the app in the ThemeProvider to inject Tailwind dark/light CSS variables into the root HTML element. */}
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ConfirmProvider>
        {/* Wraps the app in TooltipProvider to provide a singular DOM context where all Radix UI tooltip components can portal to. */}
        <TooltipProvider>
        {/* Mounts the standard Toaster component at the root level so toast notifications can render on top of any page. */}
        <Toaster />
        {/* Mounts the Sonner toaster component at the root level to support alternative richer notification styles globally. */}
        <Sonner />
        {/* Wraps the internal AppContent in BrowserRouter to hook into the browser's History API, enabling client-side URL updates without full page reloads. */}
        <BrowserRouter>
          {/* Renders the inner application shell that contains the actual routes, layout, and hook initializations. */}
          <AppContent />
        </BrowserRouter>
        </TooltipProvider>
      </ConfirmProvider>
    </ThemeProvider>
  </PersistQueryClientProvider>
);

// Exports the root App component as the default export so it can be imported and rendered by the main entry file (main.tsx).
export default App;
