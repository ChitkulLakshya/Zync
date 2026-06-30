/**
 * @fileoverview TaskDialogs.tsx
 * @module TaskDialogs
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
import React, { useState, useEffect } from 'react';
import { Project, TaskSearchResult, searchTasks } from '../../../api/projects';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";


const TaskSearch = ({ user, onSelect }: { user: any, onSelect: (task: TaskSearchResult) => void }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<TaskSearchResult[]>([]);

    useEffect(() => {
        if (query.length > 2) {
            const timer = setTimeout(async () => {
                const res = await searchTasks(query, user.uid);
                setResults(res);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [query, user.uid]);

    return (
        <Command className="border border-border/10 rounded-xl bg-secondary/5">
            <CommandInput placeholder="Search tasks by title..." onValueChange={setQuery} />
            <CommandList>
                <CommandEmpty>No tasks found.</CommandEmpty>
                <CommandGroup heading="Tasks">
                    {results.map(task => (
                        <CommandItem key={task.id} onSelect={() => onSelect(task)}>
                            <div className="flex flex-col">
                                <span>{task.title}</span>
                                <span className="text-xs text-muted-foreground">{task.projectName} • {task.status}</span>
                            </div>
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </Command>
    )
}

interface TaskDialogsProps {
    user: any;
    projects: Project[];
    taskDialogOpen: boolean;
    setTaskDialogOpen: (open: boolean) => void;
    taskLinkDialogOpen: boolean;
    setTaskLinkDialogOpen: (open: boolean) => void;
    selectedTaskText: string;
    onCreateTask: (projectId: string) => void;
    onLinkTask: (task: TaskSearchResult) => void;
}

export const TaskDialogs: React.FC<TaskDialogsProps> = ({
    user, projects, taskDialogOpen, setTaskDialogOpen,
    taskLinkDialogOpen, setTaskLinkDialogOpen, selectedTaskText,
    onCreateTask, onLinkTask
}) => {
    return (
        <>
            {}
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Convert to Task</DialogTitle>
                        <DialogDescription>
                            Create a new task in Zync Project Management from this line.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="p-3 bg-secondary/20 rounded-xl text-sm italic mb-4 border border-border/10">
                            "{selectedTaskText}"
                        </div>
                        <label className="text-sm font-medium mb-2 block">Select Project</label>
                        <Command className="border border-border/10 rounded-xl bg-secondary/5">
                            <CommandInput placeholder="Search projects..." />
                            <CommandList>
                                <CommandEmpty>No projects found.</CommandEmpty>
                                <CommandGroup>
                                    {projects.map(p => (
                                        <CommandItem key={p._id} onSelect={() => onCreateTask(p._id)}>
                                            {p.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </div>
                </DialogContent>
            </Dialog>

            {}
            <Dialog open={taskLinkDialogOpen} onOpenChange={setTaskLinkDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Link Exisiting Task</DialogTitle>
                    </DialogHeader>
                    <TaskSearch user={user} onSelect={onLinkTask} />
                </DialogContent>
            </Dialog>
        </>
    );
};
