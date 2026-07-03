/**
 * @fileoverview WelcomeToZync.tsx
 * @module WelcomeToZync
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
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  ArrowRight,
  LayoutDashboard,
  Kanban,
  MessageSquare,
  CalendarDays,
  StickyNote,
} from 'lucide-react';
import { Github } from '@/components/ui/GithubIcon';
import { auth } from '@/lib/firebase';
import { markWelcomeComplete, postLoginRedirect } from '@/lib/postLoginRedirect';

const features = [
  {
    icon: Kanban,
    title: 'Plan & Track Tasks',
    description: 'Kanban boards, task assignments, and AI-generated project roadmaps',
  },
  {
    icon: Github,
    title: 'Deep GitHub Sync',
    description: 'Auto-link commits to tasks, contribution graphs, and repo architecture analysis',
  },
  {
    icon: MessageSquare,
    title: 'Team Chat & Calls',
    description: 'Real-time messaging, presence indicators, and built-in video meetings',
  },
  {
    icon: CalendarDays,
    title: 'Shared Calendar',
    description: 'Team scheduling, holiday awareness, and meeting management across timezones',
  },
  {
    icon: StickyNote,
    title: 'Shared Notes',
    description: 'Collaborative notes linked to projects — no more scattered Notion docs',
  },
];

/**
 * First-time user landing (after OAuth / sign-up). Shown when account is new and welcome not completed.
 */
const WelcomeToZync = () => {
  // What: Hook to access the React Router navigation function.
  // Why: We need this to programmatically navigate the user after they complete the welcome flow.
  const navigate = useNavigate();

  // What: Effect that subscribes to Firebase authentication state changes.
  // Why: Ensures that only authenticated users can view this page, redirecting them appropriately.
  useEffect(() => {
    // What: Listener for authentication state.
    // Why: When the auth state resolves, we check if the user is present.
    return onAuthStateChanged(auth, (u) => {
      if (!u) {
        // What: Redirects unauthenticated users to the login page.
        // Why: Protects this route from unauthorized access.
        navigate('/login', { replace: true });
        return;
      }

      // What: Handles post-login logic for the authenticated user.
      // Why: Routes the user to the correct page based on their onboarding status.
      void postLoginRedirect(navigate, u);
    });
  }, [navigate]);

  // What: Handler for the "Explore the dashboard" button.
  // Why: Completes the welcome flow and navigates the user to their main dashboard.
  const goDashboard = () => {
    const u = auth.currentUser;
    if (u) {
      // What: Marks the user's welcome step as complete in the database.
      // Why: Ensures they won't be redirected back to this welcome screen in the future.
      markWelcomeComplete(u.uid);
    }
    navigate('/dashboard', { replace: true });
  };

  // What: Handler for the "Create your first project" button.
  // Why: Completes the welcome flow and directs the user straight into the project creation form.
  const goCreateProject = () => {
    const u = auth.currentUser;
    if (u) {
      // What: Marks the user's welcome step as complete in the database.
      // Why: Similar to the dashboard handler, ensures the onboarding state is updated.
      markWelcomeComplete(u.uid);
    }
    navigate('/new-project', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-8 animate-fade-in">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/10 text-foreground mx-auto">
          <Sparkles className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Zync</h1>
          <p className="text-muted-foreground text-lg">
            Your team's planning, tasks, code, and communication — all in one workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex gap-3 p-3 rounded-lg border border-border/10 bg-card/50 backdrop-blur-xl"
            >
              <div className="mt-0.5 shrink-0 w-8 h-8 rounded-md bg-foreground/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button size="lg" className="gap-2" onClick={goCreateProject}>
            Create your first project
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="gap-2" onClick={goDashboard}>
            <LayoutDashboard className="h-4 w-4" />
            Explore the dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeToZync;
