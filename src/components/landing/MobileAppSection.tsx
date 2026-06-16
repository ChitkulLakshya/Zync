import { Smartphone, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MobilePreview from "@/components/landing/MobilePreview";

const MobileAppSection = () => {
  const navigate = useNavigate();

  const handleNotifyMe = () => {
    navigate("/signup", { state: { source: "mobile-waitlist" } });
  };

  return (
    <section id="mobile" className="py-20 lg:py-28 bg-secondary/20 overflow-hidden scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-task-orange/10 border border-task-orange/20 rounded-full mb-6">
              <Smartphone className="w-3.5 h-3.5 text-task-orange" />
              <span className="text-xs font-medium text-task-orange">Coming Soon</span>
            </div>

            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 ">
              Your workspace, in your pocket
            </h2>

            <p className="text-muted-foreground mb-8 leading-relaxed">
              The Zync mobile app is in development. Check task progress, respond to messages,
              and stay connected with your team—wherever you are.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="lg" className="gap-2" onClick={handleNotifyMe}>
                <Bell className="w-4 h-4" />
                Notify me when ready
              </Button>
            </div>
          </div>

          {}
          <motion.div 
            className="relative flex justify-center [perspective:1500px]"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-task-teal/5 rounded-full blur-3xl" />

            <motion.div 
              className="relative"
              variants={{
                hidden: { 
                  x: 450, 
                  rotateX: 75, 
                  rotateY: 0, 
                  rotateZ: -35,
                  scale: 0.85, 
                  opacity: 0 
                },
                visible: { 
                  x: 0, 
                  rotateX: 0, 
                  rotateY: 0, 
                  rotateZ: 0,
                  scale: 1, 
                  opacity: 1,
                  transition: { 
                    type: "spring", 
                    stiffness: 45, 
                    damping: 15,
                    mass: 1.2
                  }
                }
              }}
              style={{ 
                transformOrigin: "bottom center",
                transformStyle: "preserve-3d"
              }}
            >
              <MobilePreview />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MobileAppSection;
