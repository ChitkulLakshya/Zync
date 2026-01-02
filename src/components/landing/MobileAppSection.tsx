import { Smartphone, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileView from "@/components/views/MobileView";

const MobileAppSection = () => {
  return (
    <section className="py-20 lg:py-32 bg-secondary/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
              <Smartphone className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Mobile App Available</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Manage your teamwork wherever you are
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8">
              Imagine that your team's daily planner is always in your pocket. You can take a phone and 
              check work progress anytime, anywhere, even when you're out of the office. Keep control 
              even when you're on the go.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button variant="hero" size="lg" className="gap-2">
                <Download className="w-5 h-5" />
                Download for iOS
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                <Download className="w-5 h-5" />
                Download for Android
              </Button>
            </div>
          </div>

          {/* Phone Mockups */}
          <div className="relative flex justify-center">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-task-teal/10 rounded-full blur-3xl" />
            
            <MobileView />

            {/* Floating elements */}
            <div className="absolute top-20 -right-4 bg-card rounded-xl shadow-lg p-3 border border-border/50 animate-float z-20">
              <div className="text-xs font-medium text-foreground">✓ Task completed</div>
            </div>
            <div className="absolute bottom-32 -left-4 bg-card rounded-xl shadow-lg p-3 border border-border/50 animate-float z-20" style={{ animationDelay: '1s' }}>
              <div className="text-xs font-medium text-foreground">🔔 New assignment</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MobileAppSection;
