import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink, Plus, Loader2, Circle, CheckCircle2, GitCommit } from 'lucide-react';
import { Github as GithubIcon } from '@/components/ui/GithubIcon';
import { API_BASE_URL, getFullUrl } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { useTaskUpdates } from '@/hooks/use-task-updates';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TaskDetailDialog, { TaskDetailTask } from '@/components/workspace/TaskDetailDialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Task {
  _id: string;
  id: string;
  title: string;
  description: string;
  status: string;
  assignedTo?: string;
  assignedToName?: string;
  githubBranchName?: string;
  githubPrUrl?: string;
  githubPrNumber?: number;
  merged?: boolean;
  updatedAt?: string;
  createdAt?: string;
}

interface Step {
  _id: string;
  id: string;
  title: string;
  description: string;
  status: string;
  type: string;
  tasks: Task[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  ownerUid?: string;
  ownerId: string;
  steps: Step[];
  githubRepoName?: string;
  githubRepoOwner?: string;
  architecture?: any;
}

const MobileProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = (location.state as { from?: string } | null)?.from || '/dashboard/workspace';

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [activeTask, setActiveTask] = useState<TaskDetailTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'steps' | 'readme'>('overview');

  // Create task state
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [selectedStepId, setSelectedStepId] = useState('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: any) => setCurrentUser(user));
    return () => unsubscribe();
  }, []);

  const fetchProject = async () => {
    if (!id || !currentUser) {return;}
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProject(data);
        if (data.githubRepoName && data.githubRepoOwner) {
          try {
            const readmeRes = await fetch(`${API_BASE_URL}/api/github/readme?owner=${data.githubRepoOwner}&repo=${data.githubRepoName}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (readmeRes.ok) {setReadmeContent(await readmeRes.text());}
          } catch { /* ignore */ }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!currentUser) {return;}
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {setUsers(await response.json());}
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (id && currentUser) { fetchProject(); fetchUsers(); }
  }, [id, currentUser]);

  const fetchProjectRef = useRef(fetchProject);
  fetchProjectRef.current = fetchProject;

  useTaskUpdates({
    userId: currentUser?.uid,
    projectIds: id ? [id] : [],
    onTaskChange: useCallback(() => { fetchProjectRef.current(); }, []),
  });

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {next.delete(stepId);}
      else {next.add(stepId);}
      return next;
    });
  };

  const handleOpenTask = (task: Task) => {
    setActiveTask(task as TaskDetailTask);
    setDetailOpen(true);
  };

  const handleCreateTask = async () => {
    if (!project || !newTaskTitle.trim() || !selectedStepId) {
      toast.error('Please fill in required fields');
      return;
    }
    setIsCreatingTask(true);
    try {
      const assignedUser = users.find(u => u.uid === selectedAssigneeId);
      const token = await currentUser?.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${project.id}/steps/${selectedStepId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          assignedTo: selectedAssigneeId,
          assignedToName: assignedUser?.displayName || assignedUser?.email,
          assignedBy: auth.currentUser?.displayName || 'Admin',
        }),
      });
      if (!response.ok) {throw new Error('Failed');}
      const updated = await response.json();
      setProject(updated);
      toast.success('Task created');
      setCreateSheetOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setSelectedAssigneeId(null);
    } catch {
      toast.error('Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const isOwner = project?.ownerUid === currentUser?.uid || project?.ownerId === currentUser?.uid;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading project…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <p className="text-sm text-muted-foreground mb-4">Project not found.</p>
        <Button size="sm" onClick={() => navigate(backPath)}>Go Back</Button>
      </div>
    );
  }

  const totalTasks = project.steps.reduce((sum, s) => sum + (s.tasks?.length || 0), 0);
  const completedTasks = project.steps.reduce((sum, s) =>
    sum + (s.tasks?.filter(t => t.status === 'Completed' || t.status === 'Done').length || 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 shrink-0 border-b border-border/10">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(backPath)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-semibold text-lg truncate flex-1">{project.name}</h2>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-border/10 shrink-0">
        {[
          { id: 'overview' as const, label: 'Overview' },
          { id: 'steps' as const, label: `Tasks (${totalTasks})` },
          { id: 'readme' as const, label: 'README' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="p-4 space-y-4">
            {/* Description */}
            <Card className="border border-border/10">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="border border-border/10">
                <CardContent className="pt-3 pb-3 text-center">
                  <p className="text-lg font-semibold">{project.steps.length}</p>
                  <p className="text-[11px] text-muted-foreground">Steps</p>
                </CardContent>
              </Card>
              <Card className="border border-border/10">
                <CardContent className="pt-3 pb-3 text-center">
                  <p className="text-lg font-semibold">{totalTasks}</p>
                  <p className="text-[11px] text-muted-foreground">Tasks</p>
                </CardContent>
              </Card>
              <Card className="border border-border/10">
                <CardContent className="pt-3 pb-3 text-center">
                  <p className="text-lg font-semibold">{completedTasks}</p>
                  <p className="text-[11px] text-muted-foreground">Done</p>
                </CardContent>
              </Card>
            </div>

            {/* GitHub repo */}
            {project.githubRepoName && (
              <Card className="border border-border/10">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <GithubIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Repository</span>
                  </div>
                  <a
                    href={`https://github.com/${project.githubRepoOwner}/${project.githubRepoName}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <span className="truncate">{project.githubRepoOwner}/{project.githubRepoName}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Architecture summary */}
            {project.architecture?.highLevel && (
              <Card className="border border-border/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Architecture</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                    {project.architecture.highLevel}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="p-4 space-y-2">
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-dashed mb-2"
                onClick={() => {
                  if (project.steps[0]) {setSelectedStepId(project.steps[0]._id || project.steps[0].id);}
                  setCreateSheetOpen(true);
                }}
              >
                <Plus className="w-4 h-4" /> New Task
              </Button>
            )}

            {project.steps.map(step => {
              const stepId = step._id || step.id;
              const isExpanded = expandedSteps.has(stepId);
              const completedCount = step.tasks?.filter(t => t.status === 'Completed' || t.status === 'Done').length || 0;
              return (
                <div key={stepId} className="border border-border/10 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleStep(stepId)}
                    className="flex items-center justify-between w-full p-3 active:bg-secondary/30"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{step.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {step.tasks?.length || 0} tasks · {completedCount} done
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-1.5">
                      {step.tasks?.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 text-center">No tasks in this step</p>
                      ) : (
                        step.tasks.map(task => {
                          const isDone = task.status === 'Completed' || task.status === 'Done';
                          const assignee = users.find(u => u.uid === task.assignedTo);
                          return (
                            <div
                              key={task._id || task.id}
                              onClick={() => handleOpenTask(task)}
                              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/20 active:scale-[0.98] transition-transform cursor-pointer"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm truncate ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                                  {task.title}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{task.status}</Badge>
                                  {task.githubPrUrl && <GitCommit className="w-3 h-3 text-muted-foreground" />}
                                </div>
                              </div>
                              {assignee && (
                                <Avatar className="w-5 h-5 shrink-0">
                                  {assignee.photoURL && <AvatarImage src={getFullUrl(assignee.photoURL)} />}
                                  <AvatarFallback className="text-[9px]">
                                    {(assignee.displayName || 'U').substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'readme' && (
          <div className="p-4">
            {readmeContent ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{readmeContent}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <GithubIcon className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No README found in this repository.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Task Sheet */}
      <Sheet open={createSheetOpen} onOpenChange={setCreateSheetOpen}>
        <SheetContent side="bottom" className="p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Create Task</SheetTitle>
            <SheetDescription>Create a new task for this project.</SheetDescription>
          </SheetHeader>
          <div className="px-4 py-3 border-b border-border/10">
            <h2 className="font-semibold text-lg">New Task</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Step</Label>
              <Select value={selectedStepId} onValueChange={setSelectedStepId}>
                <SelectTrigger className="w-full h-10"><SelectValue placeholder="Select step" /></SelectTrigger>
                <SelectContent>
                  {project.steps.map(s => (
                    <SelectItem key={s._id || s.id} value={s._id || s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Title</Label>
              <Input
                placeholder="Task title"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Description (optional)</Label>
              <Input
                placeholder="Brief description…"
                value={newTaskDesc}
                onChange={e => setNewTaskDesc(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Assignee (optional)</Label>
              <Select value={selectedAssigneeId || ''} onValueChange={v => setSelectedAssigneeId(v || null)}>
                <SelectTrigger className="w-full h-10"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.uid} value={u.uid}>{u.displayName || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={isCreatingTask || !newTaskTitle.trim()} onClick={handleCreateTask}>
              {isCreatingTask ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Task
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Task Detail */}
      <TaskDetailDialog
        task={activeTask}
        open={detailOpen}
        onOpenChange={open => { if (!open) { setActiveTask(null); setDetailOpen(false); } }}
        isOwner={!!isOwner}
        onMerged={() => { setActiveTask(null); setDetailOpen(false); fetchProject(); }}
      />
    </div>
  );
};

export default MobileProjectDetails;
