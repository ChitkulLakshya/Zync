/**
 * @fileoverview TaskBoardView.tsx
 * @module TaskBoardView
 *
 * Aggregated, cross-project Kanban board. Unlike the per-repository board that
 * used to live inside ProjectDetails ("My Workspace" -> open a repo -> "Task Board"),
 * this view lets the user pivot the board across their *entire* accessible task
 * graph by User, by Repo (single project), or by Team (many repos at once).
 *
 * Data source: `fetchProjects()` (same REST endpoint used by TasksView) returns
 * every project the current user owns, collaborates on, or has tasks assigned in,
 * each with nested `steps[].tasks[]`. This view flattens that graph, re-groups it
 * by the selected pivot, and feeds the result into the existing `KanbanBoard`
 * component (drag & drop + framer-motion column transitions).
 *
 * Real-time: `useTaskUpdates` joins the `/tasks` socket room for every project
 * currently represented on the board, so drag-and-drop status changes made by
 * any collaborator anywhere are reflected live without a manual refresh.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchProjects, Project } from '@/api/projects';
import { User as UserIcon, Users as UsersIcon, Inbox, RefreshCw } from 'lucide-react';
import { Github as GithubIcon } from '@/components/ui/GithubIcon';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TeamLogoDisplay } from '@/components/ui/TeamLogoDisplay';
import { getUserInitials } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { API_BASE_URL, cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTaskUpdates } from '@/hooks/use-task-updates';
import KanbanBoard from '@/components/workspace/KanbanBoard';

interface TaskBoardViewProps {
  currentUser: any;
  users?: any[];
}

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

const PIVOTS: { mode: PivotMode; label: string; icon: typeof UserIcon }[] = [
  { mode: 'user', label: 'By User', icon: UserIcon },
  { mode: 'repo', label: 'By Repo', icon: GithubIcon as any },
  { mode: 'team', label: 'By Team', icon: UsersIcon },
];

const TaskBoardView = ({ currentUser, users = [] }: TaskBoardViewProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [pivotMode, setPivotMode] = useState<PivotMode>('user');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Maps every task._id -> { projectId, projectName } so drag/drop updates
  // can be routed to the correct REST endpoint even though the board mixes
  // tasks from many different projects/repos at once.
  const taskProjectMapRef = useRef<Map<string, { projectId: string; projectName: string }>>(
    new Map()
  );

  const loadData = useCallback(async () => {
    if (!currentUser?.uid) {
      return;
    }
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
      [...(Array.isArray(ownedTeams) ? ownedTeams : []), ...(Array.isArray(myTeams) ? myTeams : [])].forEach(
        (t: Team) => {
          const id = t._id || t.id;
          if (id) {
            teamMap.set(id, t);
          }
        }
      );
      setTeams(Array.from(teamMap.values()));
    } catch (error) {
      console.error('Failed to load task board data', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;

  // All project ids currently loaded -> join every one of those socket rooms
  // so live updates arrive regardless of which pivot/filter is selected.
  const allProjectIds = useMemo(
    () => projects.map((p) => p._id).filter((id): id is string => Boolean(id)),
    [projects]
  );

  useTaskUpdates({
    userId: currentUser?.uid,
    projectIds: allProjectIds,
    onTaskChange: useCallback(() => {
      loadDataRef.current();
    }, []),
  });

  // Derive selectable option lists.
  const userOptions = useMemo(() => {
    const map = new Map<string, { uid: string; displayName: string; photoURL?: string }>();
    if (currentUser?.uid) {
      map.set(currentUser.uid, {
        uid: currentUser.uid,
        displayName: `${currentUser.displayName || currentUser.email || 'Me'} (You)`,
        photoURL: currentUser.photoURL,
      });
    }
    projects.forEach((p) => {
      p.steps.forEach((step: any) => {
        (step.tasks || []).forEach((t: any) => {
          if (t.assignedTo && !map.has(t.assignedTo)) {
            const knownUser = users.find((u) => u.uid === t.assignedTo);
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
    () =>
      projects.map((p) => ({
        id: p._id,
        name: p.name,
        githubRepoName: p.githubRepoName,
        githubRepoOwner: p.githubRepoOwner,
      })),
    [projects]
  );

  // Default selections once data has loaded.
  useEffect(() => {
    if (!selectedUserId && currentUser?.uid) {
      setSelectedUserId(currentUser.uid);
    }
  }, [currentUser, selectedUserId]);

  useEffect(() => {
    if (!selectedProjectId && projectOptions.length > 0) {
      setSelectedProjectId(projectOptions[0].id);
    }
  }, [projectOptions, selectedProjectId]);

  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      setSelectedTeamId(teams[0]._id || teams[0].id || '');
    }
  }, [teams, selectedTeamId]);

  // Build the aggregated `steps` array fed to KanbanBoard, based on the
  // active pivot. Every task also gets tagged with its origin projectId so
  // `handleUpdateTask` below can resolve the correct REST endpoint.
  const boardSteps = useMemo(() => {
    taskProjectMapRef.current = new Map();
    const stepsById = new Map<string, { _id: string; id: string; title: string; tasks: any[] }>();

    const includeTask = (projectId: string, projectName: string, step: any, task: any) => {
      const stepId = step._id || step.id;
      if (!stepId) {
        return;
      }
      if (!stepsById.has(stepId)) {
        stepsById.set(stepId, {
          _id: stepId,
          id: stepId,
          title: `${projectName} · ${step.title || step.name || 'General'}`,
          tasks: [],
        });
      }
      stepsById.get(stepId)!.tasks.push(task);
      taskProjectMapRef.current.set(task._id || task.id, { projectId, projectName });
    };

    if (pivotMode === 'repo') {
      const project = projects.find((p) => p._id === selectedProjectId);
      if (project) {
        project.steps.forEach((step: any) => {
          (step.tasks || []).forEach((task: any) => includeTask(project._id, project.name, step, task));
        });
      }
    } else if (pivotMode === 'user') {
      if (selectedUserId) {
        projects.forEach((project) => {
          project.steps.forEach((step: any) => {
            (step.tasks || []).forEach((task: any) => {
              if (task.assignedTo === selectedUserId) {
                includeTask(project._id, project.name, step, task);
              }
            });
          });
        });
      }
    } else if (pivotMode === 'team') {
      const team = teams.find((t) => (t._id || t.id) === selectedTeamId);
      if (team) {
        const memberSet = new Set([...(team.members || []), team.ownerId].filter(Boolean));
        projects.forEach((project) => {
          project.steps.forEach((step: any) => {
            (step.tasks || []).forEach((task: any) => {
              if (task.assignedTo && memberSet.has(task.assignedTo)) {
                includeTask(project._id, project.name, step, task);
              }
            });
          });
        });
      }
    }

    return Array.from(stepsById.values());
  }, [pivotMode, selectedProjectId, selectedUserId, selectedTeamId, projects, teams]);

  const handleUpdateTask = async (stepId: string, taskId: string, updates: any) => {
    const origin = taskProjectMapRef.current.get(taskId);
    if (!origin) {
      return;
    }

    // Optimistic local update so the drag animation feels instant.
    setProjects((prev) =>
      prev.map((p) => {
        if (p._id !== origin.projectId) {
          return p;
        }
        return {
          ...p,
          steps: p.steps.map((step: any) => {
            const sid = step._id || step.id;
            if (sid !== stepId) {
              return step;
            }
            return {
              ...step,
              tasks: (step.tasks || []).map((t: any) =>
                (t._id || t.id) === taskId ? { ...t, ...updates } : t
              ),
            };
          }),
        };
      })
    );

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${origin.projectId}/steps/${stepId}/tasks/${taskId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...updates,
            assignedBy: auth.currentUser?.displayName || 'Admin',
          }),
        }
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.message || 'Failed to update task');
      }
    } catch (error) {
      console.error('Failed to update task', error);
      toast({
        title: 'Update Failed',
        description: 'Could not move the task. Reverting.',
        variant: 'destructive',
      });
      loadData();
    }
  };

  const handleDeleteTask = async (stepId: string, taskId: string) => {
    const origin = taskProjectMapRef.current.get(taskId);
    if (!origin) {
      return;
    }
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${origin.projectId}/steps/${stepId}/tasks/${taskId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      await loadData();
    } catch (error) {
      console.error('Failed to delete task', error);
      toast({ title: 'Delete Failed', description: 'Could not delete the task.', variant: 'destructive' });
    }
  };

  const totalTasksOnBoard = useMemo(
    () => boardSteps.reduce((sum, s) => sum + s.tasks.length, 0),
    [boardSteps]
  );

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground flex items-center justify-center h-full">
        Loading task board...
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-transparent">
      {/* Pivot Selector Bar */}
      <div className="shrink-0 px-6 pt-4 pb-3 flex flex-wrap items-center gap-3 border-b border-border/10">
        <div className="flex items-center gap-1 bg-card/50 border border-border/10 rounded-xl p-1 backdrop-blur-md">
          {PIVOTS.map(({ mode, label, icon: Icon }) => (
            <Button
              key={mode}
              size="sm"
              variant="ghost"
              onClick={() => setPivotMode(mode)}
              className={cn(
                'h-8 gap-1.5 text-xs rounded-lg',
                pivotMode === mode
                  ? 'bg-secondary text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Button>
          ))}
        </div>

        {pivotMode === 'user' && (
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-[220px] h-9 text-xs bg-card/50 border-border/10 backdrop-blur-md">
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              {userOptions.map((u) => (
                <SelectItem key={u.uid} value={u.uid}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={u.photoURL} />
                      <AvatarFallback className="text-[10px]">
                        {getUserInitials({ displayName: u.displayName })}
                      </AvatarFallback>
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
            <SelectTrigger className="w-[240px] h-9 text-xs bg-card/50 border-border/10 backdrop-blur-md">
              <SelectValue placeholder="Select a repo" />
            </SelectTrigger>
            <SelectContent>
              {projectOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.githubRepoName ? `${p.githubRepoOwner}/${p.githubRepoName}` : p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {pivotMode === 'team' && (
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-[220px] h-9 text-xs bg-card/50 border-border/10 backdrop-blur-md">
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
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

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>{totalTasksOnBoard} tasks</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => loadData()}
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        {boardSteps.length === 0 || totalTasksOnBoard === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 rounded-2xl bg-card/50 border border-border/10 backdrop-blur-xl flex items-center justify-center mb-6">
              <Inbox className="w-9 h-9 text-muted-foreground/60" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-semibold text-foreground">No tasks to show</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
              {pivotMode === 'user' && 'This user has no tasks assigned yet.'}
              {pivotMode === 'repo' && 'This repository has no tasks yet.'}
              {pivotMode === 'team' && 'No tasks are assigned to members of this team yet.'}
            </p>
          </div>
        ) : (
          <KanbanBoard
            steps={boardSteps}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            users={users}
            currentUser={currentUser}
            isOwner={false}
          />
        )}
      </div>
    </div>
  );
};

export default TaskBoardView;
