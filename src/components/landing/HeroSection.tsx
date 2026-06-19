import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import DesktopPreview from "@/components/landing/DesktopPreview";



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
  const translateY = useTransform(scrollYProgress, [0, 0.7], ["60vh", "0vh"]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.7], [0.7, 1, 1]);

  const handleGetStarted = () => {
    navigate("/signup", { state: { email } });
  };

  return (
    <section ref={containerRef} className="relative h-[250vh]">

      {/* The Sticky Stage */}
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col pt-28 lg:pt-36">
        
        {/* Hero Content */}
         <motion.div 
           className="container mx-auto px-4 relative z-10 flex-shrink-0"
           style={{
             opacity: useTransform(scrollYProgress, [0, 0.6], [1, 0]),
             y: useTransform(scrollYProgress, [0, 0.6], [0, -50]),
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
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-task-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-task-green"></span>
              </span>
              <span className="text-xs font-medium tracking-wide text-foreground/80">
                Public Beta 1.0
              </span>
            </div>

            {/* Heading with Cursor Wrappers */}
            <div className="relative inline-block">


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
            {/* MacBook Pro Frame Wrapping the Preview */}
            <div 
              className="relative mx-auto rounded-[1rem] sm:rounded-[2rem] lg:rounded-[2.5rem] bg-[#2a2b2c] p-[3px] sm:p-[5px] lg:p-[6px] flex flex-col shadow-elevation5 ring-1 ring-black/20 dark:ring-white/10"
              style={{ 
                backgroundImage: 'linear-gradient(to bottom, #3a3b3c, #1c1d1e)',
                aspectRatio: '16/10',
                width: '100%',
                maxWidth: 'min(1400px, 140vh)'
              }}
            >
              {/* Inner Black Bezel */}
              <div className="relative rounded-[0.8rem] sm:rounded-[1.8rem] lg:rounded-[2.2rem] bg-black p-1.5 sm:p-3 md:p-4 flex flex-col w-full flex-1 overflow-hidden border border-white/10">
                
                {/* Camera Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80px] sm:w-[120px] md:w-[160px] h-[16px] sm:h-[24px] md:h-[28px] bg-black rounded-b-[0.5rem] sm:rounded-b-[1rem] z-50 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#111] shadow-inner border border-white/5 flex items-center justify-center">
                    <div className="w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-blue-500/50" />
                  </div>
                </div>

                {/* The Screen / Preview */}
                <div 
                  className="relative rounded-[0.5rem] sm:rounded-[1rem] lg:rounded-[1.2rem] bg-background border border-border/50 w-full flex-1 overflow-hidden"
                  style={{
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)'
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