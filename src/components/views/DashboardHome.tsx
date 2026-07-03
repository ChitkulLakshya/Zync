/**
 * @fileoverview DashboardHome.tsx
 * @module DashboardHome
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
import React from "react";
import { ArrowRight, MessageSquare, FolderKanban, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const DashboardHome = ({ onNavigate }: { onNavigate: (section: string) => void }) => {
    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-8">
            {}
            <div className="relative z-10 max-w-5xl w-full flex flex-col items-center text-center space-y-12">

                {}
                <div className="space-y-6">
                    {}
                    <div className="flex items-center justify-center gap-2 mb-8 opacity-0 animate-fade-in" style={{ animationDelay: "0ms", animationFillMode: "forwards" }}>
                        <span className="text-xl font-bold tracking-widest uppercase">Zync</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent pb-2 opacity-0 animate-fade-in-up" style={{ animationDelay: "150ms", animationFillMode: "forwards" }}>
                        Unified Workspace for <br />
                        High-Performance Teams
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in-up" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
                        Connect, Collaborate, and Conquer projects with Zync's all-in-one platform.
                        Chat, Video, Tasks, and Calendar in a single interface.
                    </p>

                    <div className="pt-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "500ms", animationFillMode: "forwards" }}>
                        <Button
                            size="lg"
                            className="rounded-full px-8 py-6 text-base font-medium bg-foreground hover:bg-foreground/90 text-background border-0 shadow-lg shadow-foreground/20 transition-all hover:scale-105"
                            onClick={() => onNavigate("Dashboard")}
                        >
                            Get started
                        </Button>
                    </div>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-12 opacity-0 animate-fade-in-up" style={{ animationDelay: "700ms", animationFillMode: "forwards" }}>
                    {/* Card 1 */}
                    <div className="group relative p-1 rounded-2xl bg-gradient-to-b from-border/10 to-transparent hover:from-border/20 transition-all duration-300">
                        <div className="h-full bg-card/50 backdrop-blur-md rounded-2xl p-8 flex flex-col items-start border border-border/10 hover:border-border/30 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center mb-6 text-foreground">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Real-Time Collaboration</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                Instant messaging and file sharing to keep everyone in sync. Never miss a beat with live updates.
                            </p>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="group relative p-1 rounded-2xl bg-gradient-to-b from-border/10 to-transparent hover:from-border/20 transition-all duration-300">
                        <div className="h-full bg-card/50 backdrop-blur-md rounded-2xl p-8 flex flex-col items-start border border-border/10 hover:border-border/30 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center mb-6 text-foreground">
                                <FolderKanban className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Project Management</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                Kanban-style task tracking to streamline workflows. Bridge the gap between planning and execution.
                            </p>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="group relative p-1 rounded-2xl bg-gradient-to-b from-border/10 to-transparent hover:from-border/20 transition-all duration-300">
                        <div className="h-full bg-card/50 backdrop-blur-md rounded-2xl p-8 flex flex-col items-start border border-border/10 hover:border-border/30 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center mb-6 text-foreground">
                                <Globe className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Seamless Integration</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                Video calls and Calendar synced for effortless scheduling. Automated git operations included.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
