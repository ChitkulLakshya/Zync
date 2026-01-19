import { Smartphone, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
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
          {/* Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-task-orange/10 border border-task-orange/20 rounded-full mb-6">
              <Smartphone className="w-3.5 h-3.5 text-task-orange" />
              <span className="text-xs font-medium text-task-orange">Coming Soon</span>
            </div>

            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 font-serif-elegant">
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

          {/* Phone Mockup - Using MobilePreview */}
          <div className="relative flex justify-center">
            {/* Subtle glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-task-teal/5 rounded-full blur-3xl" />

            <div className="relative">
              <MobilePreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MobileAppSection;
