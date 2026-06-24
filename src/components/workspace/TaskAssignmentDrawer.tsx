import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckSquare, Loader2, UserPlus, Github } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFullUrl } from '@/lib/utils';

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
            Create a task for{' '}
            <span className="font-medium text-foreground">{project?.name || 'project'}</span> and
            assign it to one or more team members.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="task-name">
              Task Name <span className="text-destructive">*</span>
            </Label>
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
                            {(user.displayName || user.email || user.uid || 'U')
                              .substring(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.displayName || user.email || user.uid}{' '}
                            <span className="text-xs text-muted-foreground font-normal">
                              (GitHub:{' '}
                              {user.githubUsername ? `@${user.githubUsername}` : 'Not connected'})
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
                <p className="text-xs text-muted-foreground">
                  Invite team members who are connected to GitHub but not collaborators yet.
                </p>
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
                    <div
                      key={member.uid}
                      className="flex items-center justify-between gap-3 rounded-md p-2 hover:bg-secondary/60"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={getFullUrl(member.photoURL || undefined)} />
                          <AvatarFallback className="text-[10px]">
                            {(member.displayName || member.email || member.uid || 'U')
                              .substring(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.displayName || member.email || member.uid}
                          </p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Github className="w-3 h-3" />{' '}
                            {member.githubUsername ? `@${member.githubUsername}` : 'Not connected'}
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
                        {isInvitingCollaborator ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Send Invite'
                        )}
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
              'Create Task'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskAssignmentDrawer;
