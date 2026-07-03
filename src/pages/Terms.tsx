/**
 * @fileoverview Terms.tsx
 * @module Terms
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
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Separator } from "@/components/ui/separator";

const Terms = () => {
  return (
    // What: Main container with minimum full viewport height and theme background.
    // Why: Ensures the page spans the screen and maintains visual consistency.
    <div className="min-h-screen bg-background flex flex-col">
      {/* What: The site's top navigation bar.
          Why: Allows users to navigate to other parts of the site from the terms page. */}
      <Navbar />
      {/* What: Main content area with padding and constrained maximum width.
          Why: Provides a clean, readable layout for text-heavy content like terms of service. */}
      <main className="flex-1 container mx-auto px-6 pt-32 pb-20 max-w-3xl">
        <div className="space-y-8">
          <div className="space-y-2">
            <Link
              to="/"
              className="text-sm text-foreground hover:text-foreground/90 transition-colors"
            >
              ← Back to Home
            </Link>
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-foreground">
              Terms of Service
            </h1>
            <p className="text-muted-foreground text-sm">
              Last updated:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <Separator className="my-8" />

          <div className="space-y-8 leading-relaxed text-muted-foreground">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Agreement to Terms
              </h2>
              <p>
                By accessing or using Zync, you agree to be bound by these Terms
                of Service. If you do not agree to these terms, you may not use
                the service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Description of Service
              </h2>
              <p>
                Zync is a real-time collaboration platform built for development
                teams, providing a unified interface for communication, project
                management, and code collaboration. Features include Dashboard,
                Workspace (Kanban boards), Calendar, Notes, Tasks, Chat, Meet
                (video conferencing), and Activity Log. The service is provided
                &quot;as is&quot; without warranties of any kind, express or
                implied. Zync is available as both a web application and a
                cross-platform desktop application (Electron). Its availability,
                features, and functionality may change over time.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                User Responsibility
              </h2>
              <p>
                You are fully responsible for all actions you take through Zync.
                This includes, but is not limited to: content you create or
                share in notes, tasks, and chat; data you upload or sync (e.g.,
                via GitHub integration or Google Calendar); invitations you send
                to team members; and any decisions you make regarding project
                management, task assignments, or workspace configuration. You
                must ensure you have appropriate authorization to share content
                and collaborate with others. You are responsible for maintaining
                the confidentiality of your account credentials.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by law, the creators,
                contributors, and maintainers of Zync shall not be liable for
                any direct, indirect, incidental, special, consequential, or
                punitive damages, including but not limited to: data loss,
                service interruptions, loss of revenue, or any other damages
                arising from your use of the platform. You use Zync at your own
                risk. We are not liable for harm caused by user-initiated
                actions, third-party integrations (e.g., GitHub, Google
                Calendar), or circumstances beyond our control.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Acceptable Use
              </h2>
              <p>
                You agree not to use Zync for any unlawful purpose or in any way
                that could harm, disable, or overburden the service. You will
                not attempt to gain unauthorized access to any systems or
                accounts, distribute malware, or use the platform to harass or
                harm others.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Third-Party Services
              </h2>
              <p>
                Zync integrates with third-party services such as Firebase,
                GitHub, and Google. Your use of these integrations is subject to
                their respective terms and policies. We are not responsible for
                the availability or conduct of third-party services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Modifications
              </h2>
              <p>
                We reserve the right to modify these Terms of Service at any
                time. Continued use of Zync after changes constitutes acceptance
                of the updated terms. We encourage you to review this page
                periodically.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                License
              </h2>
              <p>
                Zync is licensed under the MIT License. You may use, modify, and
                distribute it in accordance with the license. Contributions to
                the project are welcome and subject to our contribution
                guidelines.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Contact
              </h2>
              <p>
                For questions about these Terms of Service, please contact us at{" "}
                <a
                  href="mailto:consolemaster.app@gmail.com"
                  className="text-foreground hover:underline"
                >
                  consolemaster.app@gmail.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
