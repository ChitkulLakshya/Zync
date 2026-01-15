import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import DesktopView from "@/components/views/DesktopView";

const HeroSection = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/signup", { state: { email } });
  };

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
            ZYNC is a beautiful online software for effective team collaboration,
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
            <Button variant="hero" size="lg" className="whitespace-nowrap" onClick={handleGetStarted}>
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

        {/* Dashboard Preview - Desktop View */}
        <div className="relative max-w-6xl mx-auto animate-scale-in animate-delay-500">
          <DesktopView isPreview={true} />
          {/* Shadow effect */}
          <div className="absolute -inset-4 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
