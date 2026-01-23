import React, { useState, useEffect } from 'react';
import { Project, TaskSearchResult, searchTasks } from '../../../api/projects';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

// TaskSearch Component for Linking
const TaskSearch = ({ user, onSelect }: { user: any, onSelect: (task: TaskSearchResult) => void }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<TaskSearchResult[]>([]);

    useEffect(() => {
        if (query.length > 2) {
            const timer = setTimeout(async () => {
                const res = await searchTasks(query, user.uid);
                setResults(res);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [query, user.uid]);

    return (
        <Command className="border rounded-md">
            <CommandInput placeholder="Search tasks by title..." onValueChange={setQuery} />
            <CommandList>
                <CommandEmpty>No tasks found.</CommandEmpty>
                <CommandGroup heading="Tasks">
                    {results.map(task => (
                        <CommandItem key={task.id} onSelect={() => onSelect(task)}>
                            <div className="flex flex-col">
                                <span>{task.title}</span>
                                <span className="text-xs text-muted-foreground">{task.projectName} • {task.status}</span>
                            </div>
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </Command>
    )
}

interface TaskDialogsProps {
    user: any;
    projects: Project[];
    taskDialogOpen: boolean;
    setTaskDialogOpen: (open: boolean) => void;
    taskLinkDialogOpen: boolean;
    setTaskLinkDialogOpen: (open: boolean) => void;
    selectedTaskText: string;
    onCreateTask: (projectId: string) => void;
    onLinkTask: (task: TaskSearchResult) => void;
}

export const TaskDialogs: React.FC<TaskDialogsProps> = ({
    user, projects, taskDialogOpen, setTaskDialogOpen,
    taskLinkDialogOpen, setTaskLinkDialogOpen, selectedTaskText,
    onCreateTask, onLinkTask
}) => {
    return (
        <>
            {/* Create Task Dialog */}
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Convert to Task</DialogTitle>
                        <DialogDescription>
                            Create a new task in ZYNC Project Management from this line.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="p-3 bg-muted/30 rounded-md text-sm italic mb-4 border border-border/50">
                            "{selectedTaskText}"
                        </div>
                        <label className="text-sm font-medium mb-2 block">Select Project</label>
                        <Command className="border rounded-md">
                            <CommandInput placeholder="Search projects..." />
                            <CommandList>
                                <CommandEmpty>No projects found.</CommandEmpty>
                                <CommandGroup>
                                    {projects.map(p => (
                                        <CommandItem key={p._id} onSelect={() => onCreateTask(p._id)}>
                                            {p.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Link Task Dialog */}
            <Dialog open={taskLinkDialogOpen} onOpenChange={setTaskLinkDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Link Exisiting Task</DialogTitle>
                    </DialogHeader>
                    <TaskSearch user={user} onSelect={onLinkTask} />
                </DialogContent>
            </Dialog>
        </>
    );
};
