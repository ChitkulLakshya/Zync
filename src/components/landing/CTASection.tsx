import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/signup", { state: { email } });
  };

  return (
    <section id="cta" className="py-20 lg:py-28 bg-sidebar relative overflow-hidden scroll-mt-20">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
        backgroundSize: '24px 24px'
      }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-serif-elegant text-sidebar-foreground">
            Be an early builder
          </h2>
          <p className="text-lg text-sidebar-foreground/70 mb-10 leading-relaxed">
            Zync is in active development. Join the beta to help shape how teams
            build software—and get free access while we grow.
          </p>

          {/* Email Form */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-4">
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 px-5 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40"
            />
            <Button variant="hero" size="lg" className="whitespace-nowrap" onClick={handleGetStarted}>
              Request Access
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>

          <p className="text-sm text-sidebar-foreground/50">
            Free during beta · We'll never spam you
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
