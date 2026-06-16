import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { SimulatedCursor } from './SimulatedCursor';
import { MessageSquare, Send } from 'lucide-react';

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

  const textToType = "Hey team, the new design is ready for review!";

  return (
    <div className="relative w-full max-w-sm aspect-[4/3] bg-background/50 backdrop-blur-md rounded-2xl border-0 overflow-hidden shadow-sm" style={{ boxShadow: 'var(--shadow-sm), var(--glass-bevel)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border/10 bg-secondary/20">
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
          <MessageSquare className="w-3 h-3 text-foreground" />
        </div>
        <span className="text-xs font-semibold text-foreground/80"># design-team</span>
      </div>

      {/* Chat History */}
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-task-pink/20" />
          <div className="bg-secondary/40 rounded-lg p-2 max-w-[80%]">
            <div className="w-24 h-2 bg-foreground/20 rounded mb-1.5" />
            <div className="w-16 h-2 bg-foreground/10 rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-task-teal/20" />
          <div className="bg-secondary/40 rounded-lg p-2 max-w-[80%]">
            <div className="w-32 h-2 bg-foreground/20 rounded mb-1.5" />
            <div className="w-20 h-2 bg-foreground/10 rounded" />
          </div>
        </div>

        {/* New Message Bubble */}
        <AnimatePresence>
          {step >= 4 && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-2 justify-end"
            >
              <div className="bg-primary/90 rounded-lg rounded-br-sm p-2.5 max-w-[80%] shadow-sm">
                <p className="text-[10px] text-background font-medium">{textToType}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-background/80 backdrop-blur-md border-t border-border/10">
        <div className="flex items-center gap-2 bg-secondary/40 rounded-full px-3 py-1.5 border-0" style={{ boxShadow: 'var(--glass-bevel)' }}>
          <div className="flex-1 h-4 relative flex items-center">
            {step === 0 || step === 1 ? (
              <span className="text-[10px] text-muted-foreground/50 absolute">Type a message...</span>
            ) : null}
            {step >= 2 && step < 4 && (
              <motion.span 
                initial={{ clipPath: 'inset(0 100% 0 0)' }}
                animate={{ clipPath: 'inset(0 0% 0 0)' }}
                transition={{ duration: 1.8, ease: "linear" }}
                className="text-[10px] text-foreground/80"
              >
                {textToType}
              </motion.span>
            )}
          </div>
          <motion.div 
            animate={{ scale: step === 3 ? 0.9 : 1, backgroundColor: step >= 2 && step < 4 ? 'var(--primary)' : 'transparent' }}
            className={`w-6 h-6 rounded-full flex items-center justify-center ${step >= 2 && step < 4 ? 'bg-primary' : 'bg-foreground/10'}`}
          >
            <Send className={`w-3 h-3 ${step >= 2 && step < 4 ? 'text-background' : 'text-foreground/40'}`} />
          </motion.div>
        </div>
      </div>

      {/* Simulated Cursor */}
      {(() => {
        const cursorPos = 
          step === 0 ? { x: 50, y: 180 } :
          step === 1 ? { x: 100, y: 155 } : // Click input
          step === 2 ? { x: 100, y: 155 } : // Typing
          step === 3 ? { x: 260, y: 155 } : // Click send
          step === 4 ? { x: 260, y: 155 } :
          { x: 50, y: 180 };
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
