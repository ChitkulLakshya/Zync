import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
    SheetClose
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { CheckSquare, Calendar, FolderKanban, User, Clock, Flag, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export interface TaskDetail {
    id: string;
    _id: string;
    title: string;
    status: string;
    description?: string;
    projectName: string;
    projectId: string;
    stepName: string;
    stepId: string;
    assignedTo?: string;
    assignedToName?: string;
    createdAt?: string | Date;
}

interface TaskDetailDrawerProps {
    task: TaskDetail | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const TaskDetailDrawer = ({ task, open, onOpenChange }: TaskDetailDrawerProps) => {
    if (!task) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl w-full flex flex-col gap-0 p-0 bg-background/95 backdrop-blur-sm">
                {/* Header */}
                <SheetHeader className="flex flex-col p-6 border-b border-border/50 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Badge variant={task.status === 'Completed' ? 'default' : 'secondary'} className="capitalize px-3 py-1">
                                {task.status}
                            </Badge>
                            {/* Placeholder for Priority if added later */}
                            {/* <Badge variant="outline" className="text-orange-500 border-orange-200 bg-orange-50">High Priority</Badge> */}
                        </div>
                        {/* Close button is handled by SheetContent default close, but we can add custom actions here */}
                    </div>

                    <div className="space-y-1">
                        <SheetTitle className="text-2xl font-bold tracking-tight">{task.title}</SheetTitle>
                        <SheetDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FolderKanban className="w-4 h-4" />
                            <span className="font-medium">{task.projectName}</span>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{task.stepName}</span>
                        </SheetDescription>
                    </div>
                </SheetHeader>

                {/* Body */}
                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-8">
                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> Assigned To
                                </span>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                            {task.assignedToName?.substring(0, 2).toUpperCase() || "??"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">{task.assignedToName || "Unassigned"}</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> Due Date
                                </span>
                                <div className="text-sm font-medium text-foreground/80">
                                    {/* Placeholder as DueDate doesn't exist on schema yet */}
                                    <span className="text-muted-foreground italic">No due date</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" /> Created
                                </span>
                                <div className="text-sm font-medium text-foreground/80">
                                    {task.createdAt ? format(new Date(task.createdAt), 'MMM d, yyyy') : '-'}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Description */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <CheckSquare className="w-4 h-4" /> Description
                            </h3>
                            <div className="bg-secondary/20 rounded-lg p-2">
                                <Textarea
                                    disabled
                                    className="min-h-[150px] resize-none border-none bg-transparent focus-visible:ring-0 text-sm leading-relaxed"
                                    value={task.description || "No description provided."}
                                    placeholder="Add more details to this task..."
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Activity / Subtasks Placeholder */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Flag className="w-4 h-4" /> Activity
                            </h3>
                            <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                                <div className="flex gap-3 text-sm text-muted-foreground">
                                    <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0" />
                                    <div>
                                        <p><span className="font-medium text-foreground">System</span> assigned to <span className="font-medium text-foreground">{task.assignedToName}</span></p>
                                        <p className="text-xs mt-0.5 opacity-70">
                                            {task.createdAt ? format(new Date(task.createdAt), 'MMM d, yyyy h:mm a') : 'Recently'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                {/* Footer */}
                <div className="p-6 border-t border-border/50 bg-secondary/10 flex justify-end gap-3">
                    <SheetClose asChild>
                        <Button variant="outline">Close</Button>
                    </SheetClose>

                </div>

            </SheetContent>
        </Sheet>
    );
};

export default TaskDetailDrawer;
