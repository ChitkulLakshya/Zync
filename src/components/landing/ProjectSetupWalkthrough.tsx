import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SimulatedCursor } from "./SimulatedCursor";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

type WalkthroughState = "idle" | "typing" | "clicking" | "generating" | "success";

export const ProjectSetupWalkthrough = () => {
  const [phase, setPhase] = useState<WalkthroughState>("idle");
  const [text, setText] = useState("");
  const fullText = "A real-time dashboard for remote teams with live chat and task tracking.";
  const [cursorPos, setCursorPos] = useState({ x: "85%", y: "85%" });
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    let isActive = true;

    const runSequence = async () => {
      // 1. Initial State
      if (!isActive) {return;}
      setPhase("idle");
      setText("");
      setCursorPos({ x: "60%", y: "95%" }); // Start slightly lower middle
      setIsClicking(false);
      
      await new Promise(r => setTimeout(r, 800));
      
      // 2. Move to text area
      if (!isActive) {return;}
      setCursorPos({ x: "30%", y: "63%" }); // Mathematically centered on the textarea
      await new Promise(r => setTimeout(r, 800)); // Human movement delay
      setIsClicking(true);
      await new Promise(r => setTimeout(r, 150));
      setIsClicking(false);
      
      // 3. Type
      if (!isActive) {return;}
      setPhase("typing");
      for (let i = 0; i <= fullText.length; i++) {
        if (!isActive) {break;}
        setText(fullText.slice(0, i));
        // Add some random variation simulating human typing speed
        const typingDelay = 20 + Math.random() * 40 + (fullText[i] === " " ? 40 : 0);
        await new Promise(r => setTimeout(r, typingDelay));
      }
      
      await new Promise(r => setTimeout(r, 600)); // Pause after typing
      
      // 4. Move to Generate button
      if (!isActive) {return;}
      setCursorPos({ x: "72%", y: "89%" }); // Mathematically centered on the button
      setPhase("clicking");
      await new Promise(r => setTimeout(r, 700)); // Human movement delay
      setIsClicking(true);
      await new Promise(r => setTimeout(r, 150));
      setIsClicking(false);
      
      // 5. Generating state
      if (!isActive) {return;}
      setPhase("generating");
      setCursorPos({ x: "85%", y: "110%" }); // Move out of view naturally
      await new Promise(r => setTimeout(r, 2000));
      
      // 6. Success state
      if (!isActive) {return;}
      setPhase("success");
      await new Promise(r => setTimeout(r, 3500));
      
      // Loop
      if (isActive) {runSequence();}
    };
    
    runSequence();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="relative w-full max-w-[420px] bg-secondary/5 border border-border/10 shadow-2xl rounded-[2rem] overflow-hidden mx-auto font-sans">
      <SimulatedCursor x={cursorPos.x} y={cursorPos.y} isClicking={isClicking} />
      
      <div className="p-6">
        {/* Card Header */}
        <div className="space-y-1.5 mb-6">
          <h3 className="text-xl font-bold tracking-tight text-foreground">Create New Project</h3>
          <p className="text-sm text-muted-foreground">
            Describe your project, and our AI will generate the architecture and tasks for you.
          </p>
        </div>

        {/* Card Content */}
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none text-foreground/80">
              Project Name
            </label>
            <div className="bg-secondary/30 border-0 rounded-xl h-11 px-4 flex items-center shadow-sm">
              <span className="text-sm text-foreground">RemoteSync App</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none text-foreground/80">
              What are you building?
            </label>
            <div className="min-h-[100px] bg-secondary/30 border-0 rounded-xl p-4 shadow-sm relative">
              {phase === "idle" && !text && (
                <span className="text-sm text-muted-foreground absolute pointer-events-none">
                  Describe your project features, goals, and requirements...
                </span>
              )}
              <span className="text-sm text-foreground leading-relaxed">{text}</span>
              {phase === "typing" && (
                <span className="inline-block w-1 h-4 bg-foreground ml-0.5 animate-pulse translate-y-0.5" />
              )}
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="mt-6 flex justify-end">
          <motion.button 
            className="w-full sm:w-auto h-11 px-6 bg-foreground text-background rounded-xl font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"
            animate={isClicking && phase === "clicking" ? { scale: 0.95 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{ opacity: phase === "success" ? 0.8 : 1 }}
          >
            {phase === "generating" ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-pulse" />
                Generating...
              </span>
            ) : phase === "success" ? (
              <span className="flex items-center gap-2 text-task-green">
                <CheckCircle2 className="w-4 h-4" />
                Project Generated
              </span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Project Plan
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Success Toast Overlay */}
      <AnimatePresence>
        {phase === "success" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[90%] bg-card border border-border/10 shadow-elevation4 p-4 rounded-xl flex items-start gap-3 z-20"
          >
            <div className="mt-0.5 shrink-0 bg-task-green/20 p-1.5 rounded-full">
              <Sparkles className="w-4 h-4 text-task-green" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Project Generated!</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Your architecture and tasks are ready.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

