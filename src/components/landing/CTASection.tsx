import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ContributorTicket from '@/components/landing/ContributorTicket';
import { SimulatedCursor } from '@/components/landing/SimulatedCursor';
import { IsometricMatrix } from '@/components/landing/IsometricMatrix';

const CTASection = () => {
  const [cursorState, setCursorState] = useState<
    'floating' | 'approving' | 'clicking' | 'patrolling'
  >('floating');
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    if (cursorState === 'approving') {
      const arriveTimer = setTimeout(() => {
        setCursorState('clicking');
      }, 1500);
      return () => clearTimeout(arriveTimer);
    }

    if (cursorState === 'clicking') {
      setIsApproved(true);
      const flyAwayTimer = setTimeout(() => {
        setCursorState('patrolling');
      }, 600);
      return () => clearTimeout(flyAwayTimer);
    }
  }, [cursorState]);

  return (
    <section
      id="cta"
      className="py-20 md:py-32 relative overflow-hidden bg-background border-t border-black/5 dark:border-white/5"
    >
      {/* Isometric Architectural Matrix */}
      <IsometricMatrix />

      <div className="container mx-auto px-4 relative z-10 flex flex-col items-center">
        {/* Massive Typography */}
        <div className="mb-12 md:mb-16 text-center px-4">
          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter text-foreground mb-4 md:mb-6 uppercase leading-[1.1]">
            The Codebase <br />
            is <span className="text-foreground/50">open.</span>
          </h2>
        </div>

        {/* The Ticket & Cursors Stage */}
        <div className="relative w-full max-w-3xl mx-auto flex justify-center items-center py-10">
          {/* 
            =========================================
            CURSOR 1: prem22k (Top Left)
            =========================================
            To reposition this cursor manually, adjust the CSS coordinates below:
            - floating: The idle position before a user types their github name.
            - approving/clicking: Where the cursor flies to 'click' the card (keep these identical!).
            - patrolling: Where the cursor escapes to after clicking so it doesn't block the screen.
          */}
          <motion.div
            className="absolute z-50 pointer-events-none hidden md:block"
            variants={{
              floating: {
                opacity: 0,
                scale: 0.2,
                left: '10%',
                top: '20%',
              },
              approving: {
                opacity: 1,
                left: '25%',
                top: '40%',
                y: 0,
                x: 0,
                scale: 1.1,
                transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
              },
              clicking: {
                opacity: 1,
                left: '25%',
                top: '40%',
                y: 0,
                x: 0,
                scale: 0.9,
                transition: { duration: 0.3, ease: 'easeInOut' },
              },
              patrolling: {
                opacity: 0,
                scale: 0.2,
                left: '-15%',
                top: '10%',
                transition: { duration: 1.2, ease: 'easeInOut' },
              },
            }}
            initial="floating"
            animate={cursorState}
          >
            <SimulatedCursor
              x={0}
              y={0}
              name="prem22k"
              color="hsl(var(--task-green))"
              isClicking={cursorState === 'clicking'}
            />
          </motion.div>

          {/* 
            =========================================
            CURSOR 2: chitkullakshya (Top Right)
            =========================================
          */}
          <motion.div
            className="absolute z-50 pointer-events-none hidden md:block"
            variants={{
              floating: {
                opacity: 0,
                scale: 0.2,
                right: '15%',
                top: '25%',
              },
              approving: {
                opacity: 1,
                right: '25%',
                top: '45%',
                y: 0,
                x: 0,
                scale: 1.1,
                transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 },
              },
              clicking: {
                opacity: 1,
                right: '25%',
                top: '45%',
                y: 0,
                x: 0,
                scale: 0.9,
                transition: { duration: 0.3, ease: 'easeInOut' },
              },
              patrolling: {
                opacity: 0,
                scale: 0.2,
                right: '0%',
                top: '55%',
                transition: { duration: 1.2, ease: 'easeInOut', delay: 0.15 },
              },
            }}
            initial="floating"
            animate={cursorState}
          >
            <SimulatedCursor
              x={0}
              y={0}
              name="chitkullakshya"
              color="hsl(var(--primary))"
              isClicking={cursorState === 'clicking'}
            />
          </motion.div>

          {/* 
            =========================================
            CURSOR 3: eesha264 (Bottom Left)
            =========================================
          */}
          <motion.div
            className="absolute z-50 pointer-events-none hidden md:block"
            variants={{
              floating: {
                opacity: 0,
                scale: 0.2,
                left: '25%',
                bottom: '10%',
              },
              approving: {
                opacity: 1,
                left: '40%',
                bottom: '10%',
                y: 0,
                x: 0,
                scale: 1.1,
                transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 },
              },
              clicking: {
                opacity: 1,
                left: '40%',
                bottom: '10%',
                y: 0,
                x: 0,
                scale: 0.9,
                transition: { duration: 0.3, ease: 'easeInOut' },
              },
              patrolling: {
                opacity: 0,
                scale: 0.2,
                right: '10%',
                bottom: '30%',
                transition: { duration: 1.2, ease: 'easeInOut', delay: 0.3 },
              },
            }}
            initial="floating"
            animate={cursorState}
          >
            <SimulatedCursor
              x={0}
              y={0}
              name="eesha264"
              color="hsl(var(--task-purple))"
              isClicking={cursorState === 'clicking'}
            />
          </motion.div>

          {/* The Holographic Ticket */}
          <ContributorTicket onMint={() => setCursorState('approving')} isApproved={isApproved} />
        </div>
      </div>
    </section>
  );
};

export default CTASection;
