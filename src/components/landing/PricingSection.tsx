import { Button } from "@/components/ui/button";
import { Check, Zap } from "lucide-react";

const PricingSection = () => {
  const plans = [
    {
      name: "Starter",
      price: "Free",
      description: "Perfect for individuals and small teams getting started.",
      features: [
        "Up to 5 team members",
        "3 active projects",
        "Basic task management",
        "GitHub integration",
        "Email notifications",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      price: "$12",
      period: "/user/month",
      description: "For growing teams that need more power and flexibility.",
      features: [
        "Unlimited team members",
        "Unlimited projects",
        "AI-powered architecture",
        "Advanced analytics",
        "Priority support",
        "Custom workflows",
        "Video meetings integration",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations with advanced security needs.",
      features: [
        "Everything in Pro",
        "SSO authentication",
        "Advanced security",
        "Dedicated support",
        "Custom integrations",
        "SLA guarantee",
        "On-premise option",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <section className="py-20 lg:py-32 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Start for free and scale as you grow. No hidden fees, no surprises.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-card rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1 ${
                plan.popular
                  ? "border-primary shadow-xl scale-105 z-10"
                  : "border-border/50 shadow-lg hover:shadow-xl"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center gap-1 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-full">
                    <Zap className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-task-green mt-0.5 shrink-0" />
                    <span className="text-foreground text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? "hero" : "outline"}
                className="w-full"
                size="lg"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
