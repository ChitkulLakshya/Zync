/**
 * @fileoverview MultiplayerWalkthrough.tsx
 * @module MultiplayerWalkthrough
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Client-Side Presentation & Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license AGPL-3.0-only
 * ============================================================================
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SimulatedCursor } from './SimulatedCursor';
import { ChevronRight, CheckCircle2 } from 'lucide-react';

export const MultiplayerWalkthrough = () => {
  const [alexPhase, setAlexPhase] = useState('idle');
  const [alexPos, setAlexPos] = useState({ x: '-20%', y: '40%' });
  const [alexClicking, setAlexClicking] = useState(false);
  const [alexText, setAlexText] = useState('');

  const [sarahPhase, setSarahPhase] = useState('idle');
  const [sarahPos, setSarahPos] = useState({ x: '120%', y: '60%' });
  const [sarahClicking, setSarahClicking] = useState(false);
  const [showTaskMenu, setShowTaskMenu] = useState(false);

  const [mikePhase, setMikePhase] = useState('idle');
  const [mikePos, setMikePos] = useState({ x: '50%', y: '120%' });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let isActive = true;

    const runSequence = async () => {
      if (!isActive) {
        return;
      }


      setAlexPhase('idle');
      setAlexText('');
      setAlexPos({ x: '-40%', y: '40%' });
      setSarahPhase('idle');
      setSarahPos({ x: '120%', y: '60%' });
      setShowTaskMenu(false);
      setMikePhase('idle');
      setMikePos({ x: '50%', y: '120%' });

      await new Promise((r) => setTimeout(r, 1200));


      if (!isActive) {
        return;
      }
      setAlexPos({ x: isMobile ? '10%' : '13%', y: isMobile ? '63%' : '69%' });
      setAlexPhase('typing');


      setSarahPos({ x: isMobile ? '10%' : '13%', y: isMobile ? '74%' : '81%' });
      setMikePos({ x: isMobile ? '65%' : '60%', y: isMobile ? '88%' : '94%' });

      await new Promise((r) => setTimeout(r, 800));


      if (!isActive) {
        return;
      }
      const fullText = 'The auth module must support OAuth2.';
      for (let i = 0; i <= fullText.length; i++) {
        if (!isActive) {
          break;
        }
        setAlexText(fullText.slice(0, i));

        setAlexPos((prev) => ({ ...prev, x: `${(isMobile ? 10 : 13) + i * 1.8}%` }));
        await new Promise((r) => setTimeout(r, 40 + Math.random() * 40));
      }

      await new Promise((r) => setTimeout(r, 400));


      if (!isActive) {
        return;
      }
      setSarahPhase('menu');
      setSarahClicking(true);
      await new Promise((r) => setTimeout(r, 150));
      setSarahClicking(false);
      setShowTaskMenu(true);

      await new Promise((r) => setTimeout(r, 700));


      if (!isActive) {
        return;
      }
      setSarahPos({ x: isMobile ? '25%' : '30%', y: isMobile ? '94%' : '101%' });
      await new Promise((r) => setTimeout(r, 600));
      setSarahClicking(true);
      await new Promise((r) => setTimeout(r, 150));
      setSarahClicking(false);

      if (!isActive) {
        return;
      }
      setShowTaskMenu(false);
      setSarahPhase('inserted');


      setSarahPos({ x: isMobile ? '80%' : '73%', y: isMobile ? '74%' : '79%' });
      setAlexPos({ x: isMobile ? '85%' : '77%', y: isMobile ? '63%' : '69%' });

      await new Promise((r) => setTimeout(r, 2000));


      setAlexPos({ x: '-40%', y: '40%' });
      setSarahPos({ x: '120%', y: '60%' });
      setMikePos({ x: '50%', y: '120%' });

      await new Promise((r) => setTimeout(r, 1500));
      if (isActive) {
        runSequence();
      }
    };

    runSequence();
    return () => {
      isActive = false;
    };
  }, [isMobile]);

  return (
    <div className="relative w-full max-w-[460px] bg-card/80 backdrop-blur-xl border border-border/10 shadow-elevation5 rounded-2xl flex flex-col font-sans overflow-hidden mx-auto h-[340px] sm:h-[380px]">
      {/* Background glow for premium feel */}
      <div className="absolute top-0 inset-x-0 h-24 sm:h-32 bg-gradient-to-b from-foreground/5 to-transparent pointer-events-none" />

      {/* Simulated Cursors */}
      <SimulatedCursor
        x={alexPos.x}
        y={alexPos.y}
        isClicking={alexClicking}
        name="Alex"
        color="hsl(var(--task-green))"
      />
      <SimulatedCursor
        x={sarahPos.x}
        y={sarahPos.y}
        isClicking={sarahClicking}
        name="Sarah"
        color="hsl(var(--task-purple))"
      />
      <SimulatedCursor
        x={mikePos.x}
        y={mikePos.y}
        isClicking={false}
        name="Mike"
        color="hsl(var(--task-orange))"
      />

      {/* Top Bar */}
      <div className="h-10 sm:h-12 shrink-0 flex items-center px-4 sm:px-5 border-b border-border/10 bg-secondary/20 relative z-10">
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground font-medium">
          <span>My Notes</span>
          <ChevronRight size={14} className="text-border/50" />
          <span className="text-foreground">Project Specs</span>
        </div>
      </div>

      {/* Editor Canvas */}
      <div className="flex-1 p-4 sm:p-6 relative z-10">
        {/* EditorHeader */}
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="flex -space-x-1.5">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-task-green flex items-center justify-center border-[2.5px] border-card shadow-sm z-30">
              <span className="text-[9px] sm:text-[10px] text-background font-bold">A</span>
            </div>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-task-purple flex items-center justify-center border-[2.5px] border-card shadow-sm z-20">
              <span className="text-[9px] sm:text-[10px] text-background font-bold">S</span>
            </div>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-task-orange flex items-center justify-center border-[2.5px] border-card shadow-sm z-10">
              <span className="text-[9px] sm:text-[10px] text-background font-bold">M</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground bg-secondary/30 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md border border-border/10">
            <CheckCircle2 size={12} className="text-task-green" />
            <span className="text-task-green font-medium">Saved</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-[28px] font-bold text-foreground tracking-tight leading-tight mb-3 sm:mb-5">
          Project Specs
        </h1>

        {/* Blocks */}
        <div className="space-y-2 sm:space-y-2.5 text-sm sm:text-[15px] leading-relaxed text-muted-foreground">
          {/* Static block */}
          <div className="py-1 px-1">
            <p>Please review the architecture and add missing tasks.</p>
          </div>

          {/* Block active by Alex */}
          <div className="relative py-1 sm:py-1.5 px-2 sm:px-3 border-l-[3px] border-task-green bg-task-green/5 rounded-r-md transition-colors">
            <p className="text-foreground">
              {alexText}
              {alexPhase === 'typing' && (
                <span className="inline-block w-[2px] h-[1em] bg-task-green ml-0.5 animate-pulse translate-y-0.5" />
              )}
            </p>
          </div>

          {/* Block active by Sarah */}
          <div className="relative py-1 sm:py-1.5 px-2 sm:px-3 border-l-[3px] border-task-purple bg-task-purple/5 rounded-r-md min-h-[32px] sm:min-h-[36px] flex items-center transition-colors">
            {sarahPhase === 'inserted' ? (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 font-medium text-foreground bg-background border border-border/10 shadow-sm px-1.5 sm:px-2 py-0.5 rounded-md">
                Implement SSO
                <span className="text-muted-foreground text-[9px] sm:text-[11px] bg-secondary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                  ENG-88
                </span>
              </span>
            ) : sarahPhase === 'menu' ? (
              <span className="text-muted-foreground/80 font-medium bg-secondary/50 px-1 sm:px-1.5 rounded">
                /task
              </span>
            ) : (
              <span className="text-muted-foreground/30 opacity-0">...</span>
            )}

            {/* Inline Task Slash Menu Simulation */}
            <AnimatePresence>
              {showTaskMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-full left-0 mt-1 sm:mt-1.5 w-48 sm:w-52 bg-card border border-border/10 shadow-elevation4 rounded-xl overflow-hidden z-20"
                >
                  <div className="px-2 sm:px-3 py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/5 bg-secondary/10">
                    Link Task
                  </div>
                  <div className="p-1 sm:p-1.5">
                    <div className="px-2 sm:px-2.5 py-1.5 sm:py-2 text-xs sm:text-[13px] text-foreground bg-secondary/60 rounded-md cursor-pointer flex flex-col gap-0.5">
                      <span className="font-medium">Implement SSO</span>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono">
                        ENG-88
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Block active by Mike */}
          <div className="relative py-1 sm:py-1.5 px-2 sm:px-3 border-l-[3px] border-task-orange bg-task-orange/5 rounded-r-md mt-2 sm:mt-4 transition-colors">
            <p>Database migrations are scheduled for Friday.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
