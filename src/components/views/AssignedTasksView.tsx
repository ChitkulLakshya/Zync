import { useEffect, useState, useCallback } from 'react';
import { fetchProjects } from '@/api/projects';
import { auth } from '@/lib/firebase';
import { API_BASE_URL } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle, GitBranch, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface AssignedTask {
  id: string;
  _id: string;
  title: string;
  description?: string;
  status: string;
  assignedTo: string;
  assignedToName?: string;
  projectId: string;
  projectName: string;
  stepId: string;
  githubBranchName?: string;
  githubRepoName?: string;
  githubRepoOwner?: string;
}

interface Props {
  currentUser: any;
  users: any[];
}

const statusColors: Record<string, string> = {
  Ready: 'bg-muted-foreground text-white',
  Active: 'bg-sky-500 text-white',
  'In Progress': 'bg-amber-500 text-white',
  Done: 'bg-emerald-500 text-white',
  'PR Raised': 'bg-purple-500 text-white',
};

const AssignedTasksView = ({ currentUser, users }: Props) => {
  const [tasksByProject, setTasksByProject] = useState<Record<string, AssignedTask[]>>({});
  const [loading, setLoading] = useState(true);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    task: AssignedTask | null;
    step: 1 | 2 | 'blocked';
    loading: boolean;
  }>({ open: false, task: null, step: 1, loading: false });

  const loadTasks = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    try {
      const projects = await fetchProjects();
      const grouped: Record<string, AssignedTask[]> = {};

      projects.forEach((p) => {
        p.steps.forEach((step: any) => {
          (step.tasks || []).forEach((t: any) => {
            const isAssigner = t.createdBy === currentUser.uid || t.assignedBy === currentUser.uid;
            const isAssignedToOther = t.assignedTo && t.assignedTo !== currentUser.uid;

            if (isAssigner && isAssignedToOther) {
              if (!grouped[p.name]) {
                grouped[p.name] = [];
              }
              grouped[p.name].push({
                id: t._id || t.id,
                _id: t._id || t.id,
                title: t.title || t.name,
                description: t.description,
                status: t.status || 'Ready',
                assignedTo: t.assignedTo,
                assignedToName: t.assignedToName,
                projectId: p.id || p._id,
                projectName: p.name,
                stepId: step._id || step.id,
                githubBranchName: t.githubBranchName,
                githubRepoName: p.githubRepoName || t.githubRepoName,
                githubRepoOwner: p.githubRepoOwner || t.githubRepoOwner,
              });
            }
          });
        });
      });

      setTasksByProject(grouped);
    } catch (error) {
      console.error('Failed to load assigned tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleDeleteClick = (task: AssignedTask) => {
    if (task.status === 'PR Raised') {
      setDeleteDialog({ open: true, task, step: 'blocked', loading: false });
    } else if (task.status === 'In Progress' || task.status === 'Done') {
      setDeleteDialog({ open: true, task, step: 1, loading: false });
    } else {
      setDeleteDialog({ open: true, task, step: 1, loading: false });
    }
  };

  const confirmDelete = async () => {
    const { task, step } = deleteDialog;
    if (!task) return;

    if (step === 1 && (task.status === 'In Progress' || task.status === 'Done')) {
      setDeleteDialog({ ...deleteDialog, step: 2 });
      return;
    }

    setDeleteDialog({ ...deleteDialog, loading: true });
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/projects/${task.projectId}/steps/${task.stepId}/tasks/${task._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        toast.success('Task deleted successfully');
        loadTasks();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Delete error', error);
      toast.error('Error deleting task');
    } finally {
      setDeleteDialog({ open: false, task: null, step: 1, loading: false });
    }
  };

  const getAssigneeInfo = (uid: string, fallbackName?: string) => {
    const user = users.find((u) => u.uid === uid);
    const name = user?.displayName || user?.email || fallbackName || uid;
    return { name, photoURL: user?.photoURL };
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Assigned to Others</h2>
        <p className="text-muted-foreground">Tasks you have assigned to other team members.</p>
      </div>

      <ScrollArea className="flex-1 -mx-6 px-6">
        {Object.keys(tasksByProject).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border border-dashed border-border/20 rounded-xl bg-background/30 backdrop-blur-sm">
            <Users className="w-8 h-8 mb-2 opacity-50" />
            <p>You haven't assigned any tasks to others yet.</p>
          </div>
        ) : (
          <div className="space-y-8 pb-8">
            {Object.entries(tasksByProject).map(([projectName, tasks]) => (
              <div key={projectName} className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2 border-b border-border/10 pb-2">
                  <div className="w-2 h-2 rounded-full bg-primary/50"></div>
                  {projectName}
                </h3>
                <div className="grid gap-3">
                  {tasks.map((task) => {
                    const assignee = getAssigneeInfo(task.assignedTo, task.assignedToName);
                    return (
                      <div
                        key={task._id}
                        className="flex items-center justify-between p-4 rounded-xl border border-border/10 bg-background/50 backdrop-blur-xl hover:bg-background/80 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {assignee.photoURL ? (
                            <img src={assignee.photoURL} alt="" className="w-10 h-10 rounded-full object-cover border border-border/20" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold border border-border/20">
                              {assignee.name[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{task.title}</div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>Assignee: {assignee.name}</span>
                              {task.githubRepoName && task.githubRepoOwner && (
                                <span className="flex items-center gap-1">
                                  <GitBranch className="w-3 h-3" />
                                  {task.githubRepoOwner}/{task.githubRepoName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge
                            variant="secondary"
                            className={`${statusColors[task.status] || 'bg-muted-foreground text-white'} border-none`}
                          >
                            {task.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDeleteClick(task)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !deleteDialog.loading && setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent className="bg-background/80 backdrop-blur-2xl border-border/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {deleteDialog.step === 'blocked' ? 'Cannot Delete Task' : 'Delete Task'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.step === 'blocked'
                ? "This task cannot be deleted because a Pull Request has already been raised. Please close the PR first or manage it via GitHub."
                : deleteDialog.step === 2
                ? "This task is currently In Progress or Done. Deleting it will remove the associated GitHub branch and all progress. Are you absolutely sure?"
                : "Are you sure you want to delete this task? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDialog.loading}>Cancel</AlertDialogCancel>
            {deleteDialog.step !== 'blocked' && (
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteDialog.loading}
                className="gap-2"
              >
                {deleteDialog.loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleteDialog.step === 2 ? 'Yes, Delete Everything' : 'Delete Task'}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AssignedTasksView;
