/**
 * @fileoverview TaskAssignmentDrawer.tsx
 * @module TaskAssignmentDrawer
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Loader2, UserPlus } from 'lucide-react';
import { Github } from '@/components/ui/GithubIcon';;
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFullUrl } from "@/lib/utils";

interface AssignableUser {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string | null;
  githubUsername?: string;
  canInvite?: boolean;
  inviteDisabledReason?: string | null;
}

interface TaskProject {
  id: string;
  name: string;
}

interface TaskAssignmentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: TaskProject | null;
  taskName: string;
  onTaskNameChange: (value: string) => void;
  taskDescription: string;
  onTaskDescriptionChange: (value: string) => void;
  activeCollaborators: AssignableUser[];
  availableTeamMembers: AssignableUser[];
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  onInviteCollaborator: (userId: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  isLoadingUsers?: boolean;
  isInvitingCollaborator?: boolean;
  githubAppNotInstalled?: boolean;
}

const TaskAssignmentDrawer = ({
  open,
  onOpenChange,
  project,
  taskName,
  onTaskNameChange,
  taskDescription,
  onTaskDescriptionChange,
  activeCollaborators,
  availableTeamMembers,
  selectedUserId,
  onSelectUser,
  onInviteCollaborator,
  onSubmit,
  isSubmitting = false,
  isLoadingUsers = false,
  isInvitingCollaborator = false,
  githubAppNotInstalled = false,
}: TaskAssignmentDrawerProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center gap-2 text-foreground mb-1">
            <CheckSquare className="w-5 h-5" />
            <SheetTitle>Assign Task</SheetTitle>
          </div>
          <SheetDescription>
            Create a task for <span className="font-medium text-foreground">{project?.name || "project"}</span> and assign it to one or more team members.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="task-name">Task Name <span className="text-destructive">*</span></Label>
            <Input
              id="task-name"
              placeholder="e.g., Build authentication API"
              value={taskName}
              onChange={(e) => onTaskNameChange(e.target.value)}
              maxLength={180}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Task Description</Label>
            <Textarea
              id="task-description"
              placeholder="Optional details for assignees..."
              value={taskDescription}
              onChange={(e) => onTaskDescriptionChange(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Assignees (Repository Collaborators)</Label>
            <div className="rounded-md border max-h-[280px] overflow-y-auto">
              {isLoadingUsers ? (
                <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading users...
                </div>
              ) : githubAppNotInstalled ? (
                <div className="p-4 text-sm text-destructive">
                  Unable to fetch collaborators. Please install the Zync GitHub App or link your GitHub account.
                </div>
              ) : activeCollaborators.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No team members are collaborators on this repository yet.
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {activeCollaborators.map((user) => {
                    const isChecked = selectedUserId === user.uid;
                    return (
                      <label
                        key={user.uid}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => onSelectUser(user.uid)}
                        />
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={getFullUrl(user.photoURL || undefined)} />
                          <AvatarFallback className="text-[10px]">
                            {(user.displayName || user.email || user.uid || 'U').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.displayName || user.email || user.uid}
                            {" "}
                            <span className="text-xs text-muted-foreground font-normal">
                              (GitHub: {user.githubUsername ? `@${user.githubUsername}` : 'Not connected'})
                            </span>
                          </p>
                          {user.email && (
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/10 bg-secondary/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Add Collaborator to Repo</p>
                <p className="text-xs text-muted-foreground">Invite team members who are connected to GitHub but not collaborators yet.</p>
              </div>
              <UserPlus className="w-4 h-4 text-foreground" />
            </div>

            <div className="rounded-md border border-border/10 max-h-[180px] overflow-y-auto bg-background/50">
              {isLoadingUsers ? (
                <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading available members...
                </div>
              ) : availableTeamMembers.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">
                  All GitHub-connected team members are already collaborators.
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {availableTeamMembers.map((member) => (
                    <div key={member.uid} className="flex items-center justify-between gap-3 rounded-md p-2 hover:bg-secondary/60">
                      <div className="min-w-0 flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={getFullUrl(member.photoURL || undefined)} />
                          <AvatarFallback className="text-[10px]">
                            {(member.displayName || member.email || member.uid || 'U').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{member.displayName || member.email || member.uid}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Github className="w-3 h-3" /> {member.githubUsername ? `@${member.githubUsername}` : 'Not connected'}
                        </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border/10 hover:border-foreground"
                        disabled={isInvitingCollaborator || !member.canInvite}
                        onClick={() => onInviteCollaborator(member.uid)}
                        title={member.inviteDisabledReason || undefined}
                      >
                        {isInvitingCollaborator ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send Invite"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting || !taskName.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Task"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskAssignmentDrawer;
