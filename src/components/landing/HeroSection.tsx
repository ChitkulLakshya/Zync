import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Play, CheckCircle2 } from "lucide-react";

const HeroSection = () => {
  const [email, setEmail] = useState("");

  const features = [
    "AI-powered project architecture",
    "GitHub integration",
    "Real-time collaboration",
  ];

  return (
    <section className="relative pt-24 lg:pt-32 pb-16 lg:pb-24 hero-gradient overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      
      {/* Floating decorative shapes */}
      <div className="absolute top-40 right-[15%] w-4 h-4 bg-task-orange rounded-full floating-element opacity-60" />
      <div className="absolute top-60 left-[10%] w-3 h-3 bg-task-teal rounded-full floating-element opacity-60" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-40 right-[20%] w-5 h-5 bg-task-pink rounded-full floating-element opacity-60" style={{ animationDelay: '2s' }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6 animate-fade-in-up">
            Manage your remote team even{" "}
            <span className="gradient-text">better than in the office</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in-up animate-delay-100">
            ProjectFlow is a beautiful online software for effective team collaboration,
            project management, task planning, and execution.
          </p>

          {/* Email Input Form */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6 animate-fade-in-up animate-delay-200">
            <Input
              type="email"
              placeholder="Enter your e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 px-5 bg-card border-border/50 text-foreground placeholder:text-muted-foreground"
            />
            <Button variant="hero" size="lg" className="whitespace-nowrap">
              Get Started
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Trial text */}
          <p className="text-sm text-muted-foreground mb-10 animate-fade-in-up animate-delay-300">
            Try it for free. No credit card required.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4 mb-12 animate-fade-in-up animate-delay-300">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-task-green" />
                <span className="text-sm font-medium text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="relative max-w-6xl mx-auto animate-scale-in animate-delay-500">
          <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-secondary/50 border-b border-border/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-task-yellow/60" />
                <div className="w-3 h-3 rounded-full bg-task-green/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-background/80 rounded-md px-4 py-1 text-xs text-muted-foreground max-w-xs truncate">
                  app.projectflow.io/dashboard
                </div>
              </div>
            </div>
            
            {/* Dashboard Content */}
            <div className="flex h-[400px] lg:h-[500px]">
              {/* Sidebar */}
              <div className="hidden md:flex flex-col w-56 bg-sidebar border-r border-sidebar-border p-4">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">P</span>
                  </div>
                  <span className="text-sm font-semibold text-sidebar-foreground">ProjectFlow</span>
                </div>
                
                <div className="space-y-1">
                  {["Dashboard", "My Projects", "Schedule", "Tasks", "Notes", "Files"].map((item, i) => (
                    <div
                      key={item}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        i === 0
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-auto">
                  <div className="px-3 py-2 text-xs text-sidebar-foreground/50 uppercase tracking-wider">Teams</div>
                  {["Marketing", "Development", "Design"].map((team) => (
                    <div key={team} className="px-3 py-1.5 text-sm text-sidebar-foreground/70">
                      {team}
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 bg-background p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-foreground">Tasks</span>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">Week view</span>
                      <span className="px-3 py-1 text-muted-foreground text-xs font-medium rounded-full hover:bg-secondary transition-colors cursor-pointer">Today</span>
                    </div>
                  </div>
                  <Button size="sm" variant="hero">+ Add new</Button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-5 gap-3">
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, dayIndex) => (
                    <div key={day} className="space-y-2">
                      <div className="text-xs text-muted-foreground font-medium text-center pb-2 border-b border-border/50">
                        {day}
                      </div>
                      <div className="space-y-2">
                        {[...Array(3)].map((_, taskIndex) => {
                          const colors = ["bg-task-orange/20 border-task-orange/30", "bg-task-teal/20 border-task-teal/30", "bg-task-pink/20 border-task-pink/30", "bg-task-green/20 border-task-green/30", "bg-task-purple/20 border-task-purple/30"];
                          const color = colors[(dayIndex + taskIndex) % colors.length];
                          return (
                            <div
                              key={taskIndex}
                              className={`p-2 rounded-lg border ${color} transition-transform hover:scale-105 cursor-pointer`}
                            >
                              <div className="text-xs font-medium text-foreground truncate">Task {dayIndex * 3 + taskIndex + 1}</div>
                              <div className="text-[10px] text-muted-foreground mt-1">2h • Due today</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Shadow effect */}
          <div className="absolute -inset-4 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
