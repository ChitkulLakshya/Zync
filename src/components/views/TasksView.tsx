import { useState, useEffect } from "react";
import { fetchProjects, Project } from "@/api/projects";
import { Card, CardContent } from "@/components/ui/card";
import { CheckSquare, Loader2, FolderKanban, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import TaskDetailDrawer from "./TaskDetailDrawer";
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

interface TasksViewProps {
    currentUser: any;
    users?: any[];
}

export interface FlattenedTask {
    id: string; // This should be the functional ID for the view (can be _id)
    _id: string; // The real Mongoose ID
    title: string;
    description?: string;
    status: string;
    projectName: string;
    projectId: string;
    projectOwnerId?: string;
    stepName: string;
    stepId: string;
    assignedTo?: string;
    assignedToName?: string;
    createdAt?: string;
}

const TasksView = ({ currentUser, users = [] }: TasksViewProps) => {
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<FlattenedTask[]>([]);
    const [selectedTask, setSelectedTask] = useState<FlattenedTask | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const { toast } = useToast();

    // Create Task State
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDesc, setNewTaskDesc] = useState("");
    const [newTaskProjectId, setNewTaskProjectId] = useState("");
    const [newTaskAssignedTo, setNewTaskAssignedTo] = useState<string>("");
    const [isCreating, setIsCreating] = useState(false);

    // Refresh function
    const loadTasks = async () => {
        if (!currentUser?.uid) return;
        try {
            const projects = await fetchProjects(currentUser.uid);

            const allTasks: FlattenedTask[] = projects.flatMap((p: Project) =>
                p.steps.flatMap((step: any) =>
                    (step.tasks || []).map((t: any, idx: number) => ({
                        id: t._id || t.id || `${p._id}-${step.id || step.name}-${idx}`,
                        _id: t._id, // Ensure we have the DB ID
                        title: t.title || t.name || t,
                        description: t.description,
                        status: t.status || "pending",
                        projectName: p.name,
                        projectId: p._id,
                        projectOwnerId: p.ownerId,
                        stepName: step.title || step.name,
                        stepId: step._id || step.id,
                        assignedTo: t.assignedTo,
                        assignedToName: t.assignedToName,
                        createdAt: t.createdAt
                    }))
                )
            );

            // Filter for only tasks assigned to current user
            const myTasks = allTasks.filter(t => t.assignedTo === currentUser.uid);

            setTasks(myTasks);
            setProjects(projects);
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

    const handleTaskClick = (task: FlattenedTask) => {
        setSelectedTask(task);
        setIsDrawerOpen(true);
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
                const data = await response.json();
                toast({ title: "Success", description: "Task created successfully." });
                setIsCreateDialogOpen(false);
                setNewTaskTitle("");
                setNewTaskDesc("");
                setNewTaskProjectId("");
                setNewTaskAssignedTo("");
                loadTasks(); // Reload tasks to see the new one
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

    const updateTaskStatus = async (task: FlattenedTask, newStatus: string) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/projects/${task.projectId}/steps/${task.stepId}/tasks/${task._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                toast({ title: "Success", description: "Task status updated." });
                loadTasks(); // Refresh list
            } else {
                throw new Error("Failed to update status");
            }
        } catch (error) {
            console.error("Update failed", error);
            toast({ title: "Error", description: "Failed to update task status.", variant: "destructive" });
        }
    };

    const deleteTask = async (task: FlattenedTask) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/projects/${task.projectId}/steps/${task.stepId}/tasks/${task._id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast({ title: "Success", description: "Task deleted." });
                loadTasks(); // Refresh list
            } else {
                throw new Error("Failed to delete task");
            }
        } catch (error) {
            console.error("Delete failed", error);
            toast({ title: "Error", description: "Failed to delete task.", variant: "destructive" });
        }
    };

    if (loading) {
        return (
            <div className="flex w-full h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 h-full flex flex-col">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">My Tasks</h2>
                    <p className="text-muted-foreground mt-1">
                        Tasks assigned to you across all projects.
                    </p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> New Task
                </Button>
            </div>

            {tasks.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <CheckSquare className="w-12 h-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-xl font-medium">No tasks assigned</h3>
                        <p className="text-muted-foreground">You have no tasks assigned to you.</p>
                    </CardContent>
                </Card>
            ) : (
                <ScrollArea className="flex-1 pr-4">
                    <div className="grid gap-4">
                        {tasks.map((task) => (
                            <Card
                                key={task.id}
                                className="hover:bg-secondary/10 transition-colors cursor-pointer group relative"
                                onClick={() => handleTaskClick(task)}
                            >
                                <CardContent className="p-4 flex items-start gap-4">

                                    {/* Delete Button (Visible mainly on hover) - Owner Only */}
                                    {currentUser && task.projectOwnerId === currentUser.uid && (
                                        <button
                                            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete Task"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm("Delete this task?")) {
                                                    deleteTask(task);
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}

                                    <div className="mt-1">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${task.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-muted-foreground'}`}>
                                            {task.status === 'completed' && <CheckSquare className="w-3 h-3 text-white" />}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`text-base font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</h4>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                            <Badge variant="outline" className="text-xs font-normal gap-1">
                                                <FolderKanban className="w-3 h-3" />
                                                {task.projectName}
                                            </Badge>
                                            <span>•</span>
                                            <span>{task.stepName}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {['Backlog', 'Ready', 'Pending', 'pending'].includes(task.status) && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs border-green-200 hover:bg-green-50 hover:text-green-700"
                                                onClick={() => {
                                                    updateTaskStatus(task, 'Active');
                                                }}
                                            >
                                                Start Task
                                            </Button>
                                        )}
                                        <Badge variant={task.status === 'Completed' ? 'default' : 'secondary'} className="capitalize">
                                            {task.status}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            )}

            <TaskDetailDrawer
                task={selectedTask}
                open={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
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
