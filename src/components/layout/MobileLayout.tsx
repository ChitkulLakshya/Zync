/**
 * @fileoverview MobileLayout.tsx
 * @module MobileLayout
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
import React from 'react';
import { Menu, Search, Plus, Home, Video, CheckSquare, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
}

export const MobileLayout = ({
    children,
    headerTitle = "Zync",
    activeTab,
    onTabChange,
    drawerContent,
    user,
    onFabClick,
    rightHeaderAction
}: MobileLayoutProps) => {
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

    const navItems = [
        { id: 'Home', icon: Home, label: 'Home' },
        { id: 'Meet', icon: Video, label: 'Meet' },
        { id: 'Tasks', icon: CheckSquare, label: 'Tasks' },
        { id: 'Activity', icon: Bell, label: 'Activity' },
        { id: 'Settings', icon: Settings, label: 'Settings' },
    ];


    const isMainTab = navItems.some(item => item.id === activeTab);

    return (
        <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
            {}
            <header className="h-14 border-b border-border/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 shrink-0 z-40">
                <div className="flex items-center gap-3">
                    <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="-ml-2 h-10 w-10">
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">Open Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[85%] sm:w-[350px] p-0">
                            <SheetHeader className="sr-only">
                                <SheetTitle>Navigation Menu</SheetTitle>
                                <SheetDescription>
                                    Open app navigation links and user account shortcuts.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="flex flex-col h-full bg-background">
                                {user && (
                                    <div className="p-6 border-b flex items-center gap-4 bg-muted/20">
                                        <Avatar className="h-12 w-12 border-2 border-border/10 bg-secondary/10">
                                            <AvatarImage src={user.photoURL} />
                                            <AvatarFallback>{user.displayName?.substring(0, 1) || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="font-semibold truncate text-lg">{user.displayName}</span>
                                            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
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

                    <div className="font-semibold text-lg tracking-tight">
                        {headerTitle}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {rightHeaderAction ? rightHeaderAction : (
                        <Button variant="ghost" size="icon" className="-mr-2 text-muted-foreground">
                            <Search className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </header>

            {}
            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background relative" id="mobile-main-content">
                {children}
            </main>

            {}
            {}
            {onFabClick && (
                <div className="absolute bottom-20 right-4 z-50">
                    <Button
                        onClick={onFabClick}
                        size="icon"
                        className="h-14 w-14 rounded-full shadow-xl bg-foreground text-background hover:bg-foreground/90 transition-transform active:scale-95"
                    >
                        <Plus className="h-6 w-6" />
                    </Button>
                </div>
            )}

            {}
            <nav className="h-16 border-t border-border/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 z-40 pb-safe">
                <div className="grid grid-cols-5 h-full">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 transition-colors relative group",
                                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-xl transition-all duration-200",
                                    isActive ? "bg-foreground/5" : "group-hover:bg-muted"
                                )}>
                                    <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
                                </div>
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </button>
                        )
                    })}
                </div>
            </nav>
        </div>
    );
};
