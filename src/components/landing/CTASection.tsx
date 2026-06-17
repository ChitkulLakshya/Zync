import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ContributorTicket from "@/components/landing/ContributorTicket";
import { SimulatedCursor } from "@/components/landing/SimulatedCursor";

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
    <section id="cta" className="py-32 relative overflow-hidden bg-background border-t border-white/5">
      {/* Brutalist Grid Lines */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
      }} />

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
          
          {/* Simulated Cursors */}
          <motion.div
            className="absolute z-50 pointer-events-none hidden md:block"
            variants={{
              floating: { left: "0%", top: "10%", y: [0, -20, 0], x: [0, 15, 0], transition: { y: { duration: 5, repeat: Infinity, ease: "easeInOut" }, x: { duration: 5, repeat: Infinity, ease: "easeInOut" } } },
              approving: { left: "25%", top: "40%", y: 0, x: 0, scale: 1.1, transition: { type: "spring", stiffness: 120, damping: 20 } },
              clicking: { left: "25%", top: "40%", y: 0, x: 0, scale: 0.9, transition: { type: "spring", stiffness: 400, damping: 15 } },
              patrolling: { left: "-10%", top: "80%", y: [0, 20, 0], x: [0, -15, 0], transition: { type: "spring", stiffness: 60, damping: 20 } }
            }}
            initial="floating"
            animate={cursorState}
          >
            <SimulatedCursor x={0} y={0} name="prem22k" color="#34d399" isClicking={cursorState === 'clicking'} />
          </motion.div>

          <motion.div
            className="absolute z-50 pointer-events-none hidden md:block"
            variants={{
              floating: { right: "5%", top: "20%", y: [0, 25, 0], x: [0, -10, 0], transition: { y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }, x: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 } } },
              approving: { right: "25%", top: "45%", y: 0, x: 0, scale: 1.1, transition: { type: "spring", stiffness: 100, damping: 18, delay: 0.1 } },
              clicking: { right: "25%", top: "45%", y: 0, x: 0, scale: 0.9, transition: { type: "spring", stiffness: 400, damping: 15 } },
              patrolling: { right: "-5%", top: "15%", y: [0, -25, 0], x: [0, 20, 0], transition: { type: "spring", stiffness: 60, damping: 20 } }
            }}
            initial="floating"
            animate={cursorState}
          >
            <SimulatedCursor x={0} y={0} name="chitkullakshya" color="#60a5fa" isClicking={cursorState === 'clicking'} />
          </motion.div>

          <motion.div
            className="absolute z-50 pointer-events-none hidden md:block"
            variants={{
              floating: { left: "10%", bottom: "0%", y: [0, -15, 0], x: [0, -20, 0], transition: { y: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }, x: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 } } },
              approving: { left: "40%", bottom: "10%", y: 0, x: 0, scale: 1.1, transition: { type: "spring", stiffness: 140, damping: 22, delay: 0.15 } },
              clicking: { left: "40%", bottom: "10%", y: 0, x: 0, scale: 0.9, transition: { type: "spring", stiffness: 400, damping: 15 } },
              patrolling: { right: "15%", bottom: "-10%", y: [0, 15, 0], x: [0, -25, 0], transition: { type: "spring", stiffness: 60, damping: 20 } }
            }}
            initial="floating"
            animate={cursorState}
          >
            <SimulatedCursor x={0} y={0} name="eesha264" color="#a78bfa" isClicking={cursorState === 'clicking'} />
          </motion.div>

          {/* The Holographic Ticket */}
          <ContributorTicket onMint={() => setCursorState('approving')} isApproved={isApproved} />
        </div>
      </div>
    </section>
  );
};

export default CTASection;
