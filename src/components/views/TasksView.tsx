import { useState, useEffect } from "react";
import { fetchProjects, Project } from "@/api/projects";
import { Card, CardContent } from "@/components/ui/card";
import { CheckSquare, Loader2, FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import TaskDetailDrawer from "./TaskDetailDrawer";

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
                                className="hover:bg-secondary/10 transition-colors cursor-pointer"
                                onClick={() => handleTaskClick(task)}
                            >
                                <CardContent className="p-4 flex items-start gap-4">
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
        </div>
    );
};

export default TasksView;
