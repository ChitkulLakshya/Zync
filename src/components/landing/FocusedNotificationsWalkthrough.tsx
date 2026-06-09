import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { SimulatedCursor } from './SimulatedCursor';
import { Bell, CheckCircle2, User } from 'lucide-react';

export const FocusedNotificationsWalkthrough = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const sequence = async () => {
      setStep(0);
      await new Promise(r => setTimeout(r, 1000));
      setStep(1); // Cursor moves to bell
      await new Promise(r => setTimeout(r, 800));
      setStep(2); // Clicks bell
      await new Promise(r => setTimeout(r, 1500));
      setStep(3); // Moves to notification
      await new Promise(r => setTimeout(r, 800));
      setStep(4); // Clicks notification
      await new Promise(r => setTimeout(r, 3000));
      sequence(); // Loop
    };
    sequence();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full max-w-sm aspect-[4/3] bg-background/50 backdrop-blur-md rounded-2xl border-0 overflow-hidden shadow-sm flex flex-col items-center pt-8" style={{ boxShadow: 'var(--shadow-sm), var(--glass-bevel)' }}>
      {/* Top Navbar Simulation */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-secondary/20 border-b border-border/10 flex items-center justify-between px-4">
        <div className="w-16 h-3 bg-foreground/10 rounded" />
        
        <div className="relative">
          <motion.div 
            className="w-8 h-8 rounded-full flex items-center justify-center bg-background border-0"
            style={{ boxShadow: 'var(--glass-bevel)' }}
            animate={{ scale: step === 2 ? 0.9 : 1 }}
          >
            <Bell className="w-4 h-4 text-foreground/70" />
            {step < 4 && (
              <motion.div 
                className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border border-background" 
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {step >= 2 && step < 4 && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, transition: { duration: 0.15 } }}
            className="absolute top-14 right-4 w-64 bg-background/90 backdrop-blur-thick rounded-xl border-0 p-2 z-20"
            style={{ boxShadow: 'var(--shadow-elevation3), var(--glass-bevel)', transformOrigin: 'top right' }}
          >
            <div className="px-2 py-1.5 mb-1 border-b border-border/10">
              <span className="text-xs font-semibold text-foreground/80">Notifications</span>
            </div>
            
            <motion.div 
              className="p-2 flex gap-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
              animate={{ backgroundColor: step === 3 ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--primary) / 0.05)' }}
            >
              <div className="w-6 h-6 rounded-full bg-task-blue/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3 h-3 text-task-blue" />
              </div>
              <div>
                <p className="text-[11px] text-foreground/90 leading-tight">
                  <span className="font-semibold">Sarah</span> assigned you a new task: <span className="font-medium">Update Hero Section</span>
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">2 mins ago</p>
              </div>
            </motion.div>

            <div className="p-2 flex gap-2 rounded-lg opacity-60">
               <div className="w-6 h-6 rounded-full bg-task-green/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-task-green" />
              </div>
              <div>
                <p className="text-[11px] text-foreground/80 leading-tight">
                  <span className="font-semibold">Mike</span> completed <span className="font-medium">API Integration</span>
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">1 hour ago</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task View (shows after clicking notification) */}
      <AnimatePresence>
        {step >= 4 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 top-12 bg-background p-4 z-10"
          >
            <div className="w-24 h-4 bg-foreground/20 rounded mb-4" />
            <div className="bg-surface-glass-thin rounded-xl p-4 border-0" style={{ boxShadow: 'var(--glass-bevel)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 rounded bg-primary/20" />
                <div className="w-32 h-3 bg-foreground/30 rounded" />
              </div>
              <div className="w-full h-2 bg-foreground/10 rounded mb-2" />
              <div className="w-2/3 h-2 bg-foreground/10 rounded" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simulated Cursor */}
      <SimulatedCursor 
        position={
          step === 0 ? { x: 50, y: 150 } :
          step === 1 ? { x: 260, y: 25 } : // Move to bell
          step === 2 ? { x: 260, y: 25 } : // Click bell
          step === 3 ? { x: 150, y: 80 } : // Move to notification
          step === 4 ? { x: 150, y: 80 } : // Click notification
          { x: 50, y: 150 }
        }
        click={step === 2 || step === 4}
      />
    </div>
  );
};
