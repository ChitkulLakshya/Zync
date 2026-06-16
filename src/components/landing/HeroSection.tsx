import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import DesktopPreview from "@/components/landing/DesktopPreview";
import { SimulatedCursor } from "@/components/landing/SimulatedCursor";

const HeroSection = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.7], [0.85, 1]);
  const rotateX = useTransform(scrollYProgress, [0, 0.7], [25, 0]);
  const translateY = useTransform(scrollYProgress, [0, 0.7], ["66vh", "0vh"]);
  const pointerEvents = useTransform(scrollYProgress, (value) => value >= 0.7 ? "auto" : "none");

  const handleGetStarted = () => {
    navigate("/signup", { state: { email } });
  };

  return (
    <section ref={containerRef} className="relative h-[250vh] hero-gradient">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/[0.03] pointer-events-none" />
      {/* Structural Dot Matrix Background */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* The Sticky Stage */}
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col pt-20 lg:pt-24">
        
        {/* Hero Content */}
         <motion.div 
           className="container mx-auto px-4 relative z-10 flex-shrink-0"
           style={{
             opacity: useTransform(scrollYProgress, [0, 0.6], [1, 0]),
             y: useTransform(scrollYProgress, [0, 0.6], [0, -100]),
           }}
        >
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
            {/* Badge (Live Status Indicator) */}
            <div 
              className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-surface-glass-thin backdrop-blur-md rounded-full mb-8 animate-fade-in border border-white/5"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              {/* Pulsing Dot */}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium tracking-wide text-foreground/80">
                Public Beta 1.0
              </span>
            </div>

            {/* Heading with Cursor Wrappers */}
            <div className="relative inline-block">
              {/* Feature 1 - Emerald/Green */}
              <motion.div
                className="absolute hidden md:block z-50 pointer-events-none"
                style={{ left: "-140px", top: "-30px" }}
                animate={{ y: [0, -12, 0], x: [0, 6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
              >
                <SimulatedCursor x={0} y={0} name="Live Collaboration" color="#10b981" />
              </motion.div>

              {/* Feature 2 - Red */}
              <motion.div
                className="absolute hidden sm:block z-50 pointer-events-none"
                style={{ right: "-80px", top: "60px" }}
                animate={{ y: [0, 18, 0], x: [0, -12, 0] }}
                transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", repeatType: "mirror", delay: 1 }}
              >
                <SimulatedCursor x={0} y={0} name="AI Planning" color="#ef4444" />
              </motion.div>

              {/* Feature 3 - Violet */}
              <motion.div
                className="absolute hidden md:block z-50 pointer-events-none"
                style={{ right: "-20px", bottom: "-20px" }}
                animate={{ y: [0, -8, 0], x: [0, 15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatType: "mirror", delay: 0.5 }}
              >
                <SimulatedCursor x={0} y={0} name="GitHub Sync" color="#8b5cf6" />
              </motion.div>

              {/* Feature 4 - Blue */}
              <motion.div
                className="absolute hidden lg:block z-50 pointer-events-none"
                style={{ left: "-200px", bottom: "30px" }}
                animate={{ y: [0, 14, 0], x: [0, -8, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", repeatType: "mirror", delay: 2 }}
              >
                <SimulatedCursor x={0} y={0} name="Team Chat" color="#3b82f6" />
              </motion.div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tighter mb-6 text-foreground leading-[1.05]">
                Build software,
                <br />
                <span className="text-foreground/80">together.</span>
              </h1>
            </div>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
              Planning, tasks, and communication in one focused workspace.
            </p>

            {/* Liquid Glass CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-fade-in-up">
              <Button 
                size="lg" 
                className="h-12 px-8 rounded-full text-base font-medium group active:scale-95 transition-transform"
                style={{ boxShadow: 'var(--shadow-elevation2)' }}
                onClick={handleGetStarted}
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="h-12 px-8 rounded-full text-base font-medium bg-surface-glass-regular backdrop-blur-md border-white/5 hover:bg-white/5 group active:scale-95 transition-all"
              >
                Explore How It Works
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* 3D Context & Dashboard Preview */}
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-end pb-4 lg:pb-6 pointer-events-none [perspective:2000px] z-20">
          <motion.div 
            className="w-full px-4 sm:px-6 lg:px-8 origin-[50%_0%] pointer-events-auto"
            style={{
              scale,
              rotateX,
              y: translateY,
              transformStyle: "preserve-3d"
            }}
          >
            {/* Glass layers separating effect on scroll */}
            <motion.div 
              className="absolute -inset-4 bg-foreground/5 rounded-[2.5rem] blur-2xl -z-10"
              style={{ 
                scale: useTransform(scrollYProgress, [0, 0.7], [1, 1.1]),
                opacity: useTransform(scrollYProgress, [0, 0.7], [0.3, 0])
              }} 
            />

            {/* Premium Studio Display Mockup Frame */}
            <div 
              className="relative rounded-[2.5rem] bg-zinc-950 border border-zinc-200 dark:border-zinc-800/50 p-3 sm:p-4 flex flex-col h-[calc(100vh-6rem)] lg:h-[calc(100vh-7rem)] shadow-2xl transition-all duration-300"
              style={{ 
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Webcam Lens & Green Active LED */}
              <div className="absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-30 pointer-events-none">
                {/* Camera Lens */}
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-zinc-900 border border-zinc-800/50 flex items-center justify-center">
                  <div className="w-0.5 h-0.5 rounded-full bg-blue-900/80" />
                </div>
                {/* Green LED indicator */}
                <div className="w-1 h-1 rounded-full bg-emerald-500/90 shadow-[0_0_4px_#10b981]" />
              </div>

              {/* Inner Screen Viewport */}
              <motion.div 
                className="relative rounded-[1.5rem] bg-background border border-zinc-800 w-full flex-1 min-h-0 overflow-hidden"
                style={{ 
                  boxShadow: 'var(--shadow-sm), inset 0 1px 2px rgba(0,0,0,0.2)',
                  clipPath: 'inset(0 round 1.5rem)',
                  pointerEvents
                }}
              >
                <DesktopPreview />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;