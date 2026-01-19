import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Zap } from "lucide-react";
import DesktopPreview from "@/components/landing/DesktopPreview";

const HeroSection = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/signup", { state: { email } });
  };

  return (
    <section className="relative pt-28 lg:pt-36 pb-16 lg:pb-24 hero-gradient overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Beta Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-8 animate-fade-in">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold tracking-wider text-primary uppercase">
              Public Beta 1.0
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-foreground font-serif-elegant leading-[1.1]">
            Build software,
            <br />
            <span className="text-primary">together.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Zync brings your team's planning, tasks, and communication into one focused workspace.
            AI-powered project setup. GitHub integration. Real-time collaboration.
          </p>

          {/* Email Input Form */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-4">
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 px-5 bg-card border-border text-foreground placeholder:text-muted-foreground/60"
            />
            <Button variant="hero" size="lg" className="whitespace-nowrap" onClick={handleGetStarted}>
              Join the Beta
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>

          {/* Trial text */}
          <p className="text-sm text-muted-foreground/70 mb-16">
            Free during beta · No credit card required
          </p>
        </div>

        {/* Dashboard Preview - Using DesktopPreview */}
        <div className="relative max-w-6xl mx-auto">
          <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/5">
            <DesktopPreview />
          </div>
          {/* Fade overlay at bottom */}
          <div className="absolute -bottom-1 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
