import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SimulatedCursor } from "./SimulatedCursor";
import { Terminal, GitBranch, Columns, CheckCircle2 } from "lucide-react";

type WalkthroughState = "idle" | "clicking" | "pushing" | "syncing" | "moving" | "done";

export const GithubSyncWalkthrough = () => {
  const [phase, setPhase] = useState<WalkthroughState>("idle");
  const [cursorPos, setCursorPos] = useState({ x: "90%", y: "90%" });
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    let isActive = true;

    const runSequence = async () => {
      if (!isActive) return;
      setPhase("idle");
      setCursorPos({ x: "90%", y: "90%" });
      setIsClicking(false);
      
      await new Promise(r => setTimeout(r, 1000));
      
      // Move to terminal
      if (!isActive) return;
      setCursorPos({ x: "15%", y: "55%" });
      await new Promise(r => setTimeout(r, 600));
      
      // Click "push"
      if (!isActive) return;
      setPhase("clicking");
      setIsClicking(true);
      await new Promise(r => setTimeout(r, 200));
      setIsClicking(false);
      
      // Pushing
      if (!isActive) return;
      setPhase("pushing");
      setCursorPos({ x: "120%", y: "120%" }); // cursor leaves
      await new Promise(r => setTimeout(r, 800));
      
      // Syncing (Toast shows up)
      if (!isActive) return;
      setPhase("syncing");
      await new Promise(r => setTimeout(r, 1200));
      
      // Moving task
      if (!isActive) return;
      setPhase("moving");
      await new Promise(r => setTimeout(r, 800));
      
      // Done
      if (!isActive) return;
      setPhase("done");
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
      
      {/* Toast Notification */}
      <AnimatePresence>
        {(phase === "syncing" || phase === "moving" || phase === "done") && (
          <motion.div
            className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-card/90 backdrop-blur-md border border-task-green/30 shadow-elevation3 px-3 py-1.5 rounded-full flex items-center gap-2"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <GitBranch className="w-3.5 h-3.5 text-task-green" />
            <span className="text-[10px] font-medium text-foreground whitespace-nowrap">Commit detected: Fix auth bug (#142)</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Terminal */}
        <div className="flex-1 border-r border-border/30 flex flex-col bg-background/50">
          <div className="h-7 flex items-center px-3 gap-2 border-b border-border/30 bg-secondary/30">
            <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground font-mono font-medium">bash</span>
          </div>
          <div className="p-3 space-y-2 flex-1 font-mono text-[10px] text-muted-foreground tracking-tight">
            <div className="flex gap-2">
              <span className="text-task-green">~</span>
              <span>git commit -m "Fix auth"</span>
            </div>
            <div className="text-foreground/80">[main a1b2c3d] Fix auth</div>
            <div>1 file changed, 12 ins(+)</div>
            
            <div className="mt-4 flex gap-2 items-center">
              <span className="text-task-green">~</span>
              {phase === "idle" ? (
                <motion.span 
                  className="bg-primary/20 text-primary px-1 rounded inline-block shadow-sm"
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  git push
                </motion.span>
              ) : (
                <span className="text-foreground/90">git push</span>
              )}
            </div>
            
            {phase !== "idle" && phase !== "clicking" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-1 mt-1 text-muted-foreground"
              >
                <div>Counting objects: 5, done.</div>
                <div>Writing objects: 100% (3/3).</div>
                <div>To github.com:user/repo.git</div>
                <div className="text-foreground/80">  d9e0f1..a1b2c3  main -{">"} main</div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right: Zync Task Board */}
        <div className="flex-1 flex flex-col bg-surface-glass-thin relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-task-green/5 to-transparent pointer-events-none" />
          <div className="h-7 flex items-center px-3 gap-2 border-b border-border/30 bg-secondary/30 relative z-10">
            <Columns className="w-3.5 h-3.5 text-task-green" />
            <span className="text-[9px] font-semibold tracking-wider text-foreground uppercase">Board</span>
          </div>
          <div className="p-2 flex gap-2 flex-1 relative z-10">
            {/* Column 1: In Progress */}
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="text-[8px] uppercase font-bold text-task-orange flex items-center justify-between px-1">
                Doing <span>1</span>
              </div>
              <AnimatePresence>
                {phase !== "moving" && phase !== "done" && (
                  <motion.div
                    layoutId="github-sync-task-card"
                    className="bg-card border border-border/50 rounded-md p-2 shadow-elevation1"
                    animate={phase === "syncing" ? { 
                      boxShadow: "0 0 0 2px hsl(var(--task-green)/0.4)",
                      borderColor: "hsl(var(--task-green))",
                      scale: 1.02
                    } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-[9px] font-medium text-foreground leading-tight">Fix auth bug (#142)</div>
                    <div className="text-[7px] text-muted-foreground mt-1.5 flex justify-between items-center">
                      <span className="bg-secondary px-1 py-0.5 rounded">ENG-42</span>
                      <div className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center text-[5px] text-primary font-bold">AJ</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Column 2: Done */}
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="text-[8px] uppercase font-bold text-task-green flex items-center justify-between px-1">
                Done <span>{phase === "moving" || phase === "done" ? "1" : "0"}</span>
              </div>
              <AnimatePresence>
                {(phase === "moving" || phase === "done") && (
                  <motion.div
                    layoutId="github-sync-task-card"
                    className="bg-card border border-task-green/30 rounded-md p-2 shadow-elevation2 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-task-green/5" />
                    <div className="text-[9px] font-medium text-foreground leading-tight flex gap-1 items-start">
                      <CheckCircle2 className="w-3 h-3 text-task-green shrink-0 mt-0.5" />
                      Fix auth bug (#142)
                    </div>
                    <div className="text-[7px] text-muted-foreground mt-1.5 flex justify-between items-center pl-4">
                      <span className="bg-secondary px-1 py-0.5 rounded">ENG-42</span>
                      <div className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center text-[5px] text-primary font-bold">AJ</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
