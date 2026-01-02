import { Smartphone, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

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

          {/* Phone Mockup */}
          <div className="relative flex justify-center">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-task-teal/10 rounded-full blur-3xl" />
            
            {/* Phone Frame */}
            <div className="relative w-72 h-[580px] bg-sidebar rounded-[3rem] p-3 shadow-2xl">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-sidebar-foreground/20 rounded-full" />
              
              {/* Screen */}
              <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden">
                {/* Status Bar */}
                <div className="flex justify-between items-center px-6 py-3 text-xs text-foreground">
                  <span>9:41</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-2 bg-foreground/60 rounded-sm" />
                    <div className="w-4 h-2 bg-foreground/60 rounded-sm" />
                    <div className="w-6 h-3 bg-task-green rounded-sm" />
                  </div>
                </div>
                
                {/* App Content */}
                <div className="px-4 py-2">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-xs">P</span>
                      </div>
                      <span className="font-semibold text-foreground text-sm">ProjectFlow</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs">
                      👤
                    </div>
                  </div>

                  {/* Date Header */}
                  <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
                      <div
                        key={day}
                        className={`flex flex-col items-center min-w-[3rem] p-2 rounded-xl ${
                          i === 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <span className="text-xs">{day}</span>
                        <span className="text-sm font-semibold">{i + 5}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tasks */}
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground font-medium mb-2">Today's Tasks</div>
                    {[
                      { title: "Review PR #234", time: "9:00 AM", color: "bg-task-green/20 border-task-green/30" },
                      { title: "Team standup", time: "10:00 AM", color: "bg-task-teal/20 border-task-teal/30" },
                      { title: "Fix auth bug", time: "11:30 AM", color: "bg-task-orange/20 border-task-orange/30" },
                      { title: "Design review", time: "2:00 PM", color: "bg-task-pink/20 border-task-pink/30" },
                      { title: "Deploy v2.1", time: "4:00 PM", color: "bg-task-purple/20 border-task-purple/30" },
                    ].map((task) => (
                      <div
                        key={task.title}
                        className={`p-3 rounded-xl border ${task.color}`}
                      >
                        <div className="text-xs font-medium text-foreground">{task.title}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">{task.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute top-20 -right-4 bg-card rounded-xl shadow-lg p-3 border border-border/50 animate-float">
              <div className="text-xs font-medium text-foreground">✓ Task completed</div>
            </div>
            <div className="absolute bottom-32 -left-4 bg-card rounded-xl shadow-lg p-3 border border-border/50 animate-float" style={{ animationDelay: '1s' }}>
              <div className="text-xs font-medium text-foreground">🔔 New assignment</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MobileAppSection;
