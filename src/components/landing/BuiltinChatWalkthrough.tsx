import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { SimulatedCursor } from './SimulatedCursor';
import { Paperclip, Send, Smile, CheckCheck } from 'lucide-react';

export const BuiltinChatWalkthrough = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let active = true;
    const sequence = async () => {
      if (!active) return;
      setStep(0);
      await new Promise(r => setTimeout(r, 1000));
      if (!active) return;
      setStep(1); // Cursor moves to input
      await new Promise(r => setTimeout(r, 800));
      if (!active) return;
      setStep(2); // Typing starts
      await new Promise(r => setTimeout(r, 2000));
      if (!active) return;
      setStep(3); // Clicks send
      await new Promise(r => setTimeout(r, 600));
      if (!active) return;
      setStep(4); // Message sent
      await new Promise(r => setTimeout(r, 3000));
      if (!active) return;
      sequence(); // Loop
    };
    sequence();
    return () => {
      active = false;
    };
  }, []);

  const textToType = "The new design looks amazing! 🚀";

  return (
    <div className="relative w-full max-w-sm aspect-[4/3] bg-surface-glass-regular backdrop-blur-regular border border-border/10 rounded-xl overflow-hidden shadow-elevation3 mx-auto flex flex-col">
      {/* Header (Mirrors ChatView Avatar & Status) */}
      <div className="flex items-center gap-2 p-3 border-b border-border/10 bg-secondary/30 relative z-10">
        <div className="relative">
          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
            SC
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-background bg-task-green" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-foreground leading-tight">Sarah Chen</span>
          <span className="text-[8px] text-muted-foreground leading-tight">online</span>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 p-3 space-y-3 relative overflow-hidden bg-background/50 flex flex-col justify-end pb-12">
        <div className="absolute inset-0 bg-gradient-to-tr from-task-teal/5 to-transparent pointer-events-none" />
        
        {/* Received Message */}
        <div className="flex gap-2 justify-start relative z-10">
          <div className="w-5 h-5 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-[7px] font-bold text-foreground mt-auto">SC</div>
          <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-bl-sm px-2.5 py-1.5 max-w-[75%] shadow-sm">
            <p className="text-[8px] leading-relaxed">Hey! Did you check the mockups for the landing page?</p>
            <div className="text-[6px] text-muted-foreground mt-0.5 text-right">10:42 AM</div>
          </div>
        </div>

        {/* New Message Bubble */}
        <AnimatePresence>
          {step >= 4 && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-2 justify-end relative z-10"
            >
              <div className="bg-foreground text-background rounded-2xl rounded-br-sm px-2.5 py-1.5 max-w-[75%] shadow-sm">
                <p className="text-[8px] font-medium leading-relaxed">{textToType}</p>
                <div className="text-[6px] text-background/70 mt-0.5 flex justify-end items-center gap-0.5">
                  10:45 AM <CheckCheck className="w-2 h-2 text-blue-500" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area (Mirrors ChatView Form) */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-background/80 backdrop-blur-md border-t border-border/10">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            <div className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary/50">
              <Paperclip className="w-3 h-3" />
            </div>
            <div className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary/50">
              <Smile className="w-3 h-3" />
            </div>
          </div>
          
          <div className="flex-1 h-6 bg-secondary/30 border border-border/20 rounded-md relative flex items-center px-2 overflow-hidden">
            {step === 0 || step === 1 ? (
              <span className="text-[8px] text-muted-foreground">Type a message...</span>
            ) : null}
            {step >= 2 && step < 4 && (
              <motion.span 
                initial={{ clipPath: 'inset(0 100% 0 0)' }}
                animate={{ clipPath: 'inset(0 0% 0 0)' }}
                transition={{ duration: 1.8, ease: "linear" }}
                className="text-[8px] text-foreground font-medium whitespace-nowrap"
              >
                {textToType}
              </motion.span>
            )}
          </div>
          
          <motion.div 
            animate={{ scale: step === 3 ? 0.9 : 1 }}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${step >= 2 && step < 4 ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-muted-foreground'}`}
          >
            <Send className="w-3 h-3" />
          </motion.div>
        </div>
      </div>

      {/* Simulated Cursor */}
      {(() => {
        const cursorPos = 
          step === 0 ? { x: "85%", y: "85%" } :
          step === 1 ? { x: "50%", y: "90%" } : // Click input
          step === 2 ? { x: "50%", y: "90%" } : // Typing
          step === 3 ? { x: "92%", y: "90%" } : // Click send
          step === 4 ? { x: "120%", y: "120%" } : // Leave
          { x: "85%", y: "85%" };
        return (
          <SimulatedCursor 
            x={cursorPos.x}
            y={cursorPos.y}
            isClicking={step === 1 || step === 3}
          />
        );
      })()}
    </div>
  );
};
