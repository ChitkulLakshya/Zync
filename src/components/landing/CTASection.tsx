import { useState, useEffect } from "react";
import ContributorTicket from "@/components/landing/ContributorTicket";


const CTASection = () => {
  const [cursorState, setCursorState] = useState<'floating' | 'approving' | 'clicking' | 'patrolling'>('floating');
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    if (cursorState === 'approving') {
      // 1. Cursors fly into the center. Wait 800ms for them to arrive.
      const arriveTimer = setTimeout(() => {
        setCursorState('clicking');
      }, 800);
      return () => clearTimeout(arriveTimer);
    }

    if (cursorState === 'clicking') {
      // 2. The moment they click, reveal the email form inside the ticket.
      setIsApproved(true);
      
      // 3. Let the click ripple play, then fly away so they don't block the screen!
      const flyAwayTimer = setTimeout(() => {
        setCursorState('patrolling');
      }, 400); // 400ms click duration
      return () => clearTimeout(flyAwayTimer);
    }
  }, [cursorState]);

  return (
    <section id="cta" className="py-32 relative overflow-hidden bg-transparent border-t border-white/5">
      
      {/* Left Edge Context Tag */}
      <div className="hidden xl:flex absolute left-8 top-1/2 -translate-y-1/2 -rotate-90 origin-left transform text-[10px] font-mono tracking-[0.2em] text-zinc-400 dark:text-zinc-600 pointer-events-none select-none whitespace-nowrap">
        // REPO: OPEN_SOURCE_CORE
      </div>

      {/* Right Edge Context Tag */}
      <div className="hidden xl:flex absolute right-12 top-1/2 -translate-y-1/2 items-center gap-2 pointer-events-none select-none">
        <span className="text-[10px] uppercase font-semibold tracking-widest text-zinc-400 dark:text-zinc-600">Press</span>
        <kbd className="px-2 py-1 rounded-md bg-zinc-50/50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 text-[10px] font-sans text-zinc-500 dark:text-zinc-400 shadow-sm flex items-center justify-center">
          ↵
        </kbd>
        <span className="text-[10px] uppercase font-semibold tracking-widest text-zinc-400 dark:text-zinc-600">to verify</span>
      </div>

      <div className="container mx-auto px-4 relative z-10 flex flex-col items-center">
        {/* Massive Typography */}
        <div className="mb-16 text-center">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground mb-6 uppercase">
            The Codebase <br className="hidden md:block" />
            <span className="text-foreground/50">is open.</span>
          </h2>
        </div>

        {/* The Ticket & Cursors Stage */}
        <div className="relative w-full max-w-3xl mx-auto flex justify-center items-center py-10">
          
          {/* Premium Ambient Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-sky-500/[0.05] dark:bg-sky-500/[0.1] rounded-full blur-[80px] md:blur-[120px] pointer-events-none -z-10" />

          {/* The Holographic Ticket */}
          <ContributorTicket onMint={() => setCursorState('approving')} isApproved={isApproved} />
        </div>
      </div>
    </section>
  );
};

export default CTASection;
