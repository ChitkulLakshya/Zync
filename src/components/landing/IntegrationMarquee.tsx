import { Github, Hash, Layout, Layers, BookOpen, Code, Figma, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const integrations = [
  { name: "GitHub", icon: Github, color: "group-hover/item:text-foreground" },
  { name: "Slack", icon: Hash, color: "group-hover/item:text-[#E01E5A]" },
  { name: "Jira", icon: Layout, color: "group-hover/item:text-[#0052CC]" },
  { name: "Linear", icon: Layers, color: "group-hover/item:text-[#5E6AD2]" },
  { name: "Notion", icon: BookOpen, color: "group-hover/item:text-foreground" },
  { name: "VS Code", icon: Code, color: "group-hover/item:text-[#007ACC]" },
  { name: "Figma", icon: Figma, color: "group-hover/item:text-[#F24E1E]" },
  { name: "Discord", icon: MessageCircle, color: "group-hover/item:text-[#5865F2]" },
];

export const IntegrationMarquee = () => {
  return (
    <div className="w-full relative overflow-hidden py-16 bg-transparent flex flex-col items-center">
      <p className="text-sm font-semibold text-muted-foreground/60 uppercase tracking-[0.2em] mb-12 text-center px-4">
        Integrates seamlessly with your tools
      </p>

      {/* Marquee Container */}
      <div className="relative flex gap-8 w-full overflow-hidden group">
        
        {/* Soft edge gradients for fading effect */}
        <div className="absolute inset-y-0 left-0 w-24 sm:w-48 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 sm:w-48 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        {/* Marquee Content Tracks */}
        {[0, 1].map((track) => (
          <div 
            key={track} 
            className="flex gap-8 shrink-0 animate-marquee group-hover:[animation-play-state:paused]" 
            aria-hidden={track === 1}
          >
            {integrations.map((item, idx) => (
              <div 
                key={idx} 
                className="group/item flex items-center gap-3.5 px-6 py-3.5 rounded-[1.25rem] bg-card/40 backdrop-blur-md border border-border/40 text-muted-foreground transition-all duration-300 shadow-[var(--shadow-elevation1)] hover:shadow-[var(--shadow-elevation3)] hover:-translate-y-1 hover:bg-card/80 cursor-pointer"
              >
                <item.icon className={cn("w-5 h-5 transition-colors duration-300", item.color)} />
                <span className="font-bold text-sm tracking-wide text-foreground/80 group-hover/item:text-foreground transition-colors duration-300">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
