import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchProjects, Project } from '@/api/projects';
import { Inbox, RefreshCw, ChevronDown, User as UserIcon, Users as UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TeamLogoDisplay } from '@/components/ui/TeamLogoDisplay';
import { getUserInitials, API_BASE_URL, cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTaskUpdates } from '@/hooks/use-task-updates';
import { format, isToday, isYesterday } from 'date-fns';
import TaskDetailDialog, { TaskDetailTask } from '@/components/workspace/TaskDetailDialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Github as GithubIconComp } from '@/components/ui/GithubIcon';

interface Team {
  _id: string;
  id?: string;
  name: string;
  ownerId?: string;
  members?: string[];
  admins?: string[];
  logoId?: string;
}

type PivotMode = 'user' | 'repo' | 'team';
type ViewMode = 'list' | 'board' | 'assigned';

const COLUMNS = ['Ready', 'Active', 'In Progress', 'Done', 'PR Raised'];

const COLUMN_MAPPING: Record<string, string> = {
  'Ready': 'Ready', 'Active': 'Active', 'In Progress': 'In Progress',
  'Done': 'Done', 'PR Raised': 'PR Raised',
  'Pending': 'Ready', 'Backlog': 'Ready', 'Completed': 'Done', 'In Review': 'PR Raised',
};

interface MobileTasksProps {
  currentUser: any;
  users?: any[];
}

const MobileTasks = ({ currentUser, users = [] }: MobileTasksProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [pivotMode, setPivotMode] = useState<PivotMode>('user');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [activeTask, setActiveTask] = useState<TaskDetailTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pivotSheetOpen, setPivotSheetOpen] = useState(false);
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>(
    Object.fromEntries(COLUMNS.map(c => [c, true]))
  );

  const taskProjectMapRef = useRef<Map<string, { projectId: string; projectName: string }>>(new Map());

  const loadData = useCallback(async () => {
    if (!currentUser?.uid) {return;}
    try {
      const token = await currentUser.getIdToken();
      const [fetchedProjects, ownedTeamsRes, myTeamsRes] = await Promise.all([
        fetchProjects(),
        fetch(`${API_BASE_URL}/api/teams/owned`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/teams/mine`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setProjects(fetchedProjects);
      const ownedTeams = ownedTeamsRes.ok ? await ownedTeamsRes.json() : [];
      const myTeams = myTeamsRes.ok ? await myTeamsRes.json() : [];
      const teamMap = new Map<string, Team>();
      [...(Array.isArray(ownedTeams) ? ownedTeams : []), ...(Array.isArray(myTeams) ? myTeams : [])].forEach((t: Team) => {
        const id = t._id || t.id;
        if (id) {teamMap.set(id, t);}
      });
      setTeams(Array.from(teamMap.values()));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { loadData(); }, [loadData]);
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;

  const projectIds = useMemo(
    () => projects.map(p => p.id || p._id).filter((id): id is string => Boolean(id)),
    [projects]
  );

  useTaskUpdates({
    userId: currentUser?.uid,
    projectIds,
    onTaskChange: useCallback(() => { loadDataRef.current(); }, []),
  });

  const userOptions = useMemo(() => {
    const map = new Map<string, { uid: string; displayName: string; photoURL?: string }>();
    if (currentUser?.uid) {
      map.set(currentUser.uid, {
        uid: currentUser.uid,
        displayName: `${currentUser.displayName || currentUser.email || 'Me'} (You)`,
        photoURL: currentUser.photoURL,
      });
    }
    projects.forEach(p => {
      p.steps.forEach((step: any) => {
        (step.tasks || []).forEach((t: any) => {
          if (t.assignedTo && !map.has(t.assignedTo)) {
            const knownUser = users.find(u => u.uid === t.assignedTo);
            map.set(t.assignedTo, {
              uid: t.assignedTo,
              displayName: t.assignedToName || knownUser?.displayName || knownUser?.email || 'Unknown',
              photoURL: knownUser?.photoURL,
            });
          }
        });
      });
    });
    return Array.from(map.values());
  }, [projects, users, currentUser]);

  const projectOptions = useMemo(
    () => projects.map(p => ({
      id: p.id || p._id,
      name: p.name,
      githubRepoName: p.githubRepoName,
      githubRepoOwner: p.githubRepoOwner,
    })),
    [projects]
  );

  useEffect(() => {
    if (!selectedUserId && currentUser?.uid) {setSelectedUserId(currentUser.uid);}
  }, [currentUser, selectedUserId]);
  useEffect(() => {
    if (!selectedProjectId && projectOptions.length > 0) {setSelectedProjectId(projectOptions[0].id);}
  }, [projectOptions, selectedProjectId]);
  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {setSelectedTeamId(teams[0]._id || teams[0].id || '');}
  }, [teams, selectedTeamId]);

  const allTasks = useMemo(() => {
    taskProjectMapRef.current = new Map();
    const tasks: any[] = [];

    const includeTask = (projectId: string, projectName: string, step: any, task: any) => {
      const stepId = step._id || step.id;
      if (!stepId) {return;}
      const proj = projects.find(p => (p.id || p._id) === projectId);
      tasks.push({
        ...task,
        stepId,
        stepTitle: step.title || step.name || 'General',
        projectName,
        projectId,
        githubRepoName: proj?.githubRepoName || task.githubRepoName,
        githubRepoOwner: proj?.githubRepoOwner || task.githubRepoOwner,
      });
      taskProjectMapRef.current.set(task._id || task.id, { projectId, projectName });
    };

    if (pivotMode === 'repo') {
      const project = projects.find(p => (p.id || p._id) === selectedProjectId);
      if (project) {
        project.steps.forEach((step: any) => {
          (step.tasks || []).forEach((task: any) => includeTask(project.id || project._id, project.name, step, task));
        });
      }
    } else if (pivotMode === 'user') {
      if (selectedUserId) {
        projects.forEach(project => {
          project.steps.forEach((step: any) => {
            (step.tasks || []).forEach((task: any) => {
              if (task.assignedTo === selectedUserId) {includeTask(project.id || project._id, project.name, step, task);}
            });
          });
        });
      }
    } else if (pivotMode === 'team') {
      const team = teams.find(t => (t._id || t.id) === selectedTeamId);
      if (team) {
        const memberSet = new Set([...(team.members || []), team.ownerId].filter(Boolean));
        projects.forEach(project => {
          project.steps.forEach((step: any) => {
            (step.tasks || []).forEach((task: any) => {
              if (task.assignedTo && memberSet.has(task.assignedTo)) {includeTask(project.id || project._id, project.name, step, task);}
            });
          });
        });
      }
    }
    return tasks;
  }, [pivotMode, selectedProjectId, selectedUserId, selectedTeamId, projects, teams]);

  const tasksByColumn = useMemo(() => {
    const map: Record<string, any[]> = {};
    COLUMNS.forEach(c => { map[c] = []; });
    allTasks.forEach(t => {
      const col = COLUMN_MAPPING[t.status] || 'Ready';
      if (map[col]) {map[col].push(t);}
    });
    return map;
  }, [allTasks]);

  const assignedTasksByProject = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    projects.forEach(p => {
      p.steps.forEach((step: any) => {
        (step.tasks || []).forEach((t: any) => {
          const isAssigner = t.createdBy === currentUser?.uid || t.assignedBy === currentUser?.uid;
          const isAssignedToOther = t.assignedTo && t.assignedTo !== currentUser?.uid;
          if (isAssigner && isAssignedToOther) {
            if (!grouped[p.name]) grouped[p.name] = [];
            grouped[p.name].push({
              ...t,
              projectName: p.name,
              stepTitle: step.title || step.name || 'General'
            });
          }
        });
      });
    });
    return grouped;
  }, [projects, currentUser]);

  const handleOpenTask = (task: any) => {
    setActiveTask(task as TaskDetailTask);
    setDetailOpen(true);
  };

  const relativeDayLabel = (value?: string) => {
    if (!value) {return null;}
    const date = new Date(value);
    if (isToday(date)) {return 'Today';}
    if (isYesterday(date)) {return 'Yesterday';}
    return format(date, 'MMM d');
  };

  const pivotLabel = pivotMode === 'user'
    ? userOptions.find(u => u.uid === selectedUserId)?.displayName || 'Select user'
    : pivotMode === 'repo'
    ? projectOptions.find(p => p.id === selectedProjectId)?.name || 'Select repo'
    : teams.find(t => (t._id || t.id) === selectedTeamId)?.name || 'Select team';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading tasks…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with view toggle + pivot selector */}
      <div className="pl-4 pr-14 py-3 shrink-0 space-y-2 border-b border-border/10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={cn('px-3 py-1 text-xs rounded-md transition-colors', viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}
            >List</button>
            <button
              onClick={() => setViewMode('board')}
              className={cn('px-3 py-1 text-xs rounded-md transition-colors', viewMode === 'board' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}
            >Board</button>
            <button
              onClick={() => setViewMode('assigned')}
              className={cn('px-3 py-1 text-xs rounded-md transition-colors', viewMode === 'assigned' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}
            >Assigned</button>
          </div>
        </div>

        {/* Pivot selector */}
        <button
          onClick={() => setPivotSheetOpen(true)}
          className="flex items-center justify-between w-full p-2.5 bg-secondary/30 rounded-lg text-sm"
        >
          <span className="flex items-center gap-2 truncate">
            {pivotMode === 'user' && <UserIcon className="w-4 h-4 text-muted-foreground" />}
            {pivotMode === 'repo' && <GithubIconComp className="w-4 h-4 text-muted-foreground" />}
            {pivotMode === 'team' && <UsersIcon className="w-4 h-4 text-muted-foreground" />}
            <span className="truncate">{pivotLabel}</span>
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {allTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold">No tasks</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {pivotMode === 'user' && 'No tasks assigned to this user.'}
              {pivotMode === 'repo' && 'This repo has no tasks yet.'}
              {pivotMode === 'team' && 'No tasks for this team.'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="h-full overflow-y-auto px-4 py-3 space-y-2">
            {allTasks.map(task => {
              const col = COLUMN_MAPPING[task.status] || 'Ready';
              const assignee = users.find(u => u.uid === task.assignedTo);
              const photoURL = assignee?.photoURL;
              const assignedLabel = assignee?.displayName || task.assignedToName || 'Unassigned';
              const assignedInitials = getUserInitials({ displayName: assignedLabel });
              const dayLabel = relativeDayLabel(task.updatedAt || task.createdAt);
              return (
                <div
                  key={task._id || task.id}
                  onClick={() => handleOpenTask(task)}
                  className="p-3 rounded-xl border border-border/10 bg-card/50 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-sm font-medium leading-snug line-clamp-2 flex-1">{task.title}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{col}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-2">{task.projectName} · {task.stepTitle}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="w-5 h-5">
                        {photoURL && <AvatarImage src={photoURL} alt={assignedLabel} />}
                        <AvatarFallback className="text-[9px]">{assignedInitials || 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">{assignedLabel}</span>
                    </div>
                    {dayLabel && <span className="text-[11px] text-muted-foreground">{dayLabel}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'board' ? (
          /* Board View - vertical stacked rows */
          <div className="h-full overflow-y-auto px-4 py-3 space-y-3">
            {COLUMNS.map(column => (
              <div key={column} className="rounded-xl border border-border/10 bg-secondary/5 overflow-hidden">
                <button
                  onClick={() => setExpandedColumns(prev => ({ ...prev, [column]: !prev[column] }))}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-secondary/30"
                >
                  <span className="font-semibold text-xs tracking-wide">{column}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px] h-5">{tasksByColumn[column].length}</Badge>
                    <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', expandedColumns[column] && 'rotate-180')} />
                  </div>
                </button>
                {expandedColumns[column] && (
                  <div className="p-2 space-y-2">
                    {tasksByColumn[column].map(task => {
                      const assignee = users.find(u => u.uid === task.assignedTo);
                      const photoURL = assignee?.photoURL;
                      const assignedLabel = assignee?.displayName || task.assignedToName || 'U';
                      const assignedInitials = getUserInitials({ displayName: assignedLabel });
                      const dayLabel = relativeDayLabel(task.updatedAt || task.createdAt);
                      return (
                        <div
                          key={task._id || task.id}
                          onClick={() => handleOpenTask(task)}
                          className="p-2.5 rounded-lg border border-border/10 bg-card/50 active:scale-[0.98] transition-transform cursor-pointer"
                        >
                          <span className="block text-sm font-medium leading-snug line-clamp-2 mb-1.5">{task.title}</span>
                          <p className="text-[10px] text-muted-foreground truncate mb-2">{task.projectName}</p>
                          {task.assignedTo && (
                            <div className="flex items-center justify-between gap-2">
                              <Avatar className="w-5 h-5">
                                {photoURL && <AvatarImage src={photoURL} alt={assignedLabel} />}
                                <AvatarFallback className="text-[9px]">{assignedInitials || 'U'}</AvatarFallback>
                              </Avatar>
                              {dayLabel && <span className="text-[10px] text-muted-foreground">{dayLabel}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {tasksByColumn[column].length === 0 && (
                      <div className="text-center text-xs text-muted-foreground py-3">Empty</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : viewMode === 'assigned' ? (
          /* Assigned View - 3 per row grid */
          <div className="h-full overflow-y-auto px-4 py-3 space-y-5">
            {Object.keys(assignedTasksByProject).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border border-dashed border-border/20 rounded-xl bg-background/30">
                <UsersIcon className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">You haven't assigned any tasks yet.</p>
              </div>
            ) : (
              Object.entries(assignedTasksByProject).map(([projectName, tasks]) => (
                <div key={projectName} className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2 px-1 text-foreground/90">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60"></div>
                    {projectName}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {tasks.map(task => {
                      const assignee = users.find(u => u.uid === task.assignedTo);
                      const photoURL = assignee?.photoURL;
                      const assignedLabel = assignee?.displayName || task.assignedToName || 'U';
                      const assignedInitials = getUserInitials({ displayName: assignedLabel });
                      const dayLabel = relativeDayLabel(task.updatedAt || task.createdAt);
                      
                      return (
                        <div
                          key={task._id || task.id}
                          onClick={() => handleOpenTask(task)}
                          className="p-2.5 flex flex-col justify-between rounded-xl border border-border/10 bg-card/50 active:scale-[0.98] transition-transform cursor-pointer overflow-hidden"
                        >
                          <div>
                            <span className="block text-[11px] font-medium leading-snug line-clamp-2 mb-2 text-foreground/90">{task.title}</span>
                            <Badge variant="secondary" className={cn("text-[9px] px-1.5 py-0 h-4 mb-2 shadow-sm font-semibold border-none", 
                              task.status === 'Done' ? 'bg-emerald-500/15 text-emerald-500' :
                              task.status === 'In Progress' ? 'bg-amber-500/15 text-amber-500' :
                              task.status === 'PR Raised' ? 'bg-purple-500/15 text-purple-500' : 
                              task.status === 'Active' ? 'bg-sky-500/15 text-sky-500' :
                              'bg-slate-500/15 text-slate-500'
                            )}>{task.status || 'Ready'}</Badge>
                          </div>
                          <div className="flex flex-col gap-1.5 mt-2 border-t border-border/10 pt-2">
                            <div className="flex items-center gap-1.5">
                              <Avatar className="w-4 h-4 shrink-0 shadow-sm border border-border/20">
                                {photoURL && <AvatarImage src={photoURL} alt={assignedLabel} />}
                                <AvatarFallback className="text-[7px] bg-secondary/80 text-foreground">{assignedInitials}</AvatarFallback>
                              </Avatar>
                              <span className="text-[9px] text-muted-foreground truncate font-medium">{assignedLabel}</span>
                            </div>
                            {dayLabel && <span className="text-[9px] text-muted-foreground/80 font-medium">{dayLabel}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>

      {/* Pivot Selection Sheet */}
      <Sheet open={pivotSheetOpen} onOpenChange={setPivotSheetOpen}>
        <SheetContent side="bottom" className="p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Filter Tasks</SheetTitle>
            <SheetDescription>Choose how to filter tasks.</SheetDescription>
          </SheetHeader>
          <div className="px-4 py-3 border-b border-border/10">
            <h2 className="font-semibold text-lg">Filter By</h2>
          </div>
          <div className="p-4 space-y-4">
            {/* Pivot mode */}
            <div className="flex gap-2">
              {[
                { mode: 'user' as PivotMode, label: 'User', icon: UserIcon },
                { mode: 'repo' as PivotMode, label: 'Repo', icon: GithubIconComp },
                { mode: 'team' as PivotMode, label: 'Team', icon: UsersIcon },
              ].map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setPivotMode(mode)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition-colors',
                    pivotMode === mode ? 'border-foreground/20 bg-secondary/50 text-foreground' : 'border-border/10 text-muted-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Selectors */}
            {pivotMode === 'user' && (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full h-10"><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {userOptions.map(u => (
                    <SelectItem key={u.uid} value={u.uid}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={u.photoURL || undefined} />
                          <AvatarFallback className="text-[10px]">{getUserInitials({ displayName: u.displayName })}</AvatarFallback>
                        </Avatar>
                        <span>{u.displayName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {pivotMode === 'repo' && (
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full h-10"><SelectValue placeholder="Select repo" /></SelectTrigger>
                <SelectContent>
                  {projectOptions.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.githubRepoName ? `${p.githubRepoOwner}/${p.githubRepoName}` : p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {pivotMode === 'team' && (
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="w-full h-10"><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  {teams.map(t => (
                    <SelectItem key={t._id || t.id} value={t._id || t.id || ''}>
                      <div className="flex items-center gap-2">
                        <TeamLogoDisplay logoId={t.logoId} teamName={t.name} className="rounded h-5 w-5" />
                        <span>{t.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button className="w-full" onClick={() => setPivotSheetOpen(false)}>Done</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={activeTask}
        open={detailOpen}
        onOpenChange={(open) => { if (!open) { setActiveTask(null); setDetailOpen(false); } }}
        isOwner={false}
        onMerged={() => { setActiveTask(null); setDetailOpen(false); loadData(); }}
      />
    </div>
  );
};

export default MobileTasks;
