/**
 * @fileoverview HeroSection.tsx
 * @module HeroSection
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
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, animate } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import DesktopPreview from '@/components/landing/DesktopPreview';
import { SimulatedCursor } from '@/components/landing/SimulatedCursor';

const HeroSection = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const scale = useTransform(scrollYProgress, [0, 0.7], [0.85, 1]);
  const rotateX = useTransform(scrollYProgress, [0, 0.7], [25, 0]);
  const translateY = useTransform(scrollYProgress, [0, 0.7], ['60vh', '0vh']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.6], [0, -50]);

  const handleGetStarted = () => {
    navigate('/signup', { state: { email } });
  };

  return (
    <section
      ref={containerRef}
      className={`relative ${isMobile ? 'h-auto pb-20 overflow-hidden' : 'h-[250vh]'}`}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-background pointer-events-none" />
      {/* Structural Dot Matrix Background */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* The Stage */}
      <div
        className={
          isMobile
            ? 'flex flex-col pt-24 px-4 overflow-hidden'
            : 'sticky top-0 h-screen overflow-hidden flex flex-col pt-28 lg:pt-36'
        }
      >
        {/* Hero Content */}
        <motion.div
          key={isMobile ? 'hero-mobile' : 'hero-desktop'}
          className="container mx-auto px-4 relative z-10 flex-shrink-0"
          style={{
            opacity: isMobile ? 1 : heroOpacity,
            y: isMobile ? 0 : heroY,
          }}
        >
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
            {/* Badge (Live Status Indicator) */}
            <div
              className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-surface-glass-thin backdrop-blur-md rounded-full mb-8 animate-fade-in border border-black/5 dark:border-white/5"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              {/* Pulsing Dot */}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-task-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-task-green"></span>
              </span>
              <span className="text-[11px] sm:text-xs font-medium tracking-wide text-foreground/80">
                Zync v1.0 is now live
              </span>
            </div>

            {/* Heading with Cursor Wrappers */}
            <div className="relative inline-block">
              {/* Feature 1 - Emerald/Green */}
              <motion.div
                className="absolute z-50 pointer-events-none"
                style={
                  isMobile ? { left: '-20px', top: '-45px' } : { left: '-140px', top: '-30px' }
                }
                animate={{ y: [0, -12, 0], x: [0, 6, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatType: 'mirror',
                }}
              >
                <div
                  style={{
                    transform: isMobile ? 'scale(0.55)' : 'scale(1)',
                    transformOrigin: 'top left',
                  }}
                >
                  <SimulatedCursor
                    x={0}
                    y={0}
                    name="Live Collaboration"
                    color="hsl(var(--task-green))"
                  />
                </div>
              </motion.div>

              {/* Feature 2 - Red */}
              <motion.div
                className="absolute z-50 pointer-events-none"
                style={isMobile ? { right: '10px', top: '-20px' } : { right: '-80px', top: '60px' }}
                animate={{ y: [0, 18, 0], x: [0, -12, 0] }}
                transition={{
                  duration: 6.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatType: 'mirror',
                  delay: 1,
                }}
              >
                <div
                  style={{
                    transform: isMobile ? 'scale(0.55)' : 'scale(1)',
                    transformOrigin: 'top left',
                  }}
                >
                  <SimulatedCursor x={0} y={0} name="AI Planning" color="hsl(var(--task-orange))" />
                </div>
              </motion.div>

              {/* Feature 3 - Violet */}
              <motion.div
                className="absolute z-50 pointer-events-none"
                style={
                  isMobile ? { right: '0px', bottom: '-30px' } : { right: '-20px', bottom: '-20px' }
                }
                animate={{ y: [0, -8, 0], x: [0, 15, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatType: 'mirror',
                  delay: 0.5,
                }}
              >
                <div
                  style={{
                    transform: isMobile ? 'scale(0.55)' : 'scale(1)',
                    transformOrigin: 'top left',
                  }}
                >
                  <SimulatedCursor x={0} y={0} name="GitHub Sync" color="hsl(var(--task-purple))" />
                </div>
              </motion.div>

              {/* Feature 4 - Blue */}
              <motion.div
                className="absolute z-50 pointer-events-none"
                style={
                  isMobile ? { left: '-20px', bottom: '0px' } : { left: '-200px', bottom: '30px' }
                }
                animate={{ y: [0, 14, 0], x: [0, -8, 0] }}
                transition={{
                  duration: 5.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatType: 'mirror',
                  delay: 2,
                }}
              >
                <div
                  style={{
                    transform: isMobile ? 'scale(0.55)' : 'scale(1)',
                    transformOrigin: 'top left',
                  }}
                >
                  <SimulatedCursor x={0} y={0} name="Team Chat" color="hsl(var(--primary))" />
                </div>
              </motion.div>

              <h1 className="text-[clamp(2.5rem,8vw,5rem)] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tighter mb-4 text-foreground leading-[1.05]">
                Build software,
                <br />
                <span className="text-foreground/80">together.</span>
              </h1>
            </div>

            {/* Subheading */}
            <p className="text-[clamp(1rem,3vw,1.25rem)] text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed font-normal">
              Planning, tasks, and communication in one focused workspace.
            </p>

            {/* Liquid Glass CTAs */}
            <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center justify-center gap-4 mb-[clamp(2rem,6vh,5rem)] animate-fade-in-up px-4">
              <Button
                size="lg"
                className="h-12 px-8 w-full sm:w-auto rounded-full text-base font-medium group active:scale-95 transition-transform"
                style={{ boxShadow: 'var(--shadow-elevation2)' }}
                onClick={handleGetStarted}
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const el = document.getElementById('features');
                  if (el) {
                    const top = el.getBoundingClientRect().top + window.scrollY - 80;
                    animate(window.scrollY, top, {
                      duration: 0.8,
                      ease: [0.22, 1, 0.36, 1],
                      onUpdate: (value) => window.scrollTo(0, value),
                    });
                  }
                }}
                className="h-12 px-8 w-full sm:w-auto rounded-full text-base font-medium bg-surface-glass-regular backdrop-blur-md border border-border/10 hover:bg-surface-glass-thick group active:scale-95 transition-all"
              >
                Explore How It Works
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* 3D Context & Dashboard Preview */}
        <div
          className={`w-full flex flex-col items-center justify-end pb-4 lg:pb-6 z-20 ${isMobile ? 'relative mt-8 pointer-events-auto' : 'absolute top-0 left-0 h-full pointer-events-none [perspective:2000px]'}`}
        >
          <motion.div
            key={isMobile ? 'macbook-mobile' : 'macbook-desktop'}
            className={`w-full origin-[50%_0%] ${isMobile ? 'pointer-events-auto' : 'px-4 sm:px-6 lg:px-8 pointer-events-auto'}`}
            style={{
              scale: isMobile ? 1 : scale,
              rotateX: isMobile ? 0 : rotateX,
              y: isMobile ? 0 : translateY,
              transformStyle: isMobile ? 'flat' : 'preserve-3d',
            }}
          >
            {/* MacBook Pro Frame Wrapping the Preview */}
            <div
              className={`relative rounded-[2.5rem] bg-[#2a2b2c] p-[6px] flex flex-col shadow-elevation5 ring-1 ring-black/20 dark:ring-white/10 ${isMobile ? '' : 'mx-auto'}`}
              style={
                isMobile
                  ? {
                      backgroundImage: 'linear-gradient(to bottom, #3a3b3c, #1c1d1e)',
                      aspectRatio: '16/10',
                      width: '1200px',
                      transformOrigin: 'top left',
                      transform: 'scale(0.55) translateX(1%)',
                      marginBottom: '-340px',
                    }
                  : {
                      backgroundImage: 'linear-gradient(to bottom, #3a3b3c, #1c1d1e)',
                      aspectRatio: '16/10',
                      width: '100%',
                      maxWidth: 'min(1400px, 140vh)',
                    }
              }
            >
              {/* Inner Black Bezel */}
              <div className="relative rounded-[2.2rem] bg-black p-4 flex flex-col w-full flex-1 overflow-hidden border border-white/10">
                {/* Camera Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[160px] h-[28px] bg-black rounded-b-[1rem] z-50 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#111] shadow-inner border border-white/5 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-blue-500/50" />
                  </div>
                </div>

                {/* The Screen / Preview */}
                <div
                  className="relative rounded-[1.2rem] bg-sidebar border border-border/50 w-full flex-1 overflow-hidden"
                  style={{
                    boxShadow: 'inset 0 0 0 1px hsl(var(--foreground) / 0.05)',
                  }}
                >
                  <DesktopPreview />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
