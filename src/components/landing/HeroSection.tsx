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
  
  // Wait, if it translates to 0vh, it will be centered. The CTAs will be covered. 
  // Let's refine the transform values.

  const handleGetStarted = () => {
    navigate("/signup", { state: { email } });
  };

  return (
    <section ref={containerRef} className="relative h-[250vh] hero-gradient">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

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
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div 
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-secondary/50 rounded-full mb-8 animate-fade-in backdrop-blur-md border-0"
              style={{ boxShadow: 'var(--shadow-sm), var(--glass-bevel)' }}
            >
              <span className="text-xs font-medium tracking-wide text-foreground/80">
                Public Beta 1.0
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-6 text-foreground leading-[1.05]">
              Build software,
              <br />
              <span className="text-foreground/80">together.</span>
            </h1>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
              Planning, tasks, and communication in one focused workspace.
            </p>

            {/* Minimalist CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20 animate-fade-in-up">
              <Button 
                size="lg" 
                className="rounded-full px-8 bg-foreground text-background hover:bg-foreground/90 transition-all h-12 text-base font-medium"
                onClick={handleGetStarted}
              >
                Get Started
              </Button>
              <button 
                className="group flex items-center text-base font-medium text-foreground hover:text-foreground/80 transition-colors"
                onClick={() => navigate('/features')}
              >
                Learn more
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* 3D Context & Dashboard Preview */}
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pt-24 lg:pt-32 pointer-events-none [perspective:2000px] z-20">
          <motion.div 
            className="w-full max-w-[1400px] px-4 origin-[50%_0%] pointer-events-auto"
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

            {/* Massive GlassCard Wrapping the Preview */}
            <div 
              className="relative rounded-[2.5rem] bg-surface-glass-regular backdrop-blur-thick border-0 p-2 sm:p-4"
              style={{ 
                boxShadow: 'var(--shadow-elevation4), var(--glass-bevel)',
                clipPath: 'inset(0 round 2.5rem)'
              }}
            >
              <div 
                className="relative rounded-[1.5rem] bg-background border-0 w-full aspect-[4/3] md:aspect-video"
                style={{ 
                  boxShadow: 'var(--shadow-sm), var(--glass-bevel)',
                  clipPath: 'inset(0 round 1.5rem)'
                }}
              >
                <DesktopPreview />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;