import { 
  Users, 
  GitBranch, 
  Calendar, 
  MessageSquare, 
  Bell, 
  CheckCircle2,
  Sparkles,
  Video,
  BarChart3,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FeaturesSection = () => {
  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Architecture",
      description: "Simply describe your project idea and our AI generates complete architecture, workflows, and task breakdowns automatically.",
      color: "bg-task-purple/10 text-task-purple",
    },
    {
      icon: GitBranch,
      title: "GitHub Integration",
      description: "Connect your repositories and track commits. When team members push code, tasks are automatically marked complete.",
      color: "bg-task-green/10 text-task-green",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Assign tasks to team members, set deadlines and priorities. Monitor progress in real-time with live updates.",
      color: "bg-primary/10 text-primary",
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Schedule tasks and events in the calendar. See a detailed work plan for every team member, every day.",
      color: "bg-task-orange/10 text-task-orange",
    },
    {
      icon: MessageSquare,
      title: "In-App Communication",
      description: "Chat with your team, share files, and schedule Google Meet calls directly from the task interface.",
      color: "bg-task-teal/10 text-task-teal",
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Get notified via email and in-app when tasks are assigned, completed, or approaching deadlines.",
      color: "bg-task-pink/10 text-task-pink",
    },
  ];

  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Everything you need to manage{" "}
            <span className="gradient-text">software projects</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From AI-powered planning to GitHub integration, ProjectFlow has all the tools 
            your team needs to ship faster and collaborate better.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Feature Highlight - Team Management */}
        <div className="grid lg:grid-cols-2 gap-12 items-center py-16 border-t border-border/50">
          <div className="order-2 lg:order-1">
            <div className="bg-card rounded-2xl border border-border/50 shadow-lg p-6 overflow-hidden">
              {/* Team List Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-border/50">
                  <h4 className="font-semibold text-foreground">Team Members</h4>
                  <Button size="sm">+ Invite</Button>
                </div>
                {[
                  { name: "Alex Johnson", role: "Admin", avatar: "AJ", status: "online" },
                  { name: "Sarah Chen", role: "Developer", avatar: "SC", status: "online" },
                  { name: "Mike Wilson", role: "Designer", avatar: "MW", status: "away" },
                  { name: "Emily Davis", role: "Developer", avatar: "ED", status: "offline" },
                ].map((member, i) => (
                  <div key={member.name} className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                        {member.avatar}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                        member.status === "online" ? "bg-task-green" : member.status === "away" ? "bg-task-yellow" : "bg-muted"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{member.name}</div>
                      <div className="text-sm text-muted-foreground">{member.role}</div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      member.role === "Admin" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                    }`}>
                      {member.role}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Create teams and projects, invite your teammates
            </h3>
            <p className="text-lg text-muted-foreground mb-6">
              ProjectFlow allows you to create tasks and events at the team level or the project level. 
              Invite people from different teams, assign tasks to them, schedule appointments, and track progress.
            </p>
            <div className="space-y-3">
              {["Role-based permissions", "Real-time presence", "Activity tracking"].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-task-green" />
                  <span className="text-foreground font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Highlight - Calendar */}
        <div className="grid lg:grid-cols-2 gap-12 items-center py-16 border-t border-border/50">
          <div>
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              See a detailed work plan for every employee, every day
            </h3>
            <p className="text-lg text-muted-foreground mb-6">
              Have you ever had difficulties figuring out what your employees are working on? 
              ProjectFlow removes this chaos forever. Now each of your employees will have a complete 
              list of activities for today, tomorrow, and the following days.
            </p>
            <div className="space-y-3">
              {["Weekly schedule view", "Deadline tracking", "Workload balancing"].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-task-green" />
                  <span className="text-foreground font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="bg-card rounded-2xl border border-border/50 shadow-lg p-6 overflow-hidden">
              {/* Calendar Preview */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-foreground">January 2026</h4>
                <div className="flex gap-2">
                  <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors">←</button>
                  <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors">→</button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                  <div key={d} className="text-xs text-muted-foreground font-medium py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {[...Array(35)].map((_, i) => {
                  const day = i - 3;
                  const isToday = day === 2;
                  const hasTask = [5, 8, 12, 15, 19, 22].includes(day);
                  return (
                    <div
                      key={i}
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                        day < 1 || day > 31 ? "text-muted-foreground/30" : 
                        isToday ? "bg-primary text-primary-foreground font-semibold" : 
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
