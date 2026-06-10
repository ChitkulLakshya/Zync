import { Users, Zap, Globe } from "lucide-react";

const TrustSection = () => {
  const highlights = [
    {
      icon: Users,
      label: "Early Access",
      value: "Join the founding community of developers building the future of team collaboration",
    },
    {
      icon: Zap,
      label: "Built for Speed",
      value: "Local-first architecture with offline support and instant sync",
    },
    {
      icon: Globe,
      label: "Distributed-First",
      value: "Designed for remote teams with real-time presence and timezone awareness",
    },
  ];

  return (
    <section className="py-12 bg-background border-y border-border/10">
      <div className="container mx-auto px-4">
        <p className="text-center text-lg font-semibold text-foreground mb-8">
          Built by developers, for developers
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {highlights.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center text-center gap-2 p-4"
            >
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mb-1">
                <item.icon className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{item.label}</h3>
              <p className="text-xs text-muted-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
