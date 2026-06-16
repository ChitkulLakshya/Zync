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
import { ProjectSetupWalkthrough } from "./ProjectSetupWalkthrough";
import { GithubSyncWalkthrough } from "./GithubSyncWalkthrough";
import { SmartCalendarWalkthrough } from "./SmartCalendarWalkthrough";
import { MultiplayerWalkthrough } from "./MultiplayerWalkthrough";
import { BuiltinChatWalkthrough } from "./BuiltinChatWalkthrough";
import { FocusedNotificationsWalkthrough } from "./FocusedNotificationsWalkthrough";

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
      color: "bg-secondary/20 text-foreground",
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
    <section id="features" className="py-20 lg:py-28 scroll-mt-20">
      <div className="container mx-auto px-4">
        {}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 ">
            Everything to ship faster
          </h2>
          <p className="text-lg text-muted-foreground">
            From AI-powered planning to GitHub integration—the tools your team needs,
            without the bloat.
          </p>
        </div>

        {/* Bento Box Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-20">
          
          {/* AI Project Setup - Interactive Walkthrough */}
          <div className="lg:col-span-8 group p-6 sm:p-8 glass-card flex flex-col md:flex-row items-center gap-8 overflow-hidden relative min-h-[400px]">
            <div className="absolute inset-0 bg-secondary/30 pointer-events-none" />
            
            <div className="flex-1 space-y-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-background border-0 flex items-center justify-center mb-2 shadow-sm" style={{ boxShadow: 'var(--shadow-sm), var(--glass-bevel)' }}>
                <Sparkles className="w-5 h-5 text-foreground/80" />
              </div>
              <h3 className="text-2xl font-bold text-foreground ">
                AI Project Setup
              </h3>
              <p className="text-muted-foreground text-base leading-relaxed max-w-sm font-light">
                Describe your idea and get a complete project structure, workflows, and task breakdown in seconds. Watch it happen live.
              </p>
            </div>
            
            <div className="flex-[1.5] w-full flex justify-center lg:justify-end relative z-10">
               <ProjectSetupWalkthrough />
            </div>
          </div>

          {/* GitHub Sync - Interactive Walkthrough */}
          <div className="lg:col-span-4 group p-6 sm:p-8 glass-card flex flex-col relative overflow-hidden">
             <div className="absolute inset-0 bg-secondary/30 pointer-events-none" />
             <div className="w-12 h-12 rounded-2xl bg-background border-0 flex items-center justify-center mb-6 shadow-sm" style={{ boxShadow: 'var(--shadow-sm), var(--glass-bevel)' }}>
                <GitBranch className="w-5 h-5 text-foreground/80" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 ">
                GitHub Sync
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 font-light">
                Connect repositories and auto-complete tasks when commits are pushed. Your code drives your workflow.
              </p>
              
              <div className="mt-auto w-full relative z-10 flex justify-center">
                 <GithubSyncWalkthrough />
              </div>
          </div>
        </div>

        {/* Team Workspaces */}
        <div className="grid lg:grid-cols-2 gap-12 items-center py-16 border-t border-border/30">
          <div className="order-2 lg:order-1">
            <div className="relative z-10 flex justify-center lg:justify-start">
              <div className="w-full max-w-sm flex justify-center relative">
                <div className="absolute inset-0 bg-secondary/50 blur-3xl -z-10 rounded-full mix-blend-multiply" />
                <MultiplayerWalkthrough />
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Team Workspaces
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed font-light">
              Invite your team, assign tasks, and track progress in real-time. Everyone stays in sync.
            </p>
            <div className="space-y-2.5">
              {["Role-based access", "Live presence indicators", "Activity feed"].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-foreground/60 flex-shrink-0" />
                  <span className="text-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Smart Calendar */}
        <div className="grid lg:grid-cols-2 gap-12 items-center py-16 border-t border-border/30">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Smart Calendar
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed font-light">
              See your team's schedule at a glance. Plan sprints, set deadlines, and balance workloads effectively.
            </p>
            <div className="space-y-2.5">
              {["Weekly schedule view", "Deadline tracking", "Workload visibility"].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-foreground/60 flex-shrink-0" />
                  <span className="text-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10 flex justify-center lg:justify-end">
            <div className="w-full max-w-sm flex justify-center relative">
              <div className="absolute inset-0 bg-secondary/50 blur-3xl -z-10 rounded-full mix-blend-multiply" />
              <SmartCalendarWalkthrough />
            </div>
          </div>
        </div>

        {/* Built-in Chat */}
        <div className="grid lg:grid-cols-2 gap-12 items-center py-16 border-t border-border/30">
          <div className="order-2 lg:order-1">
            <div className="relative z-10 flex justify-center lg:justify-start">
              <div className="w-full max-w-sm flex justify-center relative">
                <div className="absolute inset-0 bg-secondary/50 blur-3xl -z-10 rounded-full mix-blend-multiply" />
                <BuiltinChatWalkthrough />
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Built-in Chat
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed font-light">
              Discuss tasks, share files, and schedule calls—all without leaving the project context.
            </p>
            <div className="space-y-2.5">
              {["Contextual threads", "File sharing", "Instant meetings"].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-foreground/60 flex-shrink-0" />
                  <span className="text-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Focused Notifications */}
        <div className="grid lg:grid-cols-2 gap-12 items-center py-16 border-t border-border/30">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Focused Notifications
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed font-light">
              Get notified about what matters. Email and in-app alerts for assignments, deadlines, and updates.
            </p>
            <div className="space-y-2.5">
              {["Smart filtering", "Custom triggers", "Actionable alerts"].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-foreground/60 flex-shrink-0" />
                  <span className="text-foreground text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10 flex justify-center lg:justify-end">
            <div className="w-full max-w-sm flex justify-center relative">
              <div className="absolute inset-0 bg-secondary/50 blur-3xl -z-10 rounded-full mix-blend-multiply" />
              <FocusedNotificationsWalkthrough />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
