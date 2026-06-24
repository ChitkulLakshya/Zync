import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SimulatedCursor } from "./SimulatedCursor";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type WalkthroughState = "idle" | "typing" | "clicking" | "generating" | "success";

export const ProjectSetupWalkthrough = () => {
  const [phase, setPhase] = useState<WalkthroughState>("idle");
  const [text, setText] = useState("");
  const fullText = "A real-time dashboard for remote teams with live chat and task tracking.";
  const [cursorPos, setCursorPos] = useState({ x: "60%", y: "95%" });
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
      // 1. Initial State
      if (!isActive) {return;}
      setPhase("idle");
      setText("");
      setCursorPos({ x: "40%", y: "37%" });
      setIsClicking(false);
      
      await new Promise(r => setTimeout(r, 800));
      
      // 2. Move to text area
      if (!isActive) {return;}
      setCursorPos({ x: "30%", y: "58%" });
      await new Promise(r => setTimeout(r, 800));
      setIsClicking(true);
      await new Promise(r => setTimeout(r, 150));
      setIsClicking(false);
      
      // 3. Type
      if (!isActive) {return;}
      setPhase("typing");
      for (let i = 0; i <= fullText.length; i++) {
        if (!isActive) {break;}
        setText(fullText.slice(0, i));
        const typingDelay = 20 + Math.random() * 40 + (fullText[i] === " " ? 40 : 0);
        await new Promise(r => setTimeout(r, typingDelay));
      }
      
      await new Promise(r => setTimeout(r, 600));
      
      // 4. Move to Generate button
      if (!isActive) {return;}
      // Slightly different target based on screen size so it perfectly hits the button
      setCursorPos({ x: isMobile ? "50%" : "77%", y: isMobile ? "85%" : "89%" });
      setPhase("clicking");
      await new Promise(r => setTimeout(r, 700));
      setIsClicking(true);
      await new Promise(r => setTimeout(r, 150));
      setIsClicking(false);
      
      // 5. Generating state
      if (!isActive) {return;}
      setPhase("generating");
      // Prevent cursor from overlapping the section below by keeping it inside the card
      setCursorPos({ x: isMobile ? "60%" : "85%", y: isMobile ? "92%" : "95%" });
      await new Promise(r => setTimeout(r, 2000));
      
      // 6. Success state
      if (!isActive) {return;}
      setPhase("success");
      await new Promise(r => setTimeout(r, 3500));
      
      if (isActive) {runSequence();}
    };
    
    runSequence();

    return () => {
      isActive = false;
    };
  }, [isMobile]);

  return (
    <div className="relative w-full max-w-[420px] mx-auto font-sans">
      <SimulatedCursor x={cursorPos.x} y={cursorPos.y} isClicking={isClicking} />
      
      {/* Exact replica using real components */}
      <Card className="bg-secondary/5 border-border/10 shadow-elevation5 rounded-3xl sm:rounded-[2rem] overflow-hidden pointer-events-none">
        <CardHeader className="p-5 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl">Create New Project</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Describe your project, and our AI will generate the architecture and tasks for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-5 pt-0 sm:p-6 sm:pt-0">
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Project Name
            </label>
            <Input
              placeholder="e.g., E-commerce Platform"
              value="RemoteSync App"
              readOnly
              className="bg-black/5 dark:bg-black/40 border border-border/10 shadow-inner focus-visible:ring-1 focus-visible:ring-border rounded-xl h-10 sm:h-12 px-3 sm:px-4 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              What are you building?
            </label>
            <div className="relative">
              <Textarea
                placeholder="Describe your project features, goals, and requirements..."
                className="min-h-[120px] sm:min-h-[150px] resize-none bg-black/5 dark:bg-black/40 border border-border/10 shadow-inner focus-visible:ring-1 focus-visible:ring-border rounded-xl p-3 sm:p-4 relative z-10 text-sm"
                value={text}
                readOnly
              />
              {/* Fake typing caret */}
              {phase === "typing" && (
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-none w-[calc(100%-24px)] h-[calc(100%-24px)]">
                  <span className="invisible whitespace-pre-wrap font-sans text-sm">{text}</span>
                  <span className="inline-block w-1 h-4 bg-foreground animate-pulse translate-y-0.5" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end p-5 sm:p-6 pt-0 sm:pt-0">
          <motion.div className="w-full sm:w-auto" animate={isClicking && phase === "clicking" ? { scale: 0.95 } : { scale: 1 }}>
            <Button
              size={isMobile ? "default" : "lg"}
              className="w-full sm:w-auto rounded-xl transition-all"
              disabled={phase === "generating"}
            >
              {phase === "generating" ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                  <span className="text-sm sm:text-base">Generating...</span>
                </>
              ) : phase === "success" ? (
                <span className="flex items-center text-task-green gap-2 text-sm sm:text-base">
                  <CheckCircle2 className="h-4 w-4" />
                  Project Generated
                </span>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  <span className="text-sm sm:text-base">Generate Project Plan</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>
        </CardFooter>
      </Card>

      {/* Success Toast Overlay */}
      <AnimatePresence>
        {phase === "success" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-12 sm:bottom-20 left-1/2 -translate-x-1/2 w-[90%] bg-card border border-border/10 shadow-elevation4 p-3 sm:p-4 rounded-xl flex items-start gap-3 z-20"
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


