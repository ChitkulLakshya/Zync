import { useState, useEffect, useMemo } from "react";
import { fetchProjects, Project } from "@/api/projects";
import { CheckSquare, Loader2, Terminal, Layout, Github, ExternalLink, Inbox, ArrowUpCircle, MinusCircle, ArrowDownCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_BASE_URL, getFullUrl } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GitCommandsDrawer } from "./GitCommandsDrawer";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

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

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDesc, setNewTaskDesc] = useState("");
    const [newTaskProjectId, setNewTaskProjectId] = useState("");
    const [newTaskAssignedTo, setNewTaskAssignedTo] = useState<string>("");
    const [isCreating, setIsCreating] = useState(false);

    const { toast } = useToast();

    const loadTasks = async () => {
        if (!currentUser?.uid) return;
        try {
            const fetchedProjects = await fetchProjects(currentUser.uid);
            const groups: Record<string, ProjectGroup> = {};

            fetchedProjects.forEach(p => {
                p.steps.forEach((step: any) => {
                    (step.tasks || []).forEach((t: any, idx: number) => {
                        if (t.assignedTo !== currentUser.uid) return;

                        if (!groups[p._id]) {
                            groups[p._id] = {
                                projectId: p._id,
                                projectName: p.name,
                                isOwner: p.ownerId === currentUser.uid,
                                githubRepoName: p.githubRepoName,
                                githubRepoOwner: p.githubRepoOwner,
                                tasks: []
                            };
                        }

                        groups[p._id].tasks.push({
                            id: t._id || t.id || `${p._id}-${step.id || step.name}-${idx}`,
                            _id: t._id,
                            title: t.title || t.name || t,
                            description: t.description,
                            status: t.status || "Pending",
                            priority: t.priority || 'Medium',
                            projectName: p.name,
                            projectId: p._id,
                            projectOwnerId: p.ownerId,
                            stepName: step.title || step.name,
                            stepId: step._id || step.id,
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

    // Helper to mark task as Active when user interacts with it
    const markTaskActive = async (task: FlattenedTask) => {
        // Only update if currently Pending
        if (task.status !== 'Pending') return;

        try {
            const token = await auth.currentUser?.getIdToken();
            await fetch(`${API_BASE_URL}/api/projects/${task.projectId}/steps/${task.stepId}/tasks/${task._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'Active' })
            });
            // Silently update local state
            loadTasks();
        } catch (error) {
            console.error("Failed to mark task active", error);
        }
    };

    const handleOpenGitHelper = (task: FlattenedTask) => {
        markTaskActive(task);
        setSelectedGitTask(task);
        setIsGitDrawerOpen(true);
    };

    const handleOpenArchitecture = (task: FlattenedTask) => {
        markTaskActive(task);
        navigate(`/projects/${task.projectId}`);
    };

    const handleOpenRepository = (task: FlattenedTask) => {
        markTaskActive(task);
        window.open(`https://github.com/${task.githubRepoOwner}/${task.githubRepoName}`, '_blank');
    };

    const handleCreateTask = async () => {
        if (!newTaskTitle || !newTaskProjectId) {
            toast({ title: "Validation Error", description: "Title and Project are required.", variant: "destructive" });
            return;
        }

        setIsCreating(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/projects/${newTaskProjectId}/quick-task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newTaskTitle,
                    description: newTaskDesc,
                    assignedTo: newTaskAssignedTo || undefined,
                    assignedToName: newTaskAssignedTo ? users.find(u => u.uid === newTaskAssignedTo)?.displayName : undefined
                })
            });

            if (response.ok) {
                toast({ title: "Success", description: "Task created successfully." });
                setIsCreateDialogOpen(false);
                setNewTaskTitle("");
                setNewTaskDesc("");
                setNewTaskProjectId("");
                setNewTaskAssignedTo("");
                loadTasks();
            } else {
                throw new Error("Failed to create task");
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to create task.", variant: "destructive" });
        } finally {
            setIsCreating(false);
        }
    };

    const getStatusColor = (status: string) => {
        if (['Completed', 'Done'].includes(status)) return 'bg-emerald-500';
        if (['In Progress'].includes(status)) return 'bg-amber-500';
        if (['Active'].includes(status)) return 'bg-sky-500';
        return 'bg-zinc-500'; // Pending
    };

    const getStatusLabel = (status: string) => {
        if (['Completed', 'Done'].includes(status)) return 'Done';
        if (['In Progress'].includes(status)) return 'In Progress';
        if (['Active'].includes(status)) return 'Active';
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

    // Calculate task statistics
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
        return (
            <div className="flex w-full h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 md:p-8 h-full flex flex-col overflow-hidden bg-background">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between shrink-0">
                <div>
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">My Tasks</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Your assigned work across all projects
                    </p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="gap-2 shrink-0">
                    <Plus className="w-4 h-4" /> New Task
                </Button>
            </div>

            {groupedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center mb-6 shadow-lg">
                        <Inbox className="w-9 h-9 text-zinc-500" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">All caught up!</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
                        You have no tasks assigned at the moment. When a project owner assigns you work, it will appear here.
                    </p>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-6 gap-2"
                        onClick={() => setIsCreateDialogOpen(true)}
                    >
                        <Plus className="w-4 h-4" />
                        Create your first task
                    </Button>
                </div>
            ) : (
                <ScrollArea className="flex-1">
                    <div className="space-y-10 pb-20 max-w-4xl">
                        {groupedTasks.map((group) => (
                            <section key={group.projectId}>
                                {/* Project Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="text-base font-medium text-foreground">{group.projectName}</h3>
                                    <span className="text-[11px] font-medium text-muted-foreground bg-zinc-800 px-2 py-0.5 rounded-full tabular-nums">
                                        {group.tasks.length}
                                    </span>
                                    <div className="flex-1 h-px bg-border/40" />
                                </div>

                                {/* Task List */}
                                <div className="space-y-3">
                                    {group.tasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 transition-all duration-200 hover:border-zinc-700 hover:shadow-md hover:shadow-zinc-900/50"
                                        >
                                            {/* Top Row: Status + Title + Priority */}
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
                                                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{task.stepName}</span>
                                                        <span className="text-zinc-600">·</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-xs ${['Completed', 'Done'].includes(task.status) ? 'bg-emerald-500/20 text-emerald-400' :
                                                                ['In Progress'].includes(task.status) ? 'bg-amber-500/20 text-amber-400' :
                                                                    ['Active'].includes(task.status) ? 'bg-sky-500/20 text-sky-400' :
                                                                        'bg-zinc-700/50 text-zinc-400'
                                                            }`}>
                                                            {getStatusLabel(task.status)}
                                                        </span>
                                                        {task.createdAt && (
                                                            <>
                                                                <span className="text-zinc-600">·</span>
                                                                <span className="tabular-nums">{format(new Date(task.createdAt), 'MMM d')}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Bar - Always Visible, No Manual Status Change */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {/* Git Helper */}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-2 text-xs border-zinc-700 hover:bg-zinc-800"
                                                    onClick={() => handleOpenGitHelper(task)}
                                                >
                                                    <Terminal className="w-3.5 h-3.5" />
                                                    Git Commands
                                                </Button>

                                                {/* Architecture */}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-2 text-xs border-zinc-700 hover:bg-zinc-800"
                                                    onClick={() => handleOpenArchitecture(task)}
                                                >
                                                    <Layout className="w-3.5 h-3.5" />
                                                    Architecture
                                                </Button>

                                                {/* GitHub Repo */}
                                                {task.githubRepoName && task.githubRepoOwner && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 gap-2 text-xs border-zinc-700 hover:bg-zinc-800"
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

                        {/* Simple Stats Footer */}
                        <div className="pt-8 border-t border-zinc-800/40">
                            <div className="flex items-center gap-6 text-xs text-muted-foreground">
                                <span>{taskStats.total} total</span>
                                <span className="text-zinc-700">·</span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    {taskStats.inProgress} in progress
                                </span>
                                <span className="text-zinc-700">·</span>
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

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                        <DialogDescription>
                            Add a new task to one of your projects.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Project</Label>
                            <Select value={newTaskProjectId} onValueChange={setNewTaskProjectId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map(p => (
                                        <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Task Title</Label>
                            <Input
                                placeholder="e.g. Update documentation"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Add more details..."
                                value={newTaskDesc}
                                onChange={(e) => setNewTaskDesc(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Assign To (Optional)</Label>
                            <Select value={newTaskAssignedTo} onValueChange={setNewTaskAssignedTo}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {users.map(user => (
                                        <SelectItem key={user.uid} value={user.uid}>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-4 w-4">
                                                    <AvatarImage src={getFullUrl(user.photoURL)} />
                                                    <AvatarFallback>{user.displayName?.substring(0, 1)}</AvatarFallback>
                                                </Avatar>
                                                <span>{user.displayName || user.email}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateTask} disabled={isCreating}>
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Create Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TasksView;
