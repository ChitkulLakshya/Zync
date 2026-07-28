/**
 * @fileoverview KanbanBoard.tsx
 * @module KanbanBoard
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
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import TaskDetailDialog, { TaskDetailTask } from "./TaskDetailDialog";

interface Task {
  _id: string;
  id: string;
  title: string;
  description: string;
  status: string;
  assignedTo?: string;
  assignedToName?: string;
  githubBranchName?: string;
  completionCommitMessage?: string;
  githubPrUrl?: string;
  githubPrNumber?: number;
  merged?: boolean;
  projectId?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface Step {
  _id: string;
  id: string;
  title: string;
  tasks: Task[];
}

interface KanbanBoardProps {
  steps: Step[];
  onUpdateTask: (stepId: string, taskId: string, updates: any) => void;
  users: any[];
  isOwner?: boolean;
  currentUser?: any;
  readOnly?: boolean;
  onDeleteTask?: (stepId: string, taskId: string) => void;
}

const COLUMN_MAPPING: Record<string, string> = {
  'Ready': 'Ready',
  'Active': 'Active',
  'In Progress': 'In Progress',
  'Done': 'Done',
  'PR Raised': 'PR Raised',
  // Legacy fallbacks for any old data still in the DB
  'Pending': 'Ready',
  'Backlog': 'Ready',
  'Completed': 'Done',
  'In Review': 'PR Raised'
};

const COLUMNS = ['Ready', 'Active', 'In Progress', 'Done', 'PR Raised'];

const relativeDayLabel = (value?: string) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  
  const absolute = format(date, 'd MMMM yyyy');
  let relative = '';

  if (isToday(date)) {
    relative = 'Today';
  } else if (isYesterday(date)) {
    relative = 'Yesterday';
  } else {
    relative = formatDistanceToNow(date, { addSuffix: true });
  }

  return { absolute, relative };
};

const KanbanBoard = ({ steps, onUpdateTask, users, isOwner, currentUser }: KanbanBoardProps) => {
  const [activeTask, setActiveTask] = useState<(Task & { stepId: string }) | null>(null);

  const handleTaskOpen = (task: Task & { stepId: string }) => {
    const isReadyLike = task.status === 'Ready';
    const isAssignee = task.assignedTo && currentUser?.uid && task.assignedTo === currentUser.uid;
    const resolvedTaskId = task._id || task.id;
    const resolvedStepId = task.stepId;

    if (resolvedTaskId && resolvedStepId && isAssignee && isReadyLike) {
      onUpdateTask(resolvedStepId, resolvedTaskId, { status: 'Active' });
    }

    setActiveTask(task);
  };

  const allTasks = useMemo(() => {
    return steps.flatMap(step =>
      step.tasks.map(task => ({
        ...task,
        status: COLUMN_MAPPING[task.status] || 'Ready',
        stepId: step._id
      }))
    );
  }, [steps]);

  const columns = useMemo(() => {
    const cols: Record<string, typeof allTasks> = {};
    COLUMNS.forEach(c => cols[c] = []);
    allTasks.forEach(task => {
      if (cols[task.status]) {cols[task.status].push(task);}
    });
    return cols;
  }, [allTasks]);

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      <div className="w-full h-full px-4 py-4 grid grid-cols-5 gap-3 min-w-0">
        {COLUMNS.map(column => (
          <div key={column} className="flex flex-col h-full gap-3 min-w-0">
            <div className="sticky top-0 z-20 backdrop-blur-xl bg-secondary/10 px-3 py-2.5 rounded-xl border border-border/10 shadow-sm flex items-center justify-between">
              <span className="font-bold tracking-wide text-sm truncate">{column}</span>
              <Badge variant="secondary" className="bg-secondary text-foreground border-none shrink-0">{columns[column].length}</Badge>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 pb-6 custom-scrollbar space-y-2.5 min-w-0">
              <AnimatePresence mode="popLayout">
                {columns[column].map(task => {
                  const assignedUser = users.find((u: any) => u.uid === task.assignedTo);
                  const assignedLabel = task.assignedToName || assignedUser?.displayName || assignedUser?.email || 'Unknown';
                  const assignedInitials = assignedLabel.substring(0, 2).toUpperCase();
                  const photoURL = assignedUser?.photoURL;
                  const dayLabel = relativeDayLabel(task.updatedAt || task.createdAt);

                  return (
                    <motion.div
                      key={task._id}
                      layoutId={task._id}
                      layout
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      className="relative group"
                    >
                      <div
                        onClick={() => handleTaskOpen(task)}
                        className="relative w-full p-3 rounded-xl backdrop-blur-md transition-all duration-300 bg-secondary/10 border border-border/10 shadow-sm group-hover:border-border/30 hover:shadow-md hover:bg-secondary/20 cursor-pointer"
                      >
                        <span className="block text-sm font-medium leading-snug text-foreground mb-2.5 line-clamp-2">
                          {task.title}
                        </span>

                        {task.assignedTo && (
                          <div className="flex items-center justify-between gap-2">
                            <Avatar className="w-8 h-8 ring-1 ring-border/20">
                              {photoURL && <AvatarImage src={photoURL} alt={assignedLabel} />}
                              <AvatarFallback className="text-[10px] bg-secondary text-foreground">
                                {assignedInitials || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            {dayLabel && (
                              <div className="flex flex-col items-end text-right">
                                <span className="text-[11px] font-medium text-foreground tracking-tight">{dayLabel.absolute}</span>
                                <span className="text-[10px] text-muted-foreground">{dayLabel.relative}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      <TaskDetailDialog
        task={activeTask as TaskDetailTask | null}
        open={Boolean(activeTask)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveTask(null);
          }
        }}
        isOwner={isOwner}
        onMerged={() => setActiveTask(null)}
        users={users}
      />
    </div>
  );
};

export default KanbanBoard;
