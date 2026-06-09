import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Zap } from "lucide-react";
import DesktopPreview from "@/components/landing/DesktopPreview";

const HeroSection = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end center"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.85]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [0, 20]);
  const opacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 0.8, 0]);
  const translateY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  const handleGetStarted = () => {
    navigate("/signup", { state: { email } });
  };

  return (
    <section ref={containerRef} className="relative pt-28 lg:pt-36 pb-16 lg:pb-32 hero-gradient overflow-hidden [perspective:2000px]">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
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
              className="group flex items-center text-base font-medium text-primary hover:text-primary/80 transition-colors"
              onClick={() => navigate('/features')}
            >
              Learn more
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Dashboard Preview - Liquid Glass 3D Scroll Effect */}
        <motion.div 
          className="relative max-w-6xl mx-auto"
          style={{
            scale,
            rotateX,
            y: translateY,
            opacity,
            transformStyle: "preserve-3d"
          }}
        >
          {/* Glass layers separating effect on scroll */}
          <motion.div 
            className="absolute -inset-4 bg-foreground/5 rounded-[2.5rem] blur-2xl -z-10"
            style={{ 
              scale: useTransform(scrollYProgress, [0, 1], [1, 1.1]),
              opacity: useTransform(scrollYProgress, [0, 1], [0.3, 0])
            }} 
          />

          {/* Massive GlassCard Wrapping the Preview */}
          <div 
            className="relative rounded-[2.5rem] overflow-hidden bg-surface-glass-regular backdrop-blur-thick border-0 p-2 sm:p-4"
            style={{ boxShadow: 'var(--shadow-elevation4), var(--glass-bevel)' }}
          >
            <div 
              className="relative rounded-[1.5rem] overflow-hidden bg-background/80 border-0"
              style={{ boxShadow: 'var(--shadow-sm), var(--glass-bevel)' }}
            >
              <DesktopPreview />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
