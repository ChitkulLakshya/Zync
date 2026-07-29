import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronDown, Clock } from 'lucide-react';
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, isToday
} from 'date-fns';
import { fetchProjects } from '@/api/projects';
import { cn, getUserInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTaskUpdates } from '@/hooks/use-task-updates';

interface MobileCalendarProps {
  currentUser?: any;
  users?: any[];
}

const COLUMN_MAPPING: Record<string, { label: string, border: string, bg: string, progressColor: string, progress: number }> = {
  'Ready': { label: 'Ready', border: 'border-slate-500/50 shadow-[0_0_15px_-3px_rgba(100,116,139,0.15)]', bg: 'bg-slate-500/20', progressColor: 'bg-slate-500', progress: 0 },
  'Active': { label: 'Active', border: 'border-blue-500/50 shadow-[0_0_15px_-3px_rgba(59,130,246,0.15)]', bg: 'bg-blue-500/20', progressColor: 'bg-blue-500', progress: 20 },
  'In Progress': { label: 'On Progress', border: 'border-amber-500/50 shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)]', bg: 'bg-amber-500/20', progressColor: 'bg-amber-500', progress: 50 },
  'PR Raised': { label: 'In Review', border: 'border-purple-500/50 shadow-[0_0_15px_-3px_rgba(168,85,247,0.15)]', bg: 'bg-purple-500/20', progressColor: 'bg-purple-500', progress: 90 },
  'Done': { label: 'Completed', border: 'border-emerald-500/50 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]', bg: 'bg-emerald-500/20', progressColor: 'bg-emerald-500', progress: 100 },
};

export default function MobileCalendar({ currentUser, users = [] }: MobileCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetchProjects().then(setProjects).catch(() => {});
  }, []);
  
  const projectIds = useMemo(() => projects.map(p => p.id || p._id).filter(Boolean), [projects]);
  useTaskUpdates({
    userId: currentUser?.uid,
    projectIds,
    onTaskChange: () => {
      fetchProjects().then(setProjects).catch(() => {});
    },
  });

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const allTasks = useMemo(() => {
    const tasks: any[] = [];
    projects.forEach(project => {
      project.steps.forEach((step: any) => {
        (step.tasks || []).forEach((task: any) => {
          tasks.push({ ...task, projectName: project.name });
        });
      });
    });
    return tasks;
  }, [projects]);

  const tasksInWeek = useMemo(() => {
    return allTasks.map(task => {
        let start = new Date(task.createdAt);
        let end = new Date(task.updatedAt || task.createdAt);
        if (start > end) {
           const temp = start; start = end; end = temp;
        }
        
        // clamp to week
        if (start < weekStart) {start = weekStart;}
        if (end > weekEnd) {end = weekEnd;}
        
        const startDayIndex = start.getDay() + 1; // 1 to 7
        let span = end.getDay() - start.getDay() + 1;
        if (span <= 0) {span = 1;}
        if (span < 2) {span = 2;} // minimum span for aesthetics
        if (startDayIndex + span - 1 > 7) {
           span = 7 - startDayIndex + 1;
        }
    
        return { ...task, startDayIndex, span, clampedStart: start, clampedEnd: end };
    }).filter(t => {
       const start = new Date(t.createdAt);
       const end = new Date(t.updatedAt || t.createdAt);
       return start <= weekEnd && end >= weekStart;
    });
  }, [allTasks, weekStart, weekEnd]);

  // A simple greedy algorithm for assigning rows in the CSS grid
  const rowAssignments = useMemo(() => {
     const rows: { start: number, end: number }[][] = [];
     const assignments = new Map<string, number>();

     // Sort tasks by start day, then by duration descending
     const sorted = [...tasksInWeek].sort((a, b) => {
        if (a.startDayIndex !== b.startDayIndex) {return a.startDayIndex - b.startDayIndex;}
        return b.span - a.span;
     });

     sorted.forEach(task => {
        let rowIndex = 0;
        let placed = false;
        const s = task.startDayIndex;
        const e = task.startDayIndex + task.span - 1;

        while (!placed) {
           if (!rows[rowIndex]) {rows[rowIndex] = [];}
           const overlap = rows[rowIndex].some(r => Math.max(s, r.start) <= Math.min(e, r.end));
           if (!overlap) {
              rows[rowIndex].push({ start: s, end: e });
              assignments.set(task._id || task.id, rowIndex + 1); // CSS Grid rows are 1-indexed (after header)
              placed = true;
           } else {
              rowIndex++;
           }
        }
     });

     return assignments;
  }, [tasksInWeek]);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="pl-4 pr-14 py-4 shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center justify-between z-20 bg-background/80 backdrop-blur-md border-b border-border/10">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Task Calendar</h2>
          <p className="text-sm text-muted-foreground">{format(currentDate, 'dd MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-1">
           <Button variant="outline" size="icon" className="rounded-full w-8 h-8 shadow-sm" onClick={() => setCurrentDate(addWeeks(currentDate, -1))}>
             <ChevronLeft className="w-4 h-4" />
           </Button>
           <Button variant="outline" size="sm" className="rounded-full px-4 h-8 font-medium shadow-sm" onClick={() => setCurrentDate(new Date())}>
             Today
           </Button>
           <Button variant="outline" size="icon" className="rounded-full w-8 h-8 shadow-sm" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
             <ChevronRight className="w-4 h-4" />
           </Button>
           <Button variant="outline" size="sm" className="rounded-full px-3 h-8 font-medium shadow-sm flex items-center gap-1 ml-1 hidden sm:flex">
             Week <ChevronDown className="w-3.5 h-3.5" />
           </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div className="min-w-[700px] md:min-w-full px-4 relative pt-4 pb-12">
              
              {/* Days Header */}
              <div className="grid grid-cols-7 gap-x-3 mb-6 relative z-20">
                {days.map((day, i) => {
                  const today = isToday(day);
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 relative">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase">{format(day, 'eeeee')}</span>
                      <span className={cn(
                        "text-sm font-semibold transition-colors w-8 h-8 flex items-center justify-center rounded-full", 
                        today ? "bg-emerald-500 text-white shadow-sm" : "text-foreground"
                      )}>
                        {format(day, 'dd')}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Grid Background Lines & Today Marker */}
              <div className="absolute inset-0 top-[80px] grid grid-cols-7 gap-x-3 px-4 pointer-events-none z-0">
                 {days.map((day, i) => {
                    const today = isToday(day);
                    return (
                       <div key={i} className="relative h-full border-r border-border/5">
                          {today && (
                             <div className="absolute top-0 bottom-0 right-[-1px] w-[2px] bg-foreground/20 z-0" />
                          )}
                       </div>
                    );
                 })}
              </div>

              {/* Task Cards Grid */}
              <div className="grid grid-cols-7 gap-x-3 gap-y-4 relative z-10">
                 {tasksInWeek.map((task, idx) => {
                    const statusInfo = COLUMN_MAPPING[task.status] || COLUMN_MAPPING['Ready'];
                    
                    // Generate mockup time duration
                    const hash = (task._id || '').split('').reduce((a: number,b: string) => a+b.charCodeAt(0),0) || 0;
                    const hrs = (hash % 4) + 1;
                    const mins = (hash % 60);

                    // Assigned Users
                    const assignedUsers: any[] = [];
                    if (task.assignedTo) {
                      const u = users.find(x => x.uid === task.assignedTo);
                      if (u) {assignedUsers.push(u);}
                    }
                    if (task.assignedUserIds) {
                       task.assignedUserIds.forEach((uid: string) => {
                          const u = users.find(x => x.uid === uid);
                          if (u && !assignedUsers.find(x => x.uid === uid)) {assignedUsers.push(u);}
                       });
                    }

                    const row = rowAssignments.get(task._id || task.id) || 1;

                    return (
                      <Card 
                         key={task._id || idx} 
                         className={cn(
                            "p-3 rounded-2xl bg-card/90 backdrop-blur-md border transition-all duration-300 relative overflow-hidden flex flex-col justify-between", 
                            statusInfo.border
                         )}
                         style={{ 
                            gridColumn: `${task.startDayIndex} / span ${task.span}`,
                            gridRow: `${row}`
                         }}
                      >
                         <div>
                             <div className="mb-2">
                               <h3 className="font-semibold text-[13px] leading-tight line-clamp-2 pr-2">{task.title}</h3>
                             </div>
                             
                             <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3">
                               <Clock className="w-3 h-3 shrink-0" />
                               <span>{hrs.toString().padStart(2,'0')}.{mins.toString().padStart(2,'0')} hrs</span>
                             </div>

                             {/* Progress Bar */}
                             <div className={cn("h-1.5 w-full rounded-full mb-3 overflow-hidden", statusInfo.bg)}>
                                <div className={cn("h-full rounded-full transition-all duration-500", statusInfo.progressColor)} style={{ width: `${statusInfo.progress}%` }} />
                             </div>
                         </div>

                         {/* Footer: Status & Avatars */}
                         <div className="flex items-end justify-between mt-auto pt-1">
                            <div className="flex flex-col">
                               <span className="text-[11px] font-semibold tracking-tight">{statusInfo.label}</span>
                               <span className="text-[10px] text-muted-foreground">{statusInfo.progress}%</span>
                            </div>

                            <div className="flex -space-x-2 shrink-0">
                               {assignedUsers.slice(0, 2).map((u) => (
                                 <Avatar key={u.uid} className="w-6 h-6 border-2 border-card shadow-sm">
                                   <AvatarImage src={u.photoURL || undefined} />
                                   <AvatarFallback className="text-[8px]">{getUserInitials({ displayName: u.displayName })}</AvatarFallback>
                                 </Avatar>
                               ))}
                               {assignedUsers.length > 2 && (
                                 <div className="w-6 h-6 rounded-full bg-secondary/80 backdrop-blur border-2 border-card flex items-center justify-center text-[9px] font-bold z-10 shadow-sm text-foreground">
                                   +{assignedUsers.length - 2}
                                 </div>
                               )}
                               {assignedUsers.length === 0 && (
                                 <Avatar className="w-6 h-6 border-2 border-card border-dashed">
                                   <AvatarFallback className="text-[8px] bg-transparent text-muted-foreground">?</AvatarFallback>
                                 </Avatar>
                               )}
                            </div>
                         </div>
                      </Card>
                    );
                 })}
                 {tasksInWeek.length === 0 && (
                    <div className="col-span-7 flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
                           <Clock className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">No tasks this week</p>
                        <p className="text-xs text-muted-foreground mt-1">Tasks will appear here once they are updated.</p>
                    </div>
                 )}
              </div>
          </div>
      </div>
    </div>
  );
}
