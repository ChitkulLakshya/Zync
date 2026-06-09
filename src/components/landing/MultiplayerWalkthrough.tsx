import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SimulatedCursor } from "./SimulatedCursor";
import { MessageSquare, FileText, CheckCircle2 } from "lucide-react";

export const MultiplayerWalkthrough = () => {
  // Cursor 1: Alex (Green) - types a comment
  const [alexPhase, setAlexPhase] = useState("idle");
  const [alexPos, setAlexPos] = useState({ x: "-10%", y: "40%" });
  const [alexClicking, setAlexClicking] = useState(false);
  const [commentText, setCommentText] = useState("");

  // Cursor 2: Sarah (Purple) - moves a sticky note/task
  const [sarahPhase, setSarahPhase] = useState("idle");
  const [sarahPos, setSarahPos] = useState({ x: "110%", y: "80%" });
  const [sarahClicking, setSarahClicking] = useState(false);
  const [taskPos, setTaskPos] = useState({ x: 0, y: 0 });

  // Cursor 3: Mike (Orange) - highlights text
  const [mikePhase, setMikePhase] = useState("idle");
  const [mikePos, setMikePos] = useState({ x: "50%", y: "-10%" });
  const [mikeClicking, setMikeClicking] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    let isActive = true;

    // --- ALEX TIMELINE ---
    const runAlex = async () => {
      while (isActive) {
        setAlexPhase("idle");
        setAlexPos({ x: "-10%", y: "40%" });
        setCommentText("");
        await new Promise(r => setTimeout(r, 1500));

        if (!isActive) break;
        setAlexPos({ x: "15%", y: "75%" }); // Move to comment box
        await new Promise(r => setTimeout(r, 800));

        if (!isActive) break;
        setAlexClicking(true);
        await new Promise(r => setTimeout(r, 200));
        setAlexClicking(false);

        if (!isActive) break;
        setAlexPhase("typing");
        const fullText = "Looks good to me! 👍";
        for (let i = 0; i <= fullText.length; i++) {
          if (!isActive) break;
          setCommentText(fullText.slice(0, i));
          await new Promise(r => setTimeout(r, 50 + Math.random() * 40));
        }

        if (!isActive) break;
        await new Promise(r => setTimeout(r, 800));
        setAlexPos({ x: "42%", y: "75%" }); // Click post
        await new Promise(r => setTimeout(r, 400));
        setAlexClicking(true);
        await new Promise(r => setTimeout(r, 200));
        setAlexClicking(false);
        setAlexPhase("posted");

        await new Promise(r => setTimeout(r, 2000));
        setAlexPos({ x: "-10%", y: "40%" });
        await new Promise(r => setTimeout(r, 2000));
      }
    };

    // --- SARAH TIMELINE ---
    const runSarah = async () => {
      while (isActive) {
        setSarahPhase("idle");
        setSarahPos({ x: "110%", y: "80%" });
        setTaskPos({ x: 0, y: 0 });
        await new Promise(r => setTimeout(r, 500));

        if (!isActive) break;
        setSarahPos({ x: "75%", y: "30%" }); // Move to task
        await new Promise(r => setTimeout(r, 1000));

        if (!isActive) break;
        setSarahClicking(true);
        setSarahPhase("grabbing");
        await new Promise(r => setTimeout(r, 300));

        if (!isActive) break;
        setSarahPos({ x: "75%", y: "60%" }); // Drag down
        setSarahPhase("dragging");
        await new Promise(r => setTimeout(r, 800));

        if (!isActive) break;
        setSarahClicking(false);
        setSarahPhase("dropped");
        await new Promise(r => setTimeout(r, 500));

        setSarahPos({ x: "110%", y: "80%" });
        await new Promise(r => setTimeout(r, 3500));
      }
    };

    // --- MIKE TIMELINE ---
    const runMike = async () => {
      while (isActive) {
        setMikePhase("idle");
        setMikePos({ x: "50%", y: "-10%" });
        setIsHighlighted(false);
        await new Promise(r => setTimeout(r, 2500));

        if (!isActive) break;
        setMikePos({ x: "10%", y: "30%" }); // Move to text start
        await new Promise(r => setTimeout(r, 800));

        if (!isActive) break;
        setMikeClicking(true);
        await new Promise(r => setTimeout(r, 200));

        if (!isActive) break;
        setMikePos({ x: "60%", y: "30%" }); // Drag across text
        setIsHighlighted(true); // Assuming highlight follows cursor roughly, we'll just trigger CSS animation
        await new Promise(r => setTimeout(r, 800));

        if (!isActive) break;
        setMikeClicking(false);
        await new Promise(r => setTimeout(r, 1000));

        setMikePos({ x: "50%", y: "-10%" });
        await new Promise(r => setTimeout(r, 2500));
      }
    };

    runAlex();
    runSarah();
    runMike();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="relative w-full max-w-sm aspect-[4/3] bg-surface-glass-regular backdrop-blur-regular border border-border/10 rounded-xl overflow-hidden shadow-elevation3 mx-auto flex flex-col">
      {/* Cursors */}
      <SimulatedCursor x={alexPos.x} y={alexPos.y} isClicking={alexClicking} name="Alex" color="hsl(var(--task-green))" />
      <SimulatedCursor x={sarahPos.x} y={sarahPos.y} isClicking={sarahClicking} name="Sarah" color="hsl(var(--task-purple))" />
      <SimulatedCursor x={mikePos.x} y={mikePos.y} isClicking={mikeClicking} name="Mike" color="hsl(var(--task-orange))" />
      
      {/* UI Replica */}
      <div className="flex items-center gap-2 h-8 px-3 border-b border-border/30 bg-secondary/20">
        <FileText className="w-3.5 h-3.5 text-foreground" />
        <span className="text-[10px] font-semibold text-foreground">Project Specs.md</span>
        <div className="ml-auto flex -space-x-1">
          <div className="w-4 h-4 rounded-full bg-task-green flex items-center justify-center border border-background shadow-sm z-30">
            <span className="text-[6px] text-white font-bold">A</span>
          </div>
          <div className="w-4 h-4 rounded-full bg-task-purple flex items-center justify-center border border-background shadow-sm z-20">
            <span className="text-[6px] text-white font-bold">S</span>
          </div>
          <div className="w-4 h-4 rounded-full bg-task-orange flex items-center justify-center border border-background shadow-sm z-10">
            <span className="text-[6px] text-white font-bold">M</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 flex gap-4 bg-background/40 relative">
        {/* Left: Document Content */}
        <div className="flex-[2] space-y-3">
          <div className="h-4 w-3/4 bg-muted/50 rounded" />
          <div className="space-y-1.5">
            <div className="h-2 w-full bg-muted/30 rounded" />
            <div className="h-2 w-[90%] bg-muted/30 rounded" />
            <div className="h-2 w-[80%] bg-muted/30 rounded" />
          </div>
          
          <div className="pt-2">
            <div className="text-[9px] text-foreground/80 leading-relaxed font-medium relative inline-block">
              {/* Highlight background layer */}
              <motion.div 
                className="absolute inset-0 bg-task-orange/20 -z-10 rounded-sm"
                initial={{ width: 0 }}
                animate={{ width: isHighlighted ? "100%" : 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
              The authentication module must support OAuth2 and SSO by Q3.
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="h-2 w-full bg-muted/30 rounded" />
            <div className="h-2 w-[60%] bg-muted/30 rounded" />
          </div>

          {/* Comment Box */}
          <div className="mt-4 border border-border/10 rounded-lg bg-card p-2 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare className="w-3 h-3 text-task-green" />
              <span className="text-[8px] font-semibold">Discussion</span>
            </div>
            
            <AnimatePresence>
              {alexPhase === "posted" && (
                <motion.div 
                  className="mb-2 flex gap-1.5"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-task-green flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[5px] text-white font-bold">A</span>
                  </div>
                  <div className="bg-secondary/40 rounded p-1.5 text-[8px] text-foreground/90">
                    Looks good to me! 👍
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2">
              <div className="flex-1 bg-background border border-border/10 rounded px-2 py-1 text-[8px] text-foreground relative h-6">
                {alexPhase === "typing" && (
                  <>
                    <span>{commentText}</span>
                    <span className="inline-block w-0.5 h-2 bg-task-green ml-0.5 animate-pulse translate-y-0.5" />
                  </>
                )}
                {alexPhase === "idle" && (
                  <span className="text-muted-foreground">Add a comment...</span>
                )}
              </div>
              <motion.button 
                className="bg-secondary/20 text-foreground px-2 rounded text-[8px] font-medium"
                animate={(alexClicking && alexPos.x === "42%") ? { scale: 0.9 } : { scale: 1 }}
              >
                Post
              </motion.button>
            </div>
          </div>
        </div>

        {/* Right: Floating tasks/notes */}
        <div className="flex-1 border-l border-border/30 pl-3 relative">
           <div className="text-[7px] uppercase font-bold text-muted-foreground mb-2">Linked Tasks</div>
           
           <div className="bg-card border border-border/10 rounded p-1.5 shadow-sm mb-2 opacity-60">
             <div className="text-[7px] font-medium leading-tight">Design auth flow</div>
             <div className="flex items-center gap-1 mt-1">
               <CheckCircle2 className="w-2 h-2 text-task-green" />
               <span className="text-[6px] text-muted-foreground">Done</span>
             </div>
           </div>

           <motion.div 
             className="bg-card border border-task-purple/40 rounded p-1.5 shadow-elevation1 relative z-20"
             animate={
               sarahPhase === "dragging" 
                ? { y: 60, scale: 1.05, boxShadow: "0 12px 24px rgba(168, 85, 247, 0.15)", rotate: -2 }
                : sarahPhase === "grabbing"
                  ? { scale: 1.05, boxShadow: "0 8px 16px rgba(168, 85, 247, 0.1)" }
                  : sarahPhase === "dropped"
                    ? { y: 60, scale: 1, rotate: 0 }
                    : { y: 0, scale: 1, rotate: 0 }
             }
             transition={
               sarahPhase === "dragging" ? { duration: 0.8, ease: "easeInOut" } : { type: "spring", stiffness: 300, damping: 25 }
             }
           >
             <div className="text-[7px] font-medium leading-tight">Implement SSO</div>
             <div className="flex justify-between items-center mt-1">
                <span className="text-[5px] bg-secondary px-1 py-0.5 rounded text-muted-foreground">ENG-88</span>
                <div className="w-2.5 h-2.5 rounded-full bg-task-purple flex items-center justify-center">
                  <span className="text-[4px] text-white font-bold">S</span>
                </div>
             </div>
           </motion.div>
        </div>
      </div>
    </div>
  );
};
