/**
 * @fileoverview TaskDetailDrawer.tsx
 * @module TaskDetailDrawer
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
 * @author Chitkul Lakshya <chitkullakshya@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
    SheetClose
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { CheckSquare, Calendar, FolderKanban, User, Clock, Flag, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TaskGitSync } from "./TaskGitSync";
import { useTaskPersistence } from "@/hooks/useTaskPersistence";
import { useEffect } from "react";

export interface TaskDetail {
    id: string;
    _id: string;
    title: string;
    status: string;
    description?: string;
    projectName: string;
    projectId: string;
    stepName: string;
    stepId: string;
    assignedTo?: string;
    assignedToName?: string;
    createdAt?: string | Date;
}

interface TaskDetailDrawerProps {
    task: TaskDetail | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const TaskDetailDrawer = ({ task, open, onOpenChange }: TaskDetailDrawerProps) => {
    const { markTaskOpened } = useTaskPersistence(task?.assignedTo);

    useEffect(() => {
        if (open && task?.id) {
            markTaskOpened(task.id);
        }
    }, [open, task?.id]);

    if (!task) {return null;}

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl w-full flex flex-col gap-0 p-0 bg-background/50 backdrop-blur-2xl">
                {}
                <SheetHeader className="flex flex-col p-6 border-b border-border/10 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Badge variant={task.status === 'Completed' ? 'default' : 'secondary'} className="capitalize px-3 py-1">
                                {task.status}
                            </Badge>
                            {}
                            {}
                        </div>
                        {}
                    </div>

                    <div className="space-y-1">
                        <SheetTitle className="text-2xl font-bold tracking-tight">{task.title}</SheetTitle>
                        <SheetDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FolderKanban className="w-4 h-4" />
                            <span className="font-medium">{task.projectName}</span>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{task.stepName}</span>
                        </SheetDescription>
                    </div>
                </SheetHeader>

                {}
                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-8">
                        {}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> Assigned To
                                </span>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-[10px] bg-foreground/10 text-foreground">
                                            {task.assignedToName?.substring(0, 2).toUpperCase() || "??"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">{task.assignedToName || "Unassigned"}</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> Due Date
                                </span>
                                <div className="text-sm font-medium text-foreground/80">
                                    {}
                                    <span className="text-muted-foreground italic">No due date</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" /> Created
                                </span>
                                <div className="text-sm font-medium text-foreground/80">
                                    {task.createdAt ? format(new Date(task.createdAt), 'MMM d, yyyy') : '-'}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <CheckSquare className="w-4 h-4" /> Description
                            </h3>
                            <div className="bg-card/50 backdrop-blur-md rounded-lg p-2">
                                <Textarea
                                    disabled
                                    className="min-h-[150px] resize-none border-none bg-transparent focus-visible:ring-0 text-sm leading-relaxed"
                                    value={task.description || "No description provided."}
                                    placeholder="Add more details to this task..."
                                />
                            </div>
                        </div>

                        <Separator />

                        {}
                        <div className="space-y-3">
                            <TaskGitSync taskId={task.id} />
                        </div>

                        <Separator />

                        {}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Flag className="w-4 h-4" /> Activity
                            </h3>
                            <div className="bg-card/50 backdrop-blur-md border border-border/10 rounded-lg p-4 space-y-4">
                                <div className="flex gap-3 text-sm text-muted-foreground">
                                    <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0" />
                                    <div>
                                        <p><span className="font-medium text-foreground">System</span> assigned to <span className="font-medium text-foreground">{task.assignedToName}</span></p>
                                        <p className="text-xs mt-0.5 opacity-70">
                                            {task.createdAt ? format(new Date(task.createdAt), 'MMM d, yyyy h:mm a') : 'Recently'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                {}
                <div className="p-6 border-t border-border/10 bg-secondary/10 flex justify-end gap-3">
                    <SheetClose asChild>
                        <Button variant="outline">Close</Button>
                    </SheetClose>

                </div>

            </SheetContent>
        </Sheet>
    );
};

export default TaskDetailDrawer;
