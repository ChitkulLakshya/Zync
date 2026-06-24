import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SimulatedCursor } from "./SimulatedCursor";
import { ChevronLeft, ChevronRight } from "lucide-react";

type WalkthroughState = "idle" | "moving" | "grabbing" | "dragging" | "dropping" | "done";

export const SmartCalendarWalkthrough = () => {
  const [phase, setPhase] = useState<WalkthroughState>("idle");
  const [cursorPos, setCursorPos] = useState({ x: "85%", y: "85%" });
  const [isClicking, setIsClicking] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    let isActive = true;

    const runSequence = async () => {
      if (!isActive) {return;}
      setPhase("idle");
      setCursorPos({ x: isMobile ? "90%" : "85%", y: isMobile ? "90%" : "85%" });
      setIsClicking(false);
      
      await new Promise(r => setTimeout(r, 1000));
      
      // Move to event (on Wednesday, col 3, row 2)
      if (!isActive) {return;}
      setPhase("moving");
      setCursorPos({ x: "50%", y: "52%" });
      await new Promise(r => setTimeout(r, 600));
      
      // Grab event
      if (!isActive) {return;}
      setPhase("grabbing");
      setIsClicking(true);
      await new Promise(r => setTimeout(r, 300));
      
      // Drag event to Friday (col 5)
      if (!isActive) {return;}
      setPhase("dragging");
      // We animate both the cursor and the event's x offset
      setCursorPos({ x: "78.5%", y: "52%" });
      await new Promise(r => setTimeout(r, 600));
      
      // Drop
      if (!isActive) {return;}
      setPhase("dropping");
      setIsClicking(false);
      await new Promise(r => setTimeout(r, 200));
      
      // Done - cursor leaves
      if (!isActive) {return;}
      setPhase("done");
      // Prevent cursor from overlapping surrounding content outside the component on mobile
      setCursorPos({ x: isMobile ? "90%" : "120%", y: isMobile ? "95%" : "120%" });
      await new Promise(r => setTimeout(r, 3000));
      
      if (isActive) {runSequence();}
    };
    
    runSequence();

    return () => {
      isActive = false;
    };
  }, [isMobile]);

  return (
    <div className="relative w-full max-w-sm aspect-[4/3] sm:aspect-[4/3] bg-surface-glass-regular backdrop-blur-regular border border-border/10 rounded-2xl sm:rounded-xl overflow-hidden shadow-elevation3 mx-auto flex flex-col min-h-[300px] sm:min-h-0">
      <SimulatedCursor x={cursorPos.x} y={cursorPos.y} isClicking={isClicking} />
      
      {/* Header (rbc-toolbar miniature) */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-border/30 bg-secondary/30 relative z-10">
        <div className="flex gap-1 sm:gap-1.5">
          <div className="px-1.5 py-0.5 rounded border border-border/20 text-[8px] sm:text-[7px] font-medium text-foreground bg-background/50 shadow-sm flex items-center cursor-default hover:bg-accent transition-colors">Today</div>
          <div className="flex gap-0.5">
            <div className="w-4 h-4 rounded border border-border/20 flex items-center justify-center text-muted-foreground bg-background/50 shadow-sm hover:bg-accent transition-colors"><ChevronLeft className="w-2.5 h-2.5" /></div>
            <div className="w-4 h-4 rounded border border-border/20 flex items-center justify-center text-muted-foreground bg-background/50 shadow-sm hover:bg-accent transition-colors"><ChevronRight className="w-2.5 h-2.5" /></div>
          </div>
        </div>
        <span className="text-[11px] sm:text-[10px] font-semibold text-foreground">January 2026</span>
        <div className="flex gap-0.5">
          <div className="px-1.5 py-0.5 rounded border border-border/20 text-[8px] sm:text-[7px] font-medium text-primary-foreground bg-primary shadow-sm flex items-center cursor-default">Month</div>
          <div className="px-1.5 py-0.5 rounded border border-border/20 text-[8px] sm:text-[7px] font-medium text-foreground bg-background/50 shadow-sm flex items-center cursor-default hover:bg-accent transition-colors">Week</div>
          <div className="px-1.5 py-0.5 rounded border border-border/20 text-[8px] sm:text-[7px] font-medium text-foreground bg-background/50 shadow-sm flex items-center cursor-default hover:bg-accent transition-colors">Day</div>
        </div>
      </div>

      {/* Calendar Grid (rbc-month-view miniature) */}
      <div className="flex flex-col flex-1 relative overflow-hidden bg-background/50 p-2">
        <div className="absolute inset-0 bg-gradient-to-tr from-task-orange/5 to-transparent pointer-events-none" />
        
        <div className="grid grid-cols-7 border border-border/10 rounded-md overflow-hidden flex-1 bg-secondary/10 relative z-10" style={{ gridTemplateRows: 'auto repeat(4, 1fr)' }}>
          {/* Grid header */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="text-[7px] sm:text-[6px] font-semibold text-muted-foreground text-center py-1 border-b border-border/10 bg-secondary/20">
              {day}
            </div>
          ))}
          
          {/* Grid body */}
          {[...Array(28)].map((_, i) => {
            const dayNum = i + 4; // Start from 4th
            const isTargetDay = i === 12; // Fri 16 (Row 2, Col 5)
            const isStartDay = i === 10; // Wed 14 (Row 2, Col 3)

            return (
              <div 
                key={i} 
                className={`border-b border-r border-border/10 p-0.5 relative flex flex-col gap-0.5 ${i % 7 === 6 ? 'border-r-0' : ''} ${i >= 21 ? 'border-b-0' : ''} ${dayNum === 15 ? 'bg-accent/10' : ''}`}
              >
                <div className={`text-[7px] sm:text-[6px] text-right px-1 ${dayNum === 15 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                  {dayNum}
                </div>
                
                {/* Dummy events */}
                {i === 2 && (
                   <div className="bg-task-green text-primary-foreground text-[6px] sm:text-[5px] px-1 py-[1px] rounded-[2px] truncate opacity-60 font-medium">
                     Kickoff
                   </div>
                )}
                {i === 18 && (
                   <div className="bg-task-blue text-primary-foreground text-[6px] sm:text-[5px] px-1 py-[1px] rounded-[2px] truncate opacity-60 font-medium">
                     Team Sync
                   </div>
                )}
                
                {/* Drop Zone Highlight */}
                <AnimatePresence>
                  {isTargetDay && phase === "dropping" && (
                    <motion.div
                      className="absolute inset-0 bg-task-orange/10 border border-task-orange/30 rounded-[2px] -z-10 m-0.5"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    />
                  )}
                </AnimatePresence>

                {/* The Draggable Event Pill (Starts on Wed 14) */}
                {(isStartDay && phase !== "dropping" && phase !== "done") && (
                  <motion.div
                    layoutId="draggable-event"
                    className="bg-task-orange text-background text-[6px] sm:text-[5px] px-1 py-[2px] rounded-[3px] shadow-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis cursor-grab relative z-20 mt-auto mb-1"
                    animate={
                      phase === "dragging" 
                        ? { x: "205%", y: 0, scale: 1.05, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 50, rotate: 2 } 
                        : phase === "grabbing"
                          ? { scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }
                          : { x: 0, y: 0, scale: 1, rotate: 0 }
                    }
                    transition={
                      phase === "dragging" ? { duration: 0.6, ease: "easeInOut" } : { type: "spring", stiffness: 300, damping: 24 }
                    }
                  >
                    Frontend refactor
                  </motion.div>
                )}

                {/* The Dropped Event Pill (Lands on Fri 16) */}
                {(isTargetDay && (phase === "dropping" || phase === "done")) && (
                  <motion.div
                    layoutId="draggable-event"
                    className="bg-task-orange text-background text-[6px] sm:text-[5px] px-1 py-[2px] rounded-[3px] shadow-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis relative z-20 mt-auto mb-1"
                    initial={{ scale: 1.05, rotate: 2 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  >
                    Frontend refactor
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

