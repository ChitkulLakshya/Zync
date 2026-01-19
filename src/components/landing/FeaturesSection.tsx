import {
  Users,
  GitBranch,
  Calendar,
  MessageSquare,
  Bell,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FeaturesSection = () => {
  const features = [
    {
      icon: Sparkles,
      title: "AI Project Setup",
      description: "Describe your idea and get a complete project structure, workflows, and task breakdown in seconds.",
      color: "bg-task-purple/10 text-task-purple",
    },
    {
      icon: GitBranch,
      title: "GitHub Sync",
      description: "Connect repositories and auto-complete tasks when commits are pushed. Your code drives your workflow.",
      color: "bg-task-green/10 text-task-green",
    },
    {
      icon: Users,
      title: "Team Workspaces",
      description: "Invite your team, assign tasks, and track progress in real-time. Everyone stays in sync.",
      color: "bg-primary/10 text-primary",
    },
    {
      icon: Calendar,
      title: "Smart Calendar",
      description: "See your team's schedule at a glance. Plan sprints, set deadlines, and balance workloads effectively.",
      color: "bg-task-orange/10 text-task-orange",
    },
    {
      icon: MessageSquare,
      title: "Built-in Chat",
      description: "Discuss tasks, share files, and schedule calls—all without leaving the project context.",
      color: "bg-task-teal/10 text-task-teal",
    },
    {
      icon: Bell,
      title: "Focused Notifications",
      description: "Get notified about what matters. Email and in-app alerts for assignments, deadlines, and updates.",
      color: "bg-task-pink/10 text-task-pink",
    },
  ];

  return (
    <section id="features" className="py-20 lg:py-28 bg-background scroll-mt-20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-serif-elegant">
            Everything to ship faster
          </h2>
          <p className="text-lg text-muted-foreground">
            From AI-powered planning to GitHub integration—the tools your team needs,
            without the bloat.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-20">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 bg-card rounded-xl border border-border/50 hover:border-border transition-colors"
            >
              <div className={`w-11 h-11 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Feature Highlight - Team Management */}
        <div className="grid lg:grid-cols-2 gap-12 items-center py-16 border-t border-border/30">
          <div className="order-2 lg:order-1">
            <div className="bg-card rounded-xl border border-border/50 p-5 overflow-hidden">
              {/* Team List Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <h4 className="font-medium text-foreground text-sm">Team</h4>
                  <Button size="sm" variant="ghost" className="text-xs h-7">+ Invite</Button>
                </div>
                {[
                  { name: "Alex Johnson", role: "Admin", avatar: "AJ", status: "online" },
                  { name: "Sarah Chen", role: "Developer", avatar: "SC", status: "online" },
                  { name: "Mike Wilson", role: "Designer", avatar: "MW", status: "away" },
                ].map((member) => (
                  <div key={member.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {member.avatar}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${member.status === "online" ? "bg-task-green" : member.status === "away" ? "bg-task-yellow" : "bg-muted"
                        }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm truncate">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 font-serif-elegant text-foreground">
              Built for real teams
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Create workspaces for different projects or teams. Assign roles, manage permissions,
              and keep everyone aligned—whether you're a duo or a growing startup.
            </p>
            <div className="space-y-2.5">
              {["Role-based access", "Live presence indicators", "Activity feed"].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-task-green flex-shrink-0" />
                  <span className="text-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Highlight - Calendar */}
        <div className="grid lg:grid-cols-2 gap-12 items-center py-16 border-t border-border/30">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4 font-serif-elegant">
              Know what's happening, always
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              No more "what are you working on?" messages. The calendar view shows everyone's
              schedule, upcoming deadlines, and who has capacity.
            </p>
            <div className="space-y-2.5">
              {["Weekly schedule view", "Deadline tracking", "Workload visibility"].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-task-green flex-shrink-0" />
                  <span className="text-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="bg-card rounded-xl border border-border/50 p-5 overflow-hidden">
              {/* Calendar Preview */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-foreground text-sm">January 2026</h4>
                <div className="flex gap-1">
                  <button className="p-1 hover:bg-secondary rounded transition-colors text-muted-foreground text-xs">←</button>
                  <button className="p-1 hover:bg-secondary rounded transition-colors text-muted-foreground text-xs">→</button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center mb-1.5">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="text-[10px] text-muted-foreground font-medium py-1.5">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {[...Array(35)].map((_, i) => {
                  const day = i - 3;
                  const isToday = day === 19;
                  const hasTask = [5, 8, 12, 15, 22].includes(day);
                  return (
                    <div
                      key={i}
                      className={`aspect-square flex flex-col items-center justify-center rounded text-xs transition-colors ${day < 1 || day > 31 ? "text-muted-foreground/20" :
                          isToday ? "bg-primary text-primary-foreground font-medium" :
                            "text-foreground hover:bg-secondary"
                        }`}
                    >
                      {day >= 1 && day <= 31 && (
                        <>
                          {day}
                          {hasTask && !isToday && (
                            <div className="w-1 h-1 rounded-full bg-task-orange mt-0.5" />
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
