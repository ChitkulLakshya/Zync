import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const COLUMN_MAPPING: Record<string, string> = {
  'Pending': 'Ready',
  'Backlog': 'Ready',
  'Ready': 'Ready',
  'Active': 'Active',
  'In Review': 'In Progress', // Mapping In Review to In Progress if needed, or keep logic consistent with status
  'In Progress': 'In Progress',
  'Completed': 'Done',
  'Done': 'Done'
};

const COLUMNS = ['Ready', 'Active', 'In Progress', 'Done'];

const KanbanBoard = ({ steps, onUpdateTask, users, isOwner }: KanbanBoardProps) => {
  const [draggedTask, setDraggedTask] = useState<{ task: Task, stepId: string } | null>(null);

  const allTasks = useMemo(() => {
    return steps.flatMap(step =>
      step.tasks.map(task => ({
        ...task,
        status: COLUMN_MAPPING[task.status] || 'Ready',
        stepId: step._id
      }))
    );
  }, [steps]);

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
      let schemaStatus = targetStatus;
      if (targetStatus === 'Done') schemaStatus = 'Completed';
      onUpdateTask(draggedTask.stepId, draggedTask.task._id, { status: schemaStatus });
    }
    setDraggedTask(null);
  };

  const getThemeColor = (status: string) => {
    switch (status) {
      case 'Ready': return 'blue';
      case 'Active': return 'green';
      case 'In Progress': return 'orange';
      case 'Done': return 'yellow';
      default: return 'gray';
    }
  };

  const getColumnColor = (column: string) => {
    switch (column) {
      case 'Ready': return 'text-blue-400 border-blue-500/20 shadow-blue-500/10';
      case 'Active': return 'text-green-400 border-green-500/20 shadow-green-500/10';
      case 'In Progress': return 'text-orange-400 border-orange-500/20 shadow-orange-500/10';
      case 'Done': return 'text-yellow-400 border-yellow-500/20 shadow-yellow-500/10';
      default: return 'text-muted-foreground border-white/10';
    }
  };

  const getCardHoverBorder = (status: string) => {
    switch (status) {
      case 'Ready': return 'group-hover:border-blue-500/50';
      case 'Active': return 'group-hover:border-green-500/50';
      case 'In Progress': return 'group-hover:border-orange-500/50';
      case 'Done': return 'group-hover:border-yellow-500/50';
      default: return 'group-hover:border-white/30';
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center bg-black/40 overflow-hidden">
      <div className="w-full max-w-7xl h-full px-6 py-4 grid grid-cols-4 gap-6">
        {COLUMNS.map(column => (
          <div
            key={column}
            className="flex flex-col h-full gap-4 min-w-0"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column)}
          >
            {/* Sticky Header */}
            <div className={`
              sticky top-0 z-20 backdrop-blur-xl bg-black/20 p-4 rounded-xl border flex items-center justify-between
              ${getColumnColor(column)} shadow-lg
            `}>
              <span className="font-bold tracking-wide">{column}</span>
              <Badge variant="secondary" className="bg-white/10 text-white border-none">{columns[column].length}</Badge>
            </div>

            {/* Scrollable Column Content */}
            <div className="flex-1 overflow-y-auto pr-2 pb-20 custom-scrollbar space-y-3">
              <AnimatePresence mode="popLayout">
                {columns[column].map(task => (
                  <motion.div
                    key={task._id}
                    layoutId={task._id}
                    layout // Enable full layout animation
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="relative group"
                  >
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, task, task.stepId)}
                      className={`
                        relative w-full p-4 rounded-xl backdrop-blur-md transition-all duration-300
                        bg-white/5 border border-white/10 shadow-sm
                        ${getCardHoverBorder(task.status)}
                        hover:shadow-xl hover:bg-white/[0.07]
                        cursor-grab active:cursor-grabbing
                      `}
                    >
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="text-sm font-medium leading-tight text-white/90 z-10 relative">
                          {task.title}
                        </span>
                        <GripVertical className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
                      </div>

                      {task.assignedTo && (
                        <div className="flex items-center gap-2 mb-3">
                          <Avatar className="w-5 h-5 ring-1 ring-white/20">
                            <AvatarFallback className="text-[10px] bg-white/10 text-white/80">
                              {task.assignedToName?.substring(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-white/50 truncate max-w-[120px]">
                            {task.assignedToName}
                          </span>
                        </div>
                      )}

                      {/* Visual Progress Stepper */}
                      <div className="flex items-center pt-3 border-t border-white/10 w-full">
                        {['Ready', 'Active', 'In Progress', 'Done'].map((step, index) => {
                          const STATUS_ORDER = ['Ready', 'Active', 'In Progress', 'Done'];
                          const currentStatusIndex = STATUS_ORDER.indexOf(task.status === 'Completed' ? 'Done' : (task.status === 'Pending' || task.status === 'Backlog' ? 'Ready' : task.status === 'In Review' ? 'In Progress' : task.status));
                          const isCompleted = index <= currentStatusIndex;
                          const isCurrent = index === currentStatusIndex;

                          // Color logic based on status
                          let activeColorClass = 'bg-white/40';
                          if (task.status === 'Active') activeColorClass = 'bg-green-500';
                          else if (task.status === 'In Progress') activeColorClass = 'bg-orange-500';
                          else if (task.status === 'Done' || task.status === 'Completed') activeColorClass = 'bg-yellow-500';
                          else if (task.status === 'Ready') activeColorClass = 'bg-blue-500';

                          let ringColorClass = '';
                          if (task.status === 'Active') ringColorClass = 'ring-green-500';
                          else if (task.status === 'In Progress') ringColorClass = 'ring-orange-500';
                          else if (task.status === 'Done') ringColorClass = 'ring-yellow-500';
                          else ringColorClass = 'ring-blue-500';

                          return (
                            <div key={step} className="flex items-center flex-1 last:flex-none">
                              <div
                                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 z-10 shrink-0 
                                     ${isCompleted ? activeColorClass : 'bg-white/10'} 
                                     ${isCurrent ? `ring-2 ring-offset-1 ring-offset-transparent ${ringColorClass} scale-125` : ''}
                                   `}
                                title={step}
                              />
                              {index < 3 && (
                                <div className="h-[1px] w-full -mx-0.5 relative z-0 bg-white/5 overflow-hidden">
                                  {isCompleted && index < currentStatusIndex && (
                                    <motion.div
                                      initial={{ width: "0%" }}
                                      animate={{ width: "100%" }}
                                      className={`h-full w-full ${activeColorClass}`}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Start Task Button */}
                      {['Ready', 'Pending', 'Backlog'].includes(task.status) && !isOwner && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full h-7 text-xs border border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateTask(task.stepId, task._id, { status: 'Active' });
                            }}
                          >
                            Start Task
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;
