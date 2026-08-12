/**
 * @fileoverview MobileLayout.tsx
 * @module MobileLayout
 *
 * Premium Mobile Layout component for Zync.
 * Features a 5-item bottom navigation bar: Home, People, + (center), Tasks, Meet.
 * Includes glassmorphism, fluid micro-interactions, and a sleek user side drawer.
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
 * @license AGPL-3.0-only
 * ============================================================================
 */
import React from 'react';
import { Plus, Home, Users, CheckSquare, Video } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { InstallPromptView, useAppInstallStatus } from '@/features/install-wall';

interface MobileLayoutProps {
    children: React.ReactNode;
    headerTitle?: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
    drawerContent?: React.ReactNode;
    user?: {
        displayName?: string;
        email?: string;
        photoURL?: string;
    } | null;
    onFabClick?: () => void;
    rightHeaderAction?: React.ReactNode;
    hideActivityLog?: boolean;
}

export const MobileLayout = ({
    children,
    headerTitle = "Zync",
    activeTab,
    onTabChange,
    drawerContent,
    user,
    onFabClick,
    rightHeaderAction,
}: MobileLayoutProps) => {
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
    const { hasCheckedStatus, requiresInstallWall, isIOS, isAndroid } = useAppInstallStatus();

    // if (hasCheckedStatus && requiresInstallWall) {
    //     return <InstallPromptView isIOS={isIOS} isAndroid={isAndroid} appName="ZYNC" />;
    // }

    // Bottom Navigation Items strictly matching user specification: Home, People, +, Tasks, Meet
    const leftNavItems = [
        { id: 'Home', icon: Home, label: 'Home' },
        { id: 'People', icon: Users, label: 'People' },
    ];

    const rightNavItems = [
        { id: 'Tasks', icon: CheckSquare, label: 'Tasks' },
        { id: 'Meet', icon: Video, label: 'Meet' },
    ];

    return (
        <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden font-sans">
            {/* Top Header Bar */}
            <header className="h-14 px-4 border-b border-white/10 dark:border-white/10 bg-background/70 backdrop-blur-2xl backdrop-saturate-180 shrink-0 z-30 flex items-center justify-between relative">
                <div className="flex items-center gap-2">
                    <img
                        src="/zync-white.webp"
                        alt="Zync"
                        className="h-6 w-auto object-contain block dark:hidden"
                    />
                    <img
                        src="/zync-dark.webp"
                        alt="Zync"
                        className="h-6 w-auto object-contain hidden dark:block"
                    />
                    <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                        Zync
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {rightHeaderAction}

                    {/* User Profile Avatar / Drawer Trigger */}
                    <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                        <SheetTrigger asChild>
                            <button
                                className="relative outline-none rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all active:scale-95"
                                aria-label="Open menu"
                            >
                                <Avatar className="w-8 h-8 border border-border/30 shadow-sm">
                                    <AvatarImage src={user?.photoURL} alt={user?.displayName || 'User'} />
                                    <AvatarFallback className="text-[11px] font-semibold bg-gradient-to-br from-primary/90 to-primary text-primary-foreground">
                                        {user?.displayName?.substring(0, 2).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[85%] sm:w-[350px] p-0 border-l border-border/20 bg-background/95 backdrop-blur-2xl">
                            <SheetHeader className="sr-only">
                                <SheetTitle>Navigation Menu</SheetTitle>
                                <SheetDescription>
                                    Open app navigation links and user account shortcuts.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="flex flex-col h-full bg-background">
                                {user && (
                                    <div className="p-5 border-b border-border/10 flex items-center gap-3.5 bg-card/40 backdrop-blur-md">
                                        <Avatar className="h-11 w-11 border-2 border-border/20 shadow-md">
                                            <AvatarImage src={user.photoURL} />
                                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                                                {user.displayName?.substring(0, 1) || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col overflow-hidden min-w-0">
                                            <span className="font-semibold truncate text-base text-foreground">
                                                {user.displayName || 'User'}
                                            </span>
                                            <span className="text-xs text-muted-foreground truncate">
                                                {user.email}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div
                                    className="flex-1 overflow-y-auto"
                                    onClick={(event) => {
                                        const target = event.target as HTMLElement;
                                        if (target.closest("button, a, [data-close-drawer='true']")) {
                                            setIsDrawerOpen(false);
                                        }
                                    }}
                                >
                                    {drawerContent}
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            {/* Main View Area */}
            <main className="flex-1 w-full flex flex-col box-border overflow-y-auto overscroll-contain bg-background relative touch-pan-y" id="mobile-main-content">
                {children}
            </main>

            {/* Modern 5-Item Bottom Navigation Bar */}
            <nav className="h-16 border-t border-border/10 bg-background/85 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/70 shrink-0 z-40 pb-safe relative">
                <div className="flex items-center justify-around px-2 h-full max-w-lg mx-auto">
                    {/* Left Nav: Home, People */}
                    {leftNavItems.map((item) => {
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={cn(
                                    "flex flex-col items-center justify-center py-1 px-3 min-w-[56px] transition-all duration-200 relative group",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground active:scale-95"
                                )}
                            >
                                <div className="relative">
                                    <Icon className={cn("w-5 h-5 transition-transform duration-200", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 1.8} />
                                </div>
                                <span className={cn("text-[10px] mt-1 font-medium tracking-tight transition-colors", isActive ? "font-semibold text-primary" : "opacity-80")}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}

                    {/* Center Floating Action Button (+) */}
                    <div className="flex items-center justify-center px-1">
                        <button
                            onClick={onFabClick || (() => onTabChange('Projects'))}
                            className="w-11 h-11 rounded-full bg-gradient-to-tr from-foreground via-foreground/95 to-foreground/80 text-background shadow-lg shadow-foreground/10 hover:shadow-foreground/20 flex items-center justify-center ring-4 ring-background transition-all duration-200 active:scale-90 hover:scale-105"
                            aria-label="Create item"
                        >
                            <Plus className="w-5 h-5 stroke-[2.5]" />
                        </button>
                    </div>

                    {/* Right Nav: Tasks, Meet */}
                    {rightNavItems.map((item) => {
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={cn(
                                    "flex flex-col items-center justify-center py-1 px-3 min-w-[56px] transition-all duration-200 relative group",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground active:scale-95"
                                )}
                            >
                                <div className="relative">
                                    <Icon className={cn("w-5 h-5 transition-transform duration-200", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 1.8} />
                                </div>
                                <span className={cn("text-[10px] mt-1 font-medium tracking-tight transition-colors", isActive ? "font-semibold text-primary" : "opacity-80")}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};
