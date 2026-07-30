/**
 * @fileoverview HeroSection.tsx
 * @module HeroSection
 *
 * Hero section for Zync landing page.
 * Desktop (>=768px): 3D MacBook Pro preview with scroll interaction (100% unchanged).
 * Mobile (<768px): Normalized padding, clear headline spacing, and floating MobilePreview frame below CTAs.
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, animate } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import DesktopPreview from '@/components/landing/DesktopPreview';
import MobilePreview from '@/components/landing/MobilePreview';
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
      className={`relative ${isMobile ? 'h-auto py-10 pb-12 overflow-hidden' : 'h-[250vh]'}`}
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
            ? 'flex flex-col pt-16 px-4 sm:px-6 overflow-hidden'
            : 'sticky top-0 h-screen overflow-hidden flex flex-col pt-28 lg:pt-36'
        }
      >
        {/* Hero Content */}
        <motion.div
          key={isMobile ? 'hero-mobile' : 'hero-desktop'}
          className="container mx-auto px-4 sm:px-6 relative z-20 flex-shrink-0"
          style={{
            opacity: isMobile ? 1 : heroOpacity,
            y: isMobile ? 0 : heroY,
          }}
        >
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
            {/* Badge (Live Status Indicator) */}
            <div
              className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-surface-glass-thin backdrop-blur-md rounded-full mb-6 animate-fade-in border border-black/5 dark:border-white/5"
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

            {/* Heading with Cursor Wrappers (Desktop Only to avoid mobile overlaps) */}
            <div className="relative inline-block z-20 my-2">
              {/* Feature 1 - Emerald/Green */}
              <motion.div
                className="absolute z-50 pointer-events-none hidden md:block"
                style={{ left: '-140px', top: '-30px' }}
                animate={{ y: [0, -12, 0], x: [0, 6, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatType: 'mirror',
                }}
              >
                <SimulatedCursor
                  x={0}
                  y={0}
                  name="Live Collaboration"
                  color="hsl(var(--task-green))"
                />
              </motion.div>

              {/* Feature 2 - Red */}
              <motion.div
                className="absolute z-50 pointer-events-none hidden md:block"
                style={{ right: '-80px', top: '60px' }}
                animate={{ y: [0, 18, 0], x: [0, -12, 0] }}
                transition={{
                  duration: 6.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatType: 'mirror',
                  delay: 1,
                }}
              >
                <SimulatedCursor x={0} y={0} name="AI Planning" color="hsl(var(--task-orange))" />
              </motion.div>

              {/* Feature 3 - Violet */}
              <motion.div
                className="absolute z-50 pointer-events-none hidden md:block"
                style={{ right: '-20px', bottom: '-20px' }}
                animate={{ y: [0, -8, 0], x: [0, 15, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatType: 'mirror',
                  delay: 0.5,
                }}
              >
                <SimulatedCursor x={0} y={0} name="GitHub Sync" color="hsl(var(--task-purple))" />
              </motion.div>

              {/* Feature 4 - Blue */}
              <motion.div
                className="absolute z-50 pointer-events-none hidden md:block"
                style={{ left: '-200px', bottom: '30px' }}
                animate={{ y: [0, 14, 0], x: [0, -8, 0] }}
                transition={{
                  duration: 5.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatType: 'mirror',
                  delay: 2,
                }}
              >
                <SimulatedCursor x={0} y={0} name="Team Chat" color="hsl(var(--primary))" />
              </motion.div>

              <h1 className="text-[clamp(2.5rem,8vw,5rem)] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tighter mb-4 text-foreground leading-[1.05]">
                Build software,
                <br />
                <span className="text-foreground/80">together.</span>
              </h1>
            </div>

            {/* Subheading */}
            <p className="text-[clamp(1rem,3vw,1.25rem)] text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed font-normal relative z-20">
              Planning, tasks, and communication in one focused workspace.
            </p>

            {/* Stacked CTAs on Mobile */}
            <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center justify-center gap-3.5 mb-8 sm:mb-12 animate-fade-in-up px-4 relative z-20">
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

        {/* Preview Container: Gentle Bobbing Mobile Frame on Mobile (<768px), 3D MacBook on Desktop (>=768px) */}
        {isMobile ? (
          <motion.div
            className="w-full flex flex-col items-center justify-center pt-2 pb-6 z-20"
            animate={{ y: [0, -10, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <MobilePreview />
          </motion.div>
        ) : (
          <div className="absolute top-0 left-0 h-full w-full flex flex-col items-center justify-end pb-4 lg:pb-6 z-20 pointer-events-none [perspective:2000px]">
            <motion.div
              key="macbook-desktop"
              className="w-full origin-[50%_0%] px-4 sm:px-6 lg:px-8 pointer-events-auto"
              style={{
                scale,
                rotateX,
                y: translateY,
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                className="relative rounded-[2.5rem] bg-[#2a2b2c] p-[6px] flex flex-col shadow-elevation5 ring-1 ring-black/20 dark:ring-white/10 mx-auto"
                style={{
                  backgroundImage: 'linear-gradient(to bottom, #3a3b3c, #1c1d1e)',
                  aspectRatio: '16/10',
                  width: '100%',
                  maxWidth: 'min(1400px, 140vh)',
                }}
              >
                <div className="relative rounded-[2.2rem] bg-black p-4 flex flex-col w-full flex-1 overflow-hidden border border-white/10">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[160px] h-[28px] bg-black rounded-b-[1rem] z-50 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#111] shadow-inner border border-white/5 flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-blue-500/50" />
                    </div>
                  </div>
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
        )}
      </div>
    </section>
  );
};

export default HeroSection;
