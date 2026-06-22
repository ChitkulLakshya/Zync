import { useRef } from "react";
import { Smartphone, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import MobilePreview from "@/components/landing/MobilePreview";

const MobileAppSection = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"]
  });

  const x = useTransform(scrollYProgress, [0, 0.7, 1], [450, 0, 0]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [45, 0, 0]);
  const rotateZ = useTransform(scrollYProgress, [0, 0.5, 1], [-15, 0, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 1], [0.4, 1, 1]);

  const handleNotifyMe = () => {
    navigate("/signup", { state: { source: "mobile-waitlist" } });
  };

  return (
    <section id="mobile" ref={containerRef} className="relative h-[200vh] scroll-mt-20">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
          {}
          <div>
            <div 
              className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-surface-glass-thin backdrop-blur-md rounded-full mb-6 border border-black/5 dark:border-white/5"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <Smartphone className="w-3.5 h-3.5 text-task-orange" />
              <span className="text-xs font-medium tracking-wide text-foreground/80">
                Coming Soon
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 ">
              Your workspace, in your pocket
            </h2>

            <p className="text-muted-foreground mb-8 leading-relaxed">
              The Zync mobile app is in development. Check task progress, respond to messages,
              and stay connected with your team—wherever you are.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 rounded-full"
                onClick={handleNotifyMe}
              >
                <Bell className="w-4 h-4" />
                Notify me when ready
              </Button>
            </div>
          </div>
          {/* Right Side: Mobile App Preview */}
          <div className="relative flex justify-center [perspective:1500px] py-12 lg:py-16">
            <motion.div 
              className="relative"
              style={{ 
                rotateX, 
                rotateZ, 
                scale, 
                opacity,
                transformOrigin: "bottom center"
              }}
            >
              <MobilePreview />
            </motion.div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
};

export default MobileAppSection;
