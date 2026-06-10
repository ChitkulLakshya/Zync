import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchProjects, Project } from "@/api/projects";
import { CheckSquare, Terminal, Layout, Github, ExternalLink, Inbox, ArrowUpCircle, MinusCircle, ArrowDownCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, getFullUrl } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GitCommandsDrawer } from "./GitCommandsDrawer";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useTaskUpdates } from "@/hooks/use-task-updates";

interface TasksViewProps {
    currentUser: any;
    users?: any[];
}

export interface FlattenedTask {
    id: string;
    _id: string;
    title: string;
    description?: string;
    status: string;
    priority?: 'High' | 'Medium' | 'Low';
    projectName: string;
    projectId: string;
    projectOwnerId?: string;
    stepName: string;
    stepId: string;
    assignedTo?: string;
    assignedToName?: string;
    createdAt?: string;
    githubRepoName?: string;
    githubRepoOwner?: string;
}

interface ProjectGroup {
    projectId: string;
    projectName: string;
    isOwner: boolean;
    githubRepoName?: string;
    githubRepoOwner?: string;
    tasks: FlattenedTask[];
}

const TasksView = ({ currentUser, users = [] }: TasksViewProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [groupedTasks, setGroupedTasks] = useState<ProjectGroup[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    const [isGitDrawerOpen, setIsGitDrawerOpen] = useState(false);
    const [selectedGitTask, setSelectedGitTask] = useState<FlattenedTask | null>(null);

    const { toast } = useToast();

    const loadTasks = async () => {
        if (!currentUser?.uid) {return;}
        try {
            const fetchedProjects = await fetchProjects();
            const groups: Record<string, ProjectGroup> = {};

            fetchedProjects.forEach(p => {
                p.steps.forEach((step: any) => {
                    (step.tasks || []).forEach((t: any, idx: number) => {
                        if (t.assignedTo !== currentUser.uid) {return;}

                        if (!groups[p._id]) {
                            const projectId = p._id;
                            if (!projectId) {return;}

                            groups[projectId] = {
                                projectId,
                                projectName: p.name,
                                isOwner: p.ownerId === currentUser.uid,
                                githubRepoName: p.githubRepoName,
                                githubRepoOwner: p.githubRepoOwner,
                                tasks: []
                            };
                        }

                        const projectId = p._id;
                        const taskId = t._id || t.id;
                        const stepId = step._id || step.id;
                        if (!projectId || !taskId || !stepId) {return;}

                        groups[projectId].tasks.push({
                            id: taskId,
                            _id: taskId,
                            title: t.title || t.name || t,
                            description: t.description,
                            status: t.status || "Pending",
                            priority: t.priority || 'Medium',
                            projectName: p.name,
                            projectId,
                            projectOwnerId: p.ownerId,
                            stepName: step.title || step.name,
                            stepId,
                            assignedTo: t.assignedTo,
                            assignedToName: t.assignedToName,
                            createdAt: t.createdAt,
                            githubRepoName: p.githubRepoName,
                            githubRepoOwner: p.githubRepoOwner
                        });
                    });
                });
            });

            const sortedGroups = Object.values(groups).sort((a, b) => a.projectName.localeCompare(b.projectName));
            setGroupedTasks(sortedGroups);
            setProjects(fetchedProjects);
        } catch (error) {
            console.error("Failed to fetch tasks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            loadTasks();
        } else {
            setLoading(false);
        }
    }, [currentUser]);

    // Real-time task updates via socket
    const loadTasksRef = useRef(loadTasks);
    loadTasksRef.current = loadTasks;

    const projectIds = useMemo(
        () => projects.map(p => p._id).filter((id): id is string => Boolean(id)),
        [projects]
    );

    useTaskUpdates({
        userId: currentUser?.uid,
        projectIds,
        onTaskChange: useCallback(() => {
            loadTasksRef.current();
        }, []),
    });


    const markTaskActive = async (task: FlattenedTask) => {
        if (!['Pending', 'Ready', 'Backlog'].includes(task.status)) {return;}

        try {
            const projectId = task.projectId;
            const stepId = task.stepId;
            const taskId = task._id || task.id;
            if (!projectId || !stepId || !taskId) {
                throw new Error('Task identifiers are missing');
            }

            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/steps/${stepId}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'Active' })
            });

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody?.message || 'Failed to mark task active');
            }

            await loadTasks();
        } catch (error) {
            console.error("Failed to mark task active", error);
            toast({ title: "Update Failed", description: "Could not move task to Active.", variant: "destructive" });
        }
    };

    const handleOpenGitHelper = async (task: FlattenedTask) => {
        await markTaskActive(task);
        setSelectedGitTask(task);
        setIsGitDrawerOpen(true);
    };

    const handleOpenArchitecture = async (task: FlattenedTask) => {
        await markTaskActive(task);
        navigate(`/dashboard/workspace/project/${task.projectId}`, { state: { from: '/dashboard/tasks' } });
    };

    const handleOpenRepository = async (task: FlattenedTask) => {
        await markTaskActive(task);
        window.open(`https://github.com/${task.githubRepoOwner}/${task.githubRepoName}`, '_blank');
    };

    const getStatusColor = (status: string) => {
        if (['Completed', 'Done'].includes(status)) {return 'bg-emerald-500';}
        if (['In Progress'].includes(status)) {return 'bg-amber-500';}
        if (['Active'].includes(status)) {return 'bg-sky-500';}
        return 'bg-zinc-500';
    };

    const getStatusLabel = (status: string) => {
        if (['Completed', 'Done'].includes(status)) {return 'Done';}
        if (['In Progress'].includes(status)) {return 'In Progress';}
        if (['Active'].includes(status)) {return 'Active';}
        return 'Pending';
    };

    const getPriorityIcon = (priority?: string) => {
        switch (priority) {
            case 'High':
                return <ArrowUpCircle className="w-3.5 h-3.5 text-rose-400" />;
            case 'Low':
                return <ArrowDownCircle className="w-3.5 h-3.5 text-sky-400" />;
            default:
                return <MinusCircle className="w-3.5 h-3.5 text-zinc-500" />;
        }
    };

    const getPriorityLabel = (priority?: string) => {
        return priority || 'Medium';
    };


    const taskStats = useMemo(() => {
        const allTasks = groupedTasks.flatMap(g => g.tasks);
        return {
            total: allTasks.length,
            pending: allTasks.filter(t => t.status === 'Pending').length,
            active: allTasks.filter(t => t.status === 'Active').length,
            inProgress: allTasks.filter(t => t.status === 'In Progress').length,
            done: allTasks.filter(t => ['Done', 'Completed'].includes(t.status)).length,
            projectCount: groupedTasks.length
        };
    }, [groupedTasks]);

    if (loading) {
        return <div className="p-6 text-sm text-muted-foreground flex items-center justify-center h-full">Loading tasks...</div>;
    }
    return (
        <div className="flex-1 p-6 md:p-8 h-full flex flex-col overflow-hidden bg-transparent">
            <div className="mb-8 flex items-start justify-between shrink-0">
                <div>
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">My Tasks</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Your assigned work across all projects
                    </p>
                </div>
            </div>

            {groupedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
                    <div className="w-20 h-20 rounded-2xl bg-card/50 border border-border/10 backdrop-blur-xl flex items-center justify-center mb-6 backdrop-blur-md">
                        <Inbox className="w-9 h-9 text-white/60" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">All caught up!</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
                        You have no tasks assigned at the moment. When a project owner assigns you work, it will appear here.
                    </p>
                </div>
            ) : (
                <ScrollArea className="flex-1">
                    <div className="space-y-10 pb-20 max-w-4xl">
                        {groupedTasks.map((group) => (
                            <section key={group.projectId}>
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="text-base font-medium text-foreground">{group.projectName}</h3>
                                    <span className="text-[11px] font-medium text-muted-foreground bg-card/50 px-2 py-0.5 rounded-full tabular-nums border border-border/10 backdrop-blur-md">
                                        {group.tasks.length}
                                    </span>
                                    <div className="flex-1 h-px bg-border/40" />
                                </div>

                                <div className="space-y-3">
                                    {group.tasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="bg-card/50 border border-border/10 rounded-2xl p-4 transition-all duration-200 hover:border-border/30 hover:bg-card/80 backdrop-blur-xl"
                                        >
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${getStatusColor(task.status)}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={`text-[15px] font-medium leading-snug ${['Completed', 'Done'].includes(task.status) ? 'line-through text-muted-foreground' : ''}`}>
                                                            {task.title}
                                                        </h4>
                                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground" title={`${getPriorityLabel(task.priority)} priority`}>
                                                            {getPriorityIcon(task.priority)}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                                        <span className="px-1.5 py-0.5 rounded bg-card/50 border border-border/10 text-muted-foreground backdrop-blur-sm">{task.stepName}</span>
                                                        <span className="text-white/30">·</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-xs ${['Completed', 'Done'].includes(task.status) ? 'bg-emerald-500/20 text-emerald-400' :
                                                                ['In Progress'].includes(task.status) ? 'bg-amber-500/20 text-amber-400' :
                                                                    ['Active'].includes(task.status) ? 'bg-sky-500/20 text-sky-400' :
                                                                        'bg-white/10 text-white/65'
                                                            }`}>
                                                            {getStatusLabel(task.status)}
                                                        </span>
                                                        {task.createdAt && (
                                                            <>
                                                                <span className="text-white/30">·</span>
                                                                <span className="tabular-nums">{format(new Date(task.createdAt), 'MMM d')}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-2 text-xs border-border/10 bg-card/50 hover:bg-card/80 backdrop-blur-md"
                                                    onClick={() => handleOpenGitHelper(task)}
                                                >
                                                    <Terminal className="w-3.5 h-3.5" />
                                                    Git Commands
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-2 text-xs border-border/10 bg-card/50 hover:bg-card/80 backdrop-blur-md"
                                                    onClick={() => handleOpenArchitecture(task)}
                                                >
                                                    <Layout className="w-3.5 h-3.5" />
                                                    Architecture
                                                </Button>

                                                {task.githubRepoName && task.githubRepoOwner && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 gap-2 text-xs border-border/10 bg-card/50 hover:bg-card/80 backdrop-blur-md"
                                                        onClick={() => handleOpenRepository(task)}
                                                    >
                                                        <Github className="w-3.5 h-3.5" />
                                                        Repository
                                                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}

                        <div className="pt-8 border-t border-white/10">
                            <div className="flex items-center gap-6 text-xs text-muted-foreground">
                                <span>{taskStats.total} total</span>
                                <span className="text-white/30">·</span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    {taskStats.inProgress} in progress
                                </span>
                                <span className="text-white/30">·</span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {taskStats.done} done
                                </span>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            )}

            <GitCommandsDrawer
                open={isGitDrawerOpen}
                onOpenChange={setIsGitDrawerOpen}
                task={selectedGitTask}
                project={selectedGitTask ? {
                    githubRepoOwner: selectedGitTask.githubRepoOwner,
                    githubRepoName: selectedGitTask.githubRepoName
                } : null}
            />
        </div>
    );
};

export default TasksView;
