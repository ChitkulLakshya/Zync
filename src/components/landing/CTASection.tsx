import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
          


          {/* The Holographic Ticket */}
          <ContributorTicket onMint={() => setCursorState('approving')} isApproved={isApproved} />
        </div>
      </div>
    </section>
  );
};

export default CTASection;
