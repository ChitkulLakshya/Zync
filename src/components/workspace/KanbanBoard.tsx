import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoreHorizontal, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface Task {
  _id: string;
  id: string;
  title: string;
  description: string;
  status: string;
  assignedTo?: string;
  assignedToName?: string;
}

interface Step {
  _id: string;
  id: string;
  title: string;
  tasks: Task[];
}

interface KanbanBoardProps {
  steps: Step[];
  onUpdateTask: (stepId: string, taskId: string, updates: any) => void;
  users: any[];
}

// Map task statuses to Kanban columns
const COLUMN_MAPPING: Record<string, string> = {
  'Pending': 'Backlog',
  'Backlog': 'Backlog',
  'Ready': 'Ready',
  'In Progress': 'In Progress',
  'In Review': 'In Review',
  'Completed': 'Done',
  'Done': 'Done'
};

const COLUMNS = ['Backlog', 'Ready', 'In Progress', 'In Review', 'Done'];

const KanbanBoard = ({ steps, onUpdateTask, users }: KanbanBoardProps) => {
  const [draggedTask, setDraggedTask] = useState<{ task: Task, stepId: string } | null>(null);

  // Flatten tasks logic for the board, while preserving step reference
  const allTasks = useMemo(() => {
    return steps.flatMap(step =>
      step.tasks.map(task => ({
        ...task,
        status: COLUMN_MAPPING[task.status] || 'Backlog',
        stepId: step._id
      }))
    );
  }, [steps]);

  // Group by column
  const columns = useMemo(() => {
    const cols: Record<string, typeof allTasks> = {};
    COLUMNS.forEach(c => cols[c] = []);
    allTasks.forEach(task => {
      if (cols[task.status]) cols[task.status].push(task);
    });
    return cols;
  }, [allTasks]);

  const handleDragStart = (e: React.DragEvent, task: Task, stepId: string) => {
    setDraggedTask({ task, stepId });
    e.dataTransfer.setData("text/plain", JSON.stringify({ taskId: task._id, stepId }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (!draggedTask) return;

    if (draggedTask.task.status !== targetStatus) {
      // Map back to schema valid status
      let schemaStatus = targetStatus;
      if (targetStatus === 'Done') schemaStatus = 'Completed';

      onUpdateTask(draggedTask.stepId, draggedTask.task._id, { status: schemaStatus });
    }
    setDraggedTask(null);
  };

  // Helper for border colors
  const getBorderColor = (status: string) => {
    if (status === 'In Progress') return 'border-l-green-500 bg-green-50/5';
    if (status === 'Done') return 'border-l-blue-500 bg-blue-50/5';
    return 'border-l-muted-foreground/30';
  };

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4">
      {COLUMNS.map(column => (
        <div
          key={column}
          className="flex-shrink-0 w-72 bg-secondary/20 rounded-lg flex flex-col border border-border/50"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column)}
        >
          <div className="p-3 font-semibold text-sm flex justify-between items-center border-b border-border/50 bg-secondary/10 rounded-t-lg">
            {column}
            <Badge variant="secondary" className="ml-2">{columns[column].length}</Badge>
          </div>

          <ScrollArea className="flex-1 p-2">
            <div className="space-y-2">
              {columns[column].map(task => (
                <Card
                  key={task._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task, task.stepId)}
                  className={`cursor-default hover:shadow-md transition-all active:cursor-grabbing border-l-4 ${getBorderColor(task.status)}`}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-sm font-medium leading-tight">{task.title}</span>
                      <GripVertical className="w-4 h-4 text-muted-foreground opacity-50" />
                    </div>

                    {task.assignedTo && (
                      <div className="flex items-center gap-2 pt-2">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                            {task.assignedToName?.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                          {task.assignedToName}
                        </span>
                      </div>
                    )}

                    {/* Start Task Button */}
                    {['Backlog', 'Ready', 'Pending'].includes(task.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2 h-7 text-xs border-green-200 hover:bg-green-50 hover:text-green-700 bg-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log("Start Task Triggered for Task ID:", task._id, "Step ID:", task.stepId);
                          onUpdateTask(task.stepId, task._id, { status: 'In Progress' });
                        }}
                      >
                        Start Task
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
};

export default KanbanBoard;
