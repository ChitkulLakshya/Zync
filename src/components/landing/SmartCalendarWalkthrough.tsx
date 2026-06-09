import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SimulatedCursor } from "./SimulatedCursor";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";

type WalkthroughState = "idle" | "moving" | "grabbing" | "dragging" | "dropping" | "done";

export const SmartCalendarWalkthrough = () => {
  const [phase, setPhase] = useState<WalkthroughState>("idle");
  const [cursorPos, setCursorPos] = useState({ x: "85%", y: "85%" });
  const [isClicking, setIsClicking] = useState(false);
  const [taskPos, setTaskPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let isActive = true;

    const runSequence = async () => {
      if (!isActive) return;
      setPhase("idle");
      setCursorPos({ x: "85%", y: "85%" });
      setTaskPos({ x: 0, y: 0 });
      setIsClicking(false);
      
      await new Promise(r => setTimeout(r, 1000));
      
      // Move to task (on Wednesday, col 3)
      if (!isActive) return;
      setPhase("moving");
      setCursorPos({ x: "50%", y: "55%" });
      await new Promise(r => setTimeout(r, 600));
      
      // Grab task
      if (!isActive) return;
      setPhase("grabbing");
      setIsClicking(true);
      await new Promise(r => setTimeout(r, 300));
      
      // Drag task to Friday (col 5)
      if (!isActive) return;
      setPhase("dragging");
      // We animate both the cursor and the task's x offset
      setCursorPos({ x: "82%", y: "55%" });
      setTaskPos({ x: 100, y: 0 }); // Assuming 100px move, but we'll use motion for the actual move
      await new Promise(r => setTimeout(r, 600));
      
      // Drop
      if (!isActive) return;
      setPhase("dropping");
      setIsClicking(false);
      await new Promise(r => setTimeout(r, 200));
      
      // Done - cursor leaves
      if (!isActive) return;
      setPhase("done");
      setCursorPos({ x: "120%", y: "120%" });
      await new Promise(r => setTimeout(r, 3000));
      
      if (isActive) runSequence();
    };
    
    runSequence();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="relative w-full max-w-sm aspect-[4/3] bg-surface-glass-regular backdrop-blur-regular border border-border/50 rounded-xl overflow-hidden shadow-elevation3 mx-auto flex flex-col">
      <SimulatedCursor x={cursorPos.x} y={cursorPos.y} isClicking={isClicking} />
      
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-border/30 bg-secondary/30 relative z-10">
        <div className="flex items-center gap-2 text-foreground">
          <Calendar className="w-4 h-4 text-task-orange" />
          <span className="text-[10px] font-semibold tracking-wider uppercase">Sprint 42</span>
        </div>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded flex items-center justify-center hover:bg-secondary/50 text-muted-foreground"><ChevronLeft className="w-3 h-3" /></div>
          <div className="w-4 h-4 rounded flex items-center justify-center hover:bg-secondary/50 text-muted-foreground"><ChevronRight className="w-3 h-3" /></div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex flex-1 p-3 gap-2 relative overflow-hidden bg-background/50">
        <div className="absolute inset-0 bg-gradient-to-tr from-task-orange/5 to-transparent pointer-events-none" />
        
        {/* Days Header & Columns */}
        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, index) => (
          <div key={day} className="flex-1 flex flex-col relative z-10">
            <div className="text-[9px] font-medium text-muted-foreground text-center mb-2 pb-1 border-b border-border/50">
              {day}
            </div>
            
            {/* The Drop Zone Highlight */}
            <AnimatePresence>
              {index === 4 && phase === "dropping" && (
                <motion.div
                  className="absolute inset-x-0 top-6 bottom-0 bg-task-orange/10 rounded-md border border-task-orange/30 -z-10"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                />
              )}
            </AnimatePresence>
            
            {/* The Columns Container */}
            <div className="flex-1 rounded-md bg-secondary/20 border border-border/20 p-1 flex flex-col gap-1">
              
              {/* Dummy task on Monday */}
              {index === 0 && (
                <div className="bg-card border border-border/50 rounded p-1.5 shadow-elevation1 opacity-60">
                  <div className="text-[8px] font-medium text-foreground leading-tight line-clamp-2">Design review</div>
                  <div className="text-[6px] text-muted-foreground mt-1 flex items-center gap-0.5">
                    <Clock className="w-2 h-2" /> 10:00 AM
                  </div>
                </div>
              )}

              {/* The Draggable Task (Starts on Wednesday, moves to Friday) */}
              {(index === 2 && phase !== "dropping" && phase !== "done") && (
                <motion.div
                  layoutId="draggable-task"
                  className="bg-card border border-task-orange/30 rounded p-1.5 shadow-elevation2 relative z-20 cursor-grab"
                  animate={
                    phase === "dragging" 
                      ? { x: "215%", y: 0, scale: 1.05, boxShadow: "0 12px 32px rgba(0,0,0,0.15)", zIndex: 50, rotate: 2 } 
                      : phase === "grabbing"
                        ? { scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }
                        : { x: 0, y: 0, scale: 1, rotate: 0 }
                  }
                  transition={
                    phase === "dragging" ? { duration: 0.6, ease: "easeInOut" } : { type: "spring", stiffness: 300, damping: 24 }
                  }
                >
                  <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-task-orange rounded-l" />
                  <div className="text-[8px] font-medium text-foreground leading-tight pl-1 line-clamp-2">Frontend refactor & animations</div>
                  <div className="text-[6px] text-muted-foreground mt-1 flex justify-between items-center pl-1">
                    <span className="bg-secondary px-1 py-0.5 rounded">ENG-42</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-primary/20" />
                  </div>
                </motion.div>
              )}

              {/* The Dropped Task (Lands on Friday) */}
              {(index === 4 && (phase === "dropping" || phase === "done")) && (
                <motion.div
                  layoutId="draggable-task"
                  className="bg-card border border-task-orange/50 rounded p-1.5 shadow-elevation1 relative z-20"
                  initial={{ scale: 1.05, rotate: 2 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }} // snappy spring for drop
                >
                  <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-task-orange rounded-l" />
                  <div className="text-[8px] font-medium text-foreground leading-tight pl-1 line-clamp-2">Frontend refactor & animations</div>
                  <div className="text-[6px] text-muted-foreground mt-1 flex justify-between items-center pl-1">
                    <span className="bg-secondary px-1 py-0.5 rounded">ENG-42</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-primary/20" />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
