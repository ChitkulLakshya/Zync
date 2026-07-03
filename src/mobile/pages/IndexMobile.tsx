/**
 * @fileoverview IndexMobile.tsx
 * @module IndexMobile
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
// Imports the Link component from React Router to enable client-side navigation without full page reloads.
import { Link } from "react-router-dom";
// Imports a set of specific icons from the lucide-react library to visually enhance the feature list.
import { ArrowRight, CheckSquare, MessageSquare, CalendarDays, FolderKanban } from "lucide-react";
// Imports the standard button UI component for consistent styling and interactions.
import { Button } from "@/components/ui/button";
// Imports the Card layout components to structure the feature list items cleanly.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Defines an array of feature objects to dynamically render the "Why Zync" section on the mobile landing page.
const features = [
  {
    title: "Workspace",
    description: "Track projects and architecture in one place.",
    icon: FolderKanban,
  },
  {
    title: "Tasks",
    description: "Assign and monitor task progress quickly.",
    icon: CheckSquare,
  },
  {
    title: "Chat & Meet",
    description: "Collaborate with your team in real time.",
    icon: MessageSquare,
  },
  {
    title: "Calendar",
    description: "Stay aligned with deadlines and meetings.",
    icon: CalendarDays,
  },
];

// Defines the main functional component for the mobile landing/index page.
const IndexMobile = () => {
  return (
    // Wraps the entire page in a container with a transparent background, ensuring it fits the mobile viewport height.
    <div className="min-h-screen bg-transparent px-4 py-5">
      {/* Centers the content and limits its maximum width for optimal reading on phones. */}
      <div className="mx-auto w-full max-w-sm space-y-5">
        
        {/* Renders the top navigation bar containing the logo and login link. */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <>
                {/* Renders the white logo variant specifically for light mode, hiding it in dark mode. */}
                <img src="/zync-white.webp" alt="Zync" className="h-9 w-9 rounded-lg object-contain block dark:hidden" />
                {/* Renders the dark logo variant specifically for dark mode, hiding it in light mode. */}
                <img src="/zync-dark.webp" alt="Zync" className="h-9 w-9 rounded-lg object-contain hidden dark:block" />
            </>
            <span className="text-lg font-semibold text-foreground">Zync</span>
          </div>
          {/* Provides a quick link to the login page for returning users. */}
          <Link to="/login" className="text-sm text-foreground">
            Login
          </Link>
        </div>

        {/* Renders the primary hero section with the main call-to-action buttons. */}
        <section className="space-y-2.5">
          <h1 className="text-[30px] leading-tight font-bold tracking-tight text-foreground">
            Build Faster With Your Team
          </h1>
          <p className="text-sm text-muted-foreground">
            Planning, tasks, chat, notes, and progress in one mobile-ready workspace.
          </p>
          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {/* Renders the primary signup button to encourage new user conversion. */}
            <Button asChild className="w-full">
              <Link to="/signup">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {/* Renders a secondary button for users who might already be logged in to jump straight to their dashboard. */}
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard">Open Dashboard</Link>
            </Button>
          </div>
        </section>

        {/* Renders the feature list mapping over the pre-defined features array. */}
        <section className="space-y-2.5 pb-4">
          {features.map((feature) => {
            // Extracts the specific icon component for this feature.
            const Icon = feature.icon;
            return (
              // Wraps each feature in a Card component with a subtle glassmorphism effect (backdrop-blur).
              <Card key={feature.title} className="bg-card/50 backdrop-blur-xl border-border/10 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-foreground" />
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {feature.description}
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </div>
  );
};

// Exports the component as default for router integration.
export default IndexMobile;
