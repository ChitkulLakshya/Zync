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
 * @author Chitkul Lakshya <chitkullakshya@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface Task {
  _id: string;
  id: string;
  title: string;
  description: string;
  status: string;
  assignedTo?: string;
  assignedToName?: string;
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
  'Pending': 'Ready',
  'Backlog': 'Ready',
  'Ready': 'Ready',
  'Active': 'Active',
  'In Review': 'In Progress',
  'In Progress': 'In Progress',
  'Completed': 'Done',
  'Done': 'Done'
};

const COLUMNS = ['Ready', 'Active', 'In Progress', 'Done'];

const KanbanBoard = ({ steps, onUpdateTask, users, isOwner, currentUser, readOnly, onDeleteTask }: KanbanBoardProps) => {
  const [draggedTask, setDraggedTask] = useState<{ task: Task, stepId: string } | null>(null);

  const handleTaskOpen = (task: Task & { stepId: string }) => {
    const isReadyLike = ['Ready', 'Pending', 'Backlog'].includes(task.status);
    const isAssignee = task.assignedTo && currentUser?.uid && task.assignedTo === currentUser.uid;
    const resolvedTaskId = task._id || task.id;
    const resolvedStepId = task.stepId;

    if (!resolvedTaskId || !resolvedStepId) {
      return;
    }

    if (!isOwner && isAssignee && isReadyLike) {
      onUpdateTask(resolvedStepId, resolvedTaskId, { status: 'Active' });
    }
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

  const handleDragStart = (e: React.DragEvent, task: Task, stepId: string) => {
    setDraggedTask({ task, stepId });
    e.dataTransfer.setData("text/plain", JSON.stringify({ taskId: task._id, stepId }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (!draggedTask) {return;}
    const resolvedTaskId = draggedTask.task._id || draggedTask.task.id;
    if (!resolvedTaskId) {
      setDraggedTask(null);
      return;
    }

    if (draggedTask.task.status !== targetStatus) {
      let schemaStatus = targetStatus;
      if (targetStatus === 'Done') {schemaStatus = 'Completed';}
      onUpdateTask(draggedTask.stepId, resolvedTaskId, { status: schemaStatus });
    }
    setDraggedTask(null);
  };

  const getThemeColor = (status: string) => {
    return 'neutral';
  };

  const getColumnColor = (column: string) => {
    return 'text-foreground border-border/10 shadow-sm';
  };

  const getCardHoverBorder = (status: string) => {
    return 'group-hover:border-border/30';
  };

  return (
    <div className="w-full h-full flex flex-col items-center bg-background overflow-hidden">
      <div className="w-full max-w-7xl h-full px-6 py-4 grid grid-cols-4 gap-6">
        {COLUMNS.map(column => (
          <div
            key={column}
            className="flex flex-col h-full gap-4 min-w-0"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column)}
          >
            {}
            <div className={`
              sticky top-0 z-20 backdrop-blur-xl bg-secondary/10 p-4 rounded-xl border flex items-center justify-between
              ${getColumnColor(column)}
            `}>
              <span className="font-bold tracking-wide">{column}</span>
              <Badge variant="secondary" className="bg-secondary text-foreground border-none">{columns[column].length}</Badge>
            </div>

            {}
            <div className="flex-1 overflow-y-auto pr-2 pb-20 custom-scrollbar space-y-3">
              <AnimatePresence mode="popLayout">
                {columns[column].map(task => (
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
                      draggable
                      onDragStart={(e) => handleDragStart(e, task, task.stepId)}
                      onClick={() => handleTaskOpen(task)}
                      className={`
                        relative w-full p-4 rounded-xl backdrop-blur-md transition-all duration-300
                        bg-secondary/10 border border-border/10 shadow-sm
                        ${getCardHoverBorder(task.status)}
                        hover:shadow-md hover:bg-secondary/20
                        cursor-grab active:cursor-grabbing
                      `}
                    >
                      {(() => {
                        const assignedUser = users.find((u: any) => u.uid === task.assignedTo);
                        const assignedLabel = task.assignedToName || assignedUser?.displayName || assignedUser?.email || 'Unknown';
                        const assignedInitials = assignedLabel.substring(0, 2).toUpperCase();

                        return (
                          <>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="text-sm font-medium leading-tight text-foreground z-10 relative">
                          {task.title}
                        </span>
                        <GripVertical className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                      </div>

                      {task.assignedTo && (
                        <div className="flex items-center gap-2 mb-3">
                          <Avatar className="w-5 h-5 ring-1 ring-border/20">
                            <AvatarFallback className="text-[10px] bg-secondary text-foreground">
                              {assignedInitials || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {assignedLabel}
                          </span>
                        </div>
                      )}

                      {}
                      <div className="flex items-center pt-3 border-t border-border/10 w-full">
                        {['Ready', 'Active', 'In Progress', 'Done'].map((step, index) => {
                          const STATUS_ORDER = ['Ready', 'Active', 'In Progress', 'Done'];
                          const currentStatusIndex = STATUS_ORDER.indexOf(task.status === 'Completed' ? 'Done' : (task.status === 'Pending' || task.status === 'Backlog' ? 'Ready' : task.status === 'In Review' ? 'In Progress' : task.status));
                          const isCompleted = index <= currentStatusIndex;
                          const isCurrent = index === currentStatusIndex;


                          const activeColorClass = 'bg-foreground';
                          const ringColorClass = 'ring-foreground';

                          return (
                            <div key={step} className="flex items-center flex-1 last:flex-none">
                              <div
                                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 z-10 shrink-0
                                     ${isCompleted ? activeColorClass : 'bg-border/50'}
                                     ${isCurrent ? `ring-2 ring-offset-1 ring-offset-transparent ${ringColorClass} scale-125` : ''}
                                   `}
                                title={step}
                              />
                              {index < 3 && (
                                <div className="h-[1px] w-full -mx-0.5 relative z-0 bg-border/20 overflow-hidden">
                                  {isCompleted && index < currentStatusIndex && (
                                    <motion.div
                                      initial={{ width: "0%" }}
                                      animate={{ width: "100%" }}
                                      className={`h-full w-full ${activeColorClass}`}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Start Task Button */}
                      {['Ready', 'Pending', 'Backlog'].includes(task.status) && !isOwner && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full h-7 text-xs border border-border/20 text-foreground hover:bg-secondary/50 hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              const resolvedTaskId = task._id || task.id;
                              if (!resolvedTaskId) {
                                return;
                              }
                              onUpdateTask(task.stepId, resolvedTaskId, { status: 'Active' });
                            }}
                          >
                            Start Task
                          </Button>
                        </motion.div>
                      )}
                          </>
                        );
                      })()}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;
