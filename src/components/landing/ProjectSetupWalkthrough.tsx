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
      setCursorPos({ x: "77%", y: "89%" });
      setPhase("clicking");
      await new Promise(r => setTimeout(r, 700));
      setIsClicking(true);
      await new Promise(r => setTimeout(r, 150));
      setIsClicking(false);
      
      // 5. Generating state
      if (!isActive) {return;}
      setPhase("generating");
      setCursorPos({ x: "85%", y: "110%" });
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
  }, []);

  return (
    <div className="relative w-full max-w-[420px] mx-auto font-sans">
      <SimulatedCursor x={cursorPos.x} y={cursorPos.y} isClicking={isClicking} />
      
      {/* Exact replica using real components */}
      <Card className="bg-secondary/5 border-border/10 shadow-2xl rounded-[2rem] overflow-hidden pointer-events-none">
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
          <CardDescription>
            Describe your project, and our AI will generate the architecture and tasks for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Project Name
            </label>
            <Input
              placeholder="e.g., E-commerce Platform"
              value="RemoteSync App"
              readOnly
              className="bg-secondary/30 border-0 focus-visible:ring-1 focus-visible:ring-border rounded-xl h-12 px-4"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              What are you building?
            </label>
            <div className="relative">
              <Textarea
                placeholder="Describe your project features, goals, and requirements..."
                className="min-h-[150px] resize-none bg-secondary/30 border-0 focus-visible:ring-1 focus-visible:ring-border rounded-xl p-4 relative z-10 bg-transparent"
                value={text}
                readOnly
              />
              {/* Fake typing caret */}
              {phase === "typing" && (
                <div className="absolute top-4 left-4 z-20 pointer-events-none w-full h-full">
                  <span className="invisible whitespace-pre-wrap font-sans text-sm">{text}</span>
                  <span className="inline-block w-1 h-4 bg-foreground animate-pulse translate-y-0.5" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <motion.div animate={isClicking && phase === "clicking" ? { scale: 0.95 } : { scale: 1 }}>
            <Button
              size="lg"
              className="w-full sm:w-auto rounded-xl"
              disabled={phase === "generating"}
            >
              {phase === "generating" ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                  Generating...
                </>
              ) : phase === "success" ? (
                <span className="flex items-center text-task-green gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Project Generated
                </span>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Project Plan
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

