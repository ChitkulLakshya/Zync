/**
 * @fileoverview TaskDetailDialog.tsx
 * @module TaskDetailDialog
 *
 * Centered modal shown when a Kanban card is clicked. Displays the task's
 * title/description, its linked GitHub branch, live commit activity (fetched
 * from the backend `git-activity` endpoint), and — depending on status — a
 * "Completed" banner or the PR link + Merge button.
 */
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  GitBranch,
  GitPullRequest,
  GitMerge,
  GitCommit,
  ExternalLink,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface GitActivity {
  branch: string | null;
  commitCount: number;
  commits: { sha?: string; message: string; author?: string; date?: string | null; url?: string }[];
  prUrl: string | null;
  prNumber: number | null;
  merged: boolean;
}

export interface TaskDetailTask {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  status: string;
  githubBranchName?: string;
  githubPrUrl?: string;
  githubPrNumber?: number;
  projectId?: string;
  stepId?: string;
}

interface TaskDetailDialogProps {
  task: TaskDetailTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwner?: boolean;
  onMerged?: () => void;
}

const TaskDetailDialog = ({ task, open, onOpenChange, isOwner, onMerged }: TaskDetailDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<GitActivity | null>(null);
  const [merging, setMerging] = useState(false);

  const taskId = task?._id || task?.id;

  useEffect(() => {
    if (!open || !task || !taskId || !task.projectId || !task.stepId) {
      setActivity(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(
          `${API_BASE_URL}/api/projects/${task.projectId}/steps/${task.stepId}/tasks/${taskId}/git-activity`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok && !cancelled) {
          setActivity(await res.json());
        }
      } catch (error) {
        console.error('Failed to load git activity', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, task, taskId]);

  const handleMerge = async () => {
    if (!taskId) {
      return;
    }
    setMerging(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/projects/tasks/${taskId}/merge-pr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: 'Pull request merged' });
        setActivity((prev) => (prev ? { ...prev, merged: true } : prev));
        onMerged?.();
      } else {
        const body = await res.json().catch(() => ({}));
        toast({ title: 'Failed to merge PR', description: body?.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error merging PR', variant: 'destructive' });
    } finally {
      setMerging(false);
    }
  };

  if (!task) {
    return null;
  }

  const isDone = task.status === 'Done' || task.status === 'Completed';
  const isPrRaised = task.status === 'PR Raised' || task.status === 'In Review';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-background/80 backdrop-blur-2xl border-border/10">
        <DialogHeader className="space-y-2">
          <Badge variant="secondary" className="w-fit capitalize">
            {task.status}
          </Badge>
          <DialogTitle className="text-xl font-bold tracking-tight">{task.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-5 pr-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {task.description || 'No description provided.'}
            </p>

            {isDone && !isPrRaised && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-500 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </div>
            )}

            {task.githubBranchName && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5" /> Branch
                </span>
                <code className="block text-xs bg-secondary/30 border border-border/10 rounded-md px-3 py-2 font-mono truncate">
                  {task.githubBranchName}
                </code>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5" /> Commits
                {activity && <span className="normal-case font-normal">({activity.commitCount})</span>}
              </span>

              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading commit history...
                </div>
              )}

              {!loading && activity && activity.commits.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No commits yet.</p>
              )}

              {!loading && activity && activity.commits.length > 0 && (
                <div className="space-y-1.5">
                  {activity.commits.map((c, i) => (
                    <div
                      key={c.sha || i}
                      className="flex items-start gap-2 text-xs bg-secondary/20 border border-border/10 rounded-md px-3 py-2"
                    >
                      {c.sha && (
                        <code className="text-muted-foreground shrink-0 font-mono">{c.sha}</code>
                      )}
                      <span className="flex-1 truncate text-foreground/90">
                        {c.message.split('\n')[0]}
                      </span>
                      {c.date && (
                        <span className="text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(c.date), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isPrRaised && (task.githubPrUrl || activity?.prUrl) && (
              <div className="space-y-2 pt-2 border-t border-border/10">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <GitPullRequest className="w-3.5 h-3.5" /> Pull Request
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => window.open(task.githubPrUrl || activity?.prUrl || '', '_blank')}
                  >
                    Open in GitHub
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  {isOwner && (
                    <Button
                      size="sm"
                      className="flex-1 gap-2"
                      disabled={merging || activity?.merged}
                      onClick={handleMerge}
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      {activity?.merged ? 'Merged' : merging ? 'Merging...' : 'Merge'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
