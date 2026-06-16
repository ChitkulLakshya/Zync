import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SimulatedCursor } from "./SimulatedCursor";
import { Copy, Check, Github, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type WalkthroughState = "idle" | "copying" | "terminal" | "typing" | "pushing" | "success";

export const GithubSyncWalkthrough = () => {
  const [phase, setPhase] = useState<WalkthroughState>("idle");
  const [cursorPos, setCursorPos] = useState({ x: "50%", y: "90%" });
  const [isClicking, setIsClicking] = useState(false);
  const [termText, setTermText] = useState("");

  const commitCommand = 'git commit -m "Fix auth [ZYNC-COMPLETE #142]"';

  useEffect(() => {
    let isActive = true;

    const runSequence = async () => {
      if (!isActive) {return;}
      setPhase("idle");
      setTermText("");
      setCursorPos({ x: "50%", y: "90%" });
      setIsClicking(false);
      
      await new Promise(r => setTimeout(r, 1000));
      
      // Move to Copy Button
      if (!isActive) {return;}
      setCursorPos({ x: "85%", y: "61%" });
      await new Promise(r => setTimeout(r, 800));
      
      // Click Copy
      if (!isActive) {return;}
      setIsClicking(true);
      await new Promise(r => setTimeout(r, 150));
      setIsClicking(false);
      setPhase("copying");
      
      await new Promise(r => setTimeout(r, 600));
      
      // Move mouse away after copying
      if (!isActive) {return;}
      setCursorPos({ x: "90%", y: "80%" });
      await new Promise(r => setTimeout(r, 500));
      
      // Show Terminal
      if (!isActive) {return;}
      setPhase("terminal");
      setCursorPos({ x: "95%", y: "110%" });
      await new Promise(r => setTimeout(r, 600));
      
      // Type in terminal
      if (!isActive) {return;}
      setPhase("typing");
      for (let i = 0; i <= commitCommand.length; i++) {
        if (!isActive) {break;}
        setTermText(commitCommand.slice(0, i));
        const typingDelay = 15 + Math.random() * 25 + (commitCommand[i] === " " ? 30 : 0);
        await new Promise(r => setTimeout(r, typingDelay));
      }
      
      await new Promise(r => setTimeout(r, 400));
      
      // Push and Success
      if (!isActive) {return;}
      setPhase("pushing");
      await new Promise(r => setTimeout(r, 1200));
      
      if (!isActive) {return;}
      setPhase("success");
      await new Promise(r => setTimeout(r, 4000));
      
      if (isActive) {runSequence();}
    };
    
    runSequence();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="relative w-full max-w-[420px] bg-secondary/5 border border-border/10 shadow-2xl rounded-[2rem] p-6 mx-auto flex flex-col justify-center min-h-[320px] font-sans overflow-hidden">
      <SimulatedCursor x={cursorPos.x} y={cursorPos.y} isClicking={isClicking} />
      
      {/* Exact replica of TaskGitSync Component */}
      <div className="p-4 rounded-2xl border border-border/10 bg-card/50 backdrop-blur-xl shadow-sm pointer-events-none">
        <div className="flex items-center gap-2 mb-2">
          <Github className="w-4 h-4 text-foreground" />
          <h4 className="font-medium text-sm text-foreground">Sync with GitHub</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Include this tag in your commit message to automatically complete this task.
        </p>

        <div className="flex items-center gap-2">
          <code className="flex-1 bg-card/50 backdrop-blur-md px-3 py-2 rounded-xl text-xs font-mono text-foreground truncate border border-border/10">
            [ZYNC-COMPLETE #142]
          </code>
          <motion.div animate={isClicking && phase === "idle" ? { scale: 0.9 } : { scale: 1 }}>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 h-9 w-9"
            >
              {phase !== "idle" ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Authentic GitCommandsDrawer Terminal Snippet */}
      <AnimatePresence>
        {(phase === "terminal" || phase === "typing" || phase === "pushing" || phase === "success") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-6 left-6 right-6 overflow-hidden rounded-xl bg-[#0d0d0d] border border-white/10 shadow-2xl font-mono text-xs"
          >
            {/* Mac dots */}
            <div className="absolute top-3.5 left-3.5 flex gap-1.5 opacity-50">
              <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
            </div>

            <div className="p-4 pt-10 text-blue-200/90 leading-relaxed min-h-[100px]">
              <div className="flex">
                <span className="text-green-500 mr-2 shrink-0">$</span>
                <span className="break-all">
                  {termText}
                  {phase === "typing" && <span className="inline-block w-2 h-3.5 bg-blue-200/80 ml-1 animate-pulse align-middle" />}
                </span>
              </div>
              
              {phase === "pushing" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted-foreground mt-2 space-y-1">
                  <div>[main a1b2c3d] Fix auth</div>
                  <div>1 file changed, 12 ins(+)</div>
                </motion.div>
              )}
              
              {phase === "success" && (
                <div className="text-muted-foreground mt-2 space-y-1">
                  <div>[main a1b2c3d] Fix auth</div>
                  <div>1 file changed, 12 ins(+)</div>
                  <div className="mt-2 text-foreground/80 flex items-center gap-2">
                    <span className="text-task-green">✔</span> Pushed to origin main
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {phase === "success" && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 bg-card border border-task-green/30 shadow-elevation4 px-4 py-2.5 rounded-full flex items-center gap-2 z-20 whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4 text-task-green" />
            <span className="text-xs font-medium text-foreground">Task #142 marked as Done</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
