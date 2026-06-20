import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SimulatedCursor } from "./SimulatedCursor";
import { ChevronRight, CheckCircle2 } from "lucide-react";

export const MultiplayerWalkthrough = () => {
  const [alexPhase, setAlexPhase] = useState("idle");
  const [alexPos, setAlexPos] = useState({ x: "-20%", y: "40%" });
  const [alexClicking, setAlexClicking] = useState(false);
  const [alexText, setAlexText] = useState("");

  const [sarahPhase, setSarahPhase] = useState("idle");
  const [sarahPos, setSarahPos] = useState({ x: "120%", y: "60%" });
  const [sarahClicking, setSarahClicking] = useState(false);
  const [showTaskMenu, setShowTaskMenu] = useState(false);

  const [mikePhase, setMikePhase] = useState("idle");
  const [mikePos, setMikePos] = useState({ x: "50%", y: "120%" });

  useEffect(() => {
    let isActive = true;

    const runSequence = async () => {
      if (!isActive) {return;}
      
      // Reset
      setAlexPhase("idle");
      setAlexText("");
      setAlexPos({ x: "-40%", y: "40%" });
      setSarahPhase("idle");
      setSarahPos({ x: "120%", y: "60%" });
      setShowTaskMenu(false);
      setMikePhase("idle");
      setMikePos({ x: "50%", y: "120%" });
      
      await new Promise(r => setTimeout(r, 1200));

      // 1. Alex moves in to type
      if (!isActive) {return;}
      setAlexPos({ x: "13%", y: "65%" }); // Positioned at the end of the green typing block
      setAlexPhase("typing");
      
      // Sarah moves in right after
      setSarahPos({ x: "13%", y: "77%" }); // Over the purple block
      setMikePos({ x: "60%", y: "90%" }); // Mike hovers the orange bottom block

      await new Promise(r => setTimeout(r, 800));

      // Alex types
      if (!isActive) {return;}
      const fullText = "The auth module must support OAuth2.";
      for (let i = 0; i <= fullText.length; i++) {
        if (!isActive) {break;}
        setAlexText(fullText.slice(0, i));
        // Slowly move Alex cursor to the right as they type
        setAlexPos(prev => ({ ...prev, x: `${13 + (i * 1.8)}%` }));
        await new Promise(r => setTimeout(r, 40 + Math.random() * 40));
      }
      
      await new Promise(r => setTimeout(r, 400));

      // 2. Sarah opens task slash menu
      if (!isActive) {return;}
      setSarahPhase("menu");
      setSarahClicking(true);
      await new Promise(r => setTimeout(r, 150));
      setSarahClicking(false);
      setShowTaskMenu(true);
      
      await new Promise(r => setTimeout(r, 700));

      // 3. Sarah moves down to click a task
      if (!isActive) {return;}
      setSarahPos({ x: "30%", y: "97%" }); // Move to slash menu item
      await new Promise(r => setTimeout(r, 600));
      setSarahClicking(true);
      await new Promise(r => setTimeout(r, 150));
      setSarahClicking(false);
      
      if (!isActive) {return;}
      setShowTaskMenu(false);
      setSarahPhase("inserted");
      
      // Move Sarah cursor away slightly to the end of the tag
      setSarahPos({ x: "73%", y: "75%" });
      setAlexPos({ x: "77%", y: "65%" });

      await new Promise(r => setTimeout(r, 2000));

      // Exit
      setAlexPos({ x: "-40%", y: "40%" });
      setSarahPos({ x: "120%", y: "60%" });
      setMikePos({ x: "50%", y: "120%" });
      
      await new Promise(r => setTimeout(r, 1500));
      if (isActive) {runSequence();}
    };

    runSequence();
    return () => { isActive = false; };
  }, []);

  return (
    <div className="relative w-full max-w-[460px] bg-card/80 backdrop-blur-xl border border-border/10 shadow-elevation5 rounded-2xl flex flex-col font-sans overflow-hidden mx-auto h-[380px]">
      {/* Background glow for premium feel */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-foreground/5 to-transparent pointer-events-none" />

      {/* Simulated Cursors */}
      <SimulatedCursor x={alexPos.x} y={alexPos.y} isClicking={alexClicking} name="Alex" color="hsl(var(--task-green))" />
      <SimulatedCursor x={sarahPos.x} y={sarahPos.y} isClicking={sarahClicking} name="Sarah" color="hsl(var(--task-purple))" />
      <SimulatedCursor x={mikePos.x} y={mikePos.y} isClicking={false} name="Mike" color="hsl(var(--task-orange))" />

      {/* Top Bar */}
      <div className="h-12 shrink-0 flex items-center px-5 border-b border-border/10 bg-secondary/20 relative z-10">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <span>My Notes</span>
          <ChevronRight size={14} className="text-border/50" />
          <span className="text-foreground">Project Specs</span>
        </div>
      </div>

      {/* Editor Canvas */}
      <div className="flex-1 p-6 relative z-10">
        {/* EditorHeader */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex -space-x-1.5">
            <div className="w-7 h-7 rounded-full bg-task-green flex items-center justify-center border-[2.5px] border-card shadow-sm z-30">
              <span className="text-[10px] text-background font-bold">A</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-task-purple flex items-center justify-center border-[2.5px] border-card shadow-sm z-20">
              <span className="text-[10px] text-background font-bold">S</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-task-orange flex items-center justify-center border-[2.5px] border-card shadow-sm z-10">
              <span className="text-[10px] text-background font-bold">M</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/30 px-2 py-1 rounded-md border border-border/10">
            <CheckCircle2 size={12} className="text-task-green" />
            <span className="text-task-green font-medium">Saved</span>
          </div>
        </div>

        <h1 className="text-[28px] font-bold text-foreground tracking-tight leading-tight mb-5">
          Project Specs
        </h1>

        {/* Blocks */}
        <div className="space-y-2.5 text-[15px] leading-relaxed text-muted-foreground">
          
          {/* Static block */}
          <div className="py-1 px-1">
            <p>Please review the architecture and add missing tasks.</p>
          </div>

          {/* Block active by Alex */}
          <div className="relative py-1.5 px-3 border-l-[3px] border-task-green bg-task-green/5 rounded-r-md transition-colors">
            <p className="text-foreground">
              {alexText}
              {alexPhase === "typing" && <span className="inline-block w-[2px] h-[1em] bg-task-green ml-0.5 animate-pulse translate-y-0.5" />}
            </p>
          </div>

          {/* Block active by Sarah */}
          <div className="relative py-1.5 px-3 border-l-[3px] border-task-purple bg-task-purple/5 rounded-r-md min-h-[36px] flex items-center transition-colors">
            {sarahPhase === "inserted" ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground bg-background border border-border/10 shadow-sm px-2 py-0.5 rounded-md">
                Implement SSO 
                <span className="text-muted-foreground text-[11px] bg-secondary px-1.5 py-0.5 rounded font-mono">ENG-88</span>
              </span>
            ) : sarahPhase === "menu" ? (
              <span className="text-muted-foreground/80 font-medium bg-secondary/50 px-1.5 rounded">/task</span>
            ) : (
              <span className="text-muted-foreground/30 opacity-0">...</span>
            )}

            {/* Inline Task Slash Menu Simulation */}
            <AnimatePresence>
              {showTaskMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-full left-0 mt-1.5 w-52 bg-card border border-border/10 shadow-elevation4 rounded-xl overflow-hidden z-20"
                >
                  <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/5 bg-secondary/10">
                    Link Task
                  </div>
                  <div className="p-1.5">
                    <div className="px-2.5 py-2 text-[13px] text-foreground bg-secondary/60 rounded-md cursor-pointer flex flex-col gap-0.5">
                      <span className="font-medium">Implement SSO</span>
                      <span className="text-[10px] text-muted-foreground font-mono">ENG-88</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Block active by Mike */}
          <div className="relative py-1.5 px-3 border-l-[3px] border-task-orange bg-task-orange/5 rounded-r-md mt-4 transition-colors">
            <p>Database migrations are scheduled for Friday.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
