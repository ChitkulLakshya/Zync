/**
 * @fileoverview GitCommandsDrawer.tsx
 * @module GitCommandsDrawer
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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, Terminal, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GitCommandsDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: {
        id: string;
        title: string;
        _id?: string;
        projectName?: string;
        githubBranchName?: string;
        completionCommitMessage?: string;
    } | null;
    project: {
        githubRepoOwner?: string;
        githubRepoName?: string;
    } | null;
}

const CommandBlock = ({ label, command, stepNumber }: { label: string, command: string, stepNumber: number }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(command);
        setCopied(true);
        toast.success("Command copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="group relative pl-6 pb-8 last:pb-0">
            {}
            <div className="absolute left-[11px] top-7 bottom-0 w-px bg-border/10 group-last:hidden" />

            {}
            <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-card/50 backdrop-blur-md border border-border/10 flex items-center justify-center text-[10px] font-mono text-muted-foreground z-10 shadow-sm">
                {stepNumber}
            </div>

            <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground tracking-tight">{label}</span>
            </div>

            <div
                className={cn(
                    "relative overflow-hidden rounded-md bg-zinc-950 dark:bg-card border border-border shadow-elevation3 transition-all duration-200 group-hover:border-foreground/10",
                    "font-mono text-xs text-blue-200"
                )}
            >
                {}
                <div className="absolute top-3 left-3 flex gap-1.5 opacity-50">
                    <div className="w-2 h-2 rounded-full bg-foreground/20" />
                    <div className="w-2 h-2 rounded-full bg-foreground/20" />
                    <div className="w-2 h-2 rounded-full bg-foreground/20" />
                </div>

                <div className="p-4 pt-8 overflow-x-auto">
                    <span className="text-green-500 mr-2">$</span>
                    {command}
                </div>

                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-2 h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleCopy}
                >
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </Button>
            </div>
        </div>
    );
};

export const GitCommandsDrawer = ({ open, onOpenChange, task, project }: GitCommandsDrawerProps) => {
    if (!task) {return null;}


    const taskId = task._id || task.id;
    const branchName = task.githubBranchName || `task/${task.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 30)}-${taskId}`;
    const repoUrl = project?.githubRepoOwner && project?.githubRepoName
        ? `https://github.com/${project.githubRepoOwner}/${project.githubRepoName}.git`
        : "git remote add origin <your-repo-url>";

    const commitMessage = task.completionCommitMessage || `Complete Task: ${taskId}`;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[480px] w-full p-0 flex flex-col bg-background/50 border-l border-border/10 backdrop-blur-2xl">
                <SheetHeader className="p-6 pb-2 border-b border-border/10">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-md bg-foreground/5 text-foreground">
                            <Terminal className="w-4 h-4" />
                        </div>
                        <SheetTitle className="text-lg font-medium tracking-tight">Git Command Assistant</SheetTitle>
                    </div>
                    <SheetDescription className="text-zinc-400 text-xs">
                        Execute these commands in sequence to set up, work on, and sync
                        <span className="text-zinc-200 font-medium ml-1">"{task.title}"</span>.
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1">
                    <div className="p-6 pt-8">
                        <div className="space-y-1">
                            <CommandBlock
                                stepNumber={1}
                                label="Clone Repository"
                                command={`git clone ${repoUrl}`}
                            />
                            <CommandBlock
                                stepNumber={2}
                                label="Checkout Task Branch"
                                command={`git fetch origin ${branchName} && git checkout ${branchName} || git checkout -b ${branchName}`}
                            />
                            <CommandBlock
                                stepNumber={3}
                                label="Stage Changes"
                                command="git add ."
                            />
                            <CommandBlock
                                stepNumber={4}
                                label="Commit with Link"
                                command={`git commit -m "${commitMessage}"`}
                            />
                            <CommandBlock
                                stepNumber={5}
                                label="Push to Remote"
                                command={`git push origin ${branchName}`}
                            />
                        </div>
                    </div>
                </ScrollArea>

                <div className="p-6 border-t border-border/10 bg-transparent">
                    <SheetClose asChild>
                        <Button variant="outline" className="w-full border-border/10 bg-card/50 backdrop-blur-md hover:bg-card/80 hover:text-foreground text-muted-foreground transition-colors">
                            Done
                        </Button>
                    </SheetClose>
                </div>
            </SheetContent>
        </Sheet>
    );
};
