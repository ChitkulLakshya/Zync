import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SimulatedCursor } from "./SimulatedCursor";
import { Sparkles, List, CheckSquare, FileText, ArrowRight } from "lucide-react";

type WalkthroughState = "idle" | "typing" | "clicking" | "generating" | "result";

export const ProjectSetupWalkthrough = () => {
  const [phase, setPhase] = useState<WalkthroughState>("idle");
  const [text, setText] = useState("");
  const fullText = "E-commerce platform with Stripe";
  const [cursorPos, setCursorPos] = useState({ x: "85%", y: "85%" });
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    let isActive = true;

    const runSequence = async () => {
      // 1. Initial State
      if (!isActive) return;
      setPhase("idle");
      setText("");
      setCursorPos({ x: "85%", y: "85%" });
      setIsClicking(false);
      
      await new Promise(r => setTimeout(r, 1200));
      
      // 2. Move to text area
      if (!isActive) return;
      setCursorPos({ x: "30%", y: "45%" });
      await new Promise(r => setTimeout(r, 600));
      setIsClicking(true);
      await new Promise(r => setTimeout(r, 150));
      setIsClicking(false);
      
      // 3. Type
      if (!isActive) return;
      setPhase("typing");
      for (let i = 0; i <= fullText.length; i++) {
        if (!isActive) break;
        setText(fullText.slice(0, i));
        await new Promise(r => setTimeout(r, 40 + Math.random() * 40));
      }
      
      await new Promise(r => setTimeout(r, 500));
      
      // 4. Move to Generate button
      if (!isActive) return;
      setCursorPos({ x: "75%", y: "78%" });
      setPhase("clicking");
      await new Promise(r => setTimeout(r, 600));
      setIsClicking(true);
      await new Promise(r => setTimeout(r, 150));
      setIsClicking(false);
      
      // 5. Generating state
      if (!isActive) return;
      setPhase("generating");
      setCursorPos({ x: "120%", y: "120%" }); // Move out of view
      await new Promise(r => setTimeout(r, 1800));
      
      // 6. Result morph
      if (!isActive) return;
      setPhase("result");
      await new Promise(r => setTimeout(r, 4000));
      
      // Loop
      if (isActive) runSequence();
    };
    
    runSequence();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="relative w-full max-w-sm aspect-[4/3] bg-surface-glass-regular backdrop-blur-regular border border-border/10 rounded-xl overflow-hidden shadow-elevation3 mx-auto">
      <SimulatedCursor x={cursorPos.x} y={cursorPos.y} isClicking={isClicking} />
      
      <AnimatePresence mode="wait">
        {phase !== "result" ? (
          <motion.div 
            key="setup"
            className="p-5 h-full flex flex-col relative"
            exit={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Header */}
            <div className="space-y-1 mb-4">
              <h3 className="text-base font-semibold ">Create New Project</h3>
              <p className="text-[10px] text-muted-foreground">Describe your project for AI generation</p>
            </div>
            
            {/* Form Replica */}
            <div className="space-y-3 flex-1">
              <div className="space-y-1.5">
                <div className="text-[10px] font-medium leading-none text-foreground/80">
                  Project Name
                </div>
                <div className="h-7 w-full border border-border/10 rounded-md bg-background/50 px-3 flex items-center shadow-sm">
                  <span className="text-[10px] text-foreground font-medium">Acme Store</span>
                </div>
              </div>
              
              <div className="space-y-1.5 flex-1">
                <div className="text-[10px] font-medium leading-none text-foreground/80">
                  What are you building?
                </div>
                <div className="w-full h-16 border border-border/10 rounded-md bg-background/50 p-2 relative shadow-sm">
                  {phase === "idle" && !text && (
                    <span className="text-[10px] text-muted-foreground absolute pointer-events-none">Describe features...</span>
                  )}
                  <span className="text-[10px] text-foreground leading-relaxed">{text}</span>
                  {phase === "typing" && (
                    <span className="inline-block w-1 h-3 bg-primary ml-0.5 animate-pulse translate-y-0.5" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Button */}
            <div className="mt-4 flex justify-end">
              <motion.button 
                className="bg-primary text-primary-foreground text-[10px] px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 shadow-elevation1"
                animate={isClicking && phase === "clicking" ? { scale: 0.95 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }} // snappy spring
              >
                {phase === "generating" ? "Generating..." : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Generate Plan
                    <ArrowRight className="w-3 h-3 ml-0.5" />
                  </>
                )}
              </motion.button>
            </div>
            
            {/* Loading Overlay */}
            {phase === "generating" && (
              <motion.div 
                className="absolute inset-0 bg-background/40 backdrop-blur-sm flex items-center justify-center rounded-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex flex-col items-center gap-3 bg-card p-4 rounded-xl shadow-elevation4 border border-border/10">
                  <Sparkles className="w-5 h-5 text-foreground animate-pulse-glow" />
                  <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="result"
            className="p-4 h-full bg-surface-glass-thin flex flex-col gap-3"
            initial={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.4, type: "spring", stiffness: 260, damping: 28 }} // smooth spring
          >
            <div className="flex items-center justify-between pb-2 border-b border-border/30">
              <h3 className="text-xs font-semibold flex items-center gap-1.5">
                <List className="w-3.5 h-3.5 text-foreground" />
                Generated Plan
              </h3>
              <div className="text-[9px] bg-task-green/10 text-task-green px-2 py-0.5 rounded-full font-medium tracking-wide">
                READY
              </div>
            </div>
            
            <div className="flex gap-3 h-full overflow-hidden">
              {/* Architecture Tree */}
              <div className="flex-[0.8] space-y-2 border-r border-border/30 pr-2">
                <div className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Stack
                </div>
                {[
                  { icon: "📁", name: "components", level: 0 },
                  { icon: "📄", name: "Auth.tsx", level: 1 },
                  { icon: "📁", name: "api/stripe", level: 0 },
                  { icon: "📄", name: "webhook.ts", level: 1 },
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    className="flex items-center gap-1.5 text-[10px] text-foreground/90"
                    style={{ paddingLeft: `${item.level * 8}px` }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + (i * 0.05) }}
                  >
                    <span className="opacity-70">{item.icon}</span>
                    <span className="truncate">{item.name}</span>
                  </motion.div>
                ))}
              </div>
              
              {/* Kanban Mini */}
              <div className="flex-1 space-y-2">
                <div className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <CheckSquare className="w-3 h-3" /> Tasks
                </div>
                <div className="bg-background/40 rounded-md p-1.5 space-y-1.5 border border-border/20">
                  <div className="text-[8px] text-muted-foreground mb-0.5 uppercase tracking-wider font-semibold">To Do</div>
                  {[
                    "Configure Next.js",
                    "Add Stripe Elements",
                    "Login UI"
                  ].map((task, i) => (
                    <motion.div
                      key={task}
                      className="bg-card text-[9px] p-1.5 rounded shadow-elevation1 border border-border/30 text-foreground/90 leading-tight"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        delay: 0.4 + (i * 0.08), 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 24 
                      }}
                    >
                      {task}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
