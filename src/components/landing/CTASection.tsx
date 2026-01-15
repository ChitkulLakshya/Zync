import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles } from "lucide-react";

const CTASection = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/signup", { state: { email } });
  };

  return (
    <section className="py-20 lg:py-32 bg-sidebar relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-sidebar-foreground">Start your free trial today</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold mb-6 font-serif-elegant">
            Ready to get in <span className="italic text-indigo-400">Zync</span>?
          </h2>
          <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of modern teams who have already switched to a better way of working.
          </p>

          {/* Email Form */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
            <Input
              type="email"
              placeholder="Enter your e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 px-5 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
            />
            <Button variant="hero" size="lg" className="whitespace-nowrap" onClick={handleGetStarted}>
              Get Started
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <p className="text-sm text-sidebar-foreground/50">
            Try it for free. No credit card required.
          </p>
        </div>
      </div>
    </section >
  );
};

export default CTASection;
