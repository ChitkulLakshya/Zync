import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoreHorizontal, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";

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
  isOwner?: boolean;
}

// Map task statuses to Kanban columns
const COLUMN_MAPPING: Record<string, string> = {
  'Pending': 'Ready',
  'Backlog': 'Ready',
  'Ready': 'Ready',
  'In Progress': 'In Progress',
  'In Review': 'In Progress',
  'Completed': 'Done',
  'Done': 'Done'
};

const COLUMNS = ['Ready', 'In Progress', 'Done'];

const KanbanBoard = ({ steps, onUpdateTask, users, isOwner }: KanbanBoardProps) => {
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
    if (status === 'In Progress') return 'border-l-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]';
    if (status === 'Done') return 'border-l-blue-500 bg-blue-500/10';
    return 'border-l-muted-foreground/30';
  };

  // Helper for column header colors
  const getHeaderColor = (column: string) => {
    if (column === 'In Progress') return 'border-b-green-500/50 bg-green-500/5 text-green-500';
    if (column === 'Done') return 'border-b-blue-500/50 bg-blue-500/5 text-blue-500';
    return 'border-b-border/50 bg-secondary/10';
  };

  return (
    // Allow natural height, enable x-overflow for the board container but y-visible for columns
    <div className="flex h-full gap-4 overflow-x-auto pb-4 items-start">
      {COLUMNS.map(column => (
        <div
          key={column}
          className={`flex-shrink-0 w-72 bg-secondary/20 rounded-lg flex flex-col border border-border/50 ${column === 'In Progress' ? 'ring-1 ring-green-500/20' : ''}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column)}
        >
          <div className={`p-3 font-semibold text-sm flex justify-between items-center rounded-t-lg border-b ${getHeaderColor(column)}`}>
            {column}
            <Badge variant="secondary" className="ml-2 bg-background/50">{columns[column].length}</Badge>
          </div>

          <div className="flex-1 p-2 min-h-[100px]">
            <motion.div
              className="space-y-2"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1 // Slower stagger
                  }
                }
              }}
            >
              <AnimatePresence mode="popLayout">
                {columns[column].map(task => (
                  <motion.div
                    key={task._id}
                    layout // Enable layout animations
                    layoutId={task._id} // Unique ID for layout animations
                    initial={{
                      opacity: 0,
                      x: column === 'In Progress' ? -310 : column === 'Done' ? -620 : -20,
                      zIndex: 10
                    }}
                    animate={{ opacity: 1, x: 0, zIndex: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      type: "tween",
                      duration: 0.5,
                      ease: "circOut"
                    }}
                    className="relative"
                  >
                    <Card
                      draggable
                      onDragStart={(e) => handleDragStart(e, task, task.stepId)}
                      className={`cursor-grab active:cursor-grabbing hover:shadow-lg transition-all border-l-4 ${getBorderColor(task.status)} relative overflow-hidden`}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-sm font-medium leading-tight z-10 relative">{task.title}</span>
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

                        {/* Visual Progress Stepper */}
                        <div className="flex items-center mt-3 pt-2 border-t border-border/30 w-full">
                          {['Ready', 'In Progress', 'Done'].map((step, index) => {
                            const STATUS_ORDER = ['Ready', 'In Progress', 'Done'];
                            const currentStatusIndex = STATUS_ORDER.indexOf(task.status === 'Completed' ? 'Done' : (task.status === 'Pending' || task.status === 'Backlog' ? 'Ready' : task.status === 'In Review' ? 'In Progress' : task.status));
                            const isCompleted = index <= currentStatusIndex;
                            const isCurrent = index === currentStatusIndex;

                            return (
                              <div key={step} className="flex items-center flex-1 last:flex-none">
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.3 + (index * 0.1), type: "spring", stiffness: 400, damping: 20 }}
                                  className={`w-2 h-2 rounded-full transition-colors duration-300 z-10 shrink-0 ${isCompleted
                                    ? (task.status === 'In Progress' || task.status === 'In Review' || task.status === 'Done' || task.status === 'Completed' ? 'bg-green-500' : 'bg-primary/60')
                                    : 'bg-muted'
                                    } ${isCurrent ? 'ring-2 ring-offset-1 ring-offset-card ' + (task.status === 'In Progress' || task.status === 'Ready' || task.status === 'In Review' || task.status === 'Done' ? 'ring-green-500' : 'ring-primary/60') : ''}`}
                                  title={step}
                                />
                                {index < 2 && (
                                  <div className="h-[2px] w-full -mx-0.5 relative z-0 bg-muted/50 overflow-hidden">
                                    {isCompleted && index < currentStatusIndex && (
                                      <motion.div
                                        initial={{ width: "0%" }}
                                        animate={{ width: "100%" }}
                                        transition={{ delay: 0.35 + (index * 0.1), duration: 0.2, ease: "easeInOut" }}
                                        className={`h-full w-full ${task.status === 'In Progress' || task.status === 'Done' || task.status === 'Completed' ? 'bg-green-500' : 'bg-primary/30'}`}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Start Task Button - Hidden for Owner */}
                        {['Ready', 'Pending', 'Backlog'].includes(task.status) && !isOwner && (
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
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default KanbanBoard;
