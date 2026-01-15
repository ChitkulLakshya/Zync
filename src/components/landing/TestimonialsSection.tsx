import { Star } from "lucide-react";

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "CTO at TechStart",
      avatar: "SC",
      content: "ZYNC transformed how our team collaborates. The AI-powered architecture generation saved us weeks of planning time.",
      rating: 5,
    },
    {
      name: "Michael Torres",
      role: "Product Lead at DigitalAgency",
      avatar: "MT",
      content: "The GitHub integration is seamless. Our developers love that tasks auto-complete when they push code. It's brilliant!",
      rating: 5,
    },
    {
      name: "Emily Johnson",
      role: "Founder at StartupHub",
      avatar: "EJ",
      content: "We tried many project management tools before. ZYNC is the only one that actually understands software development workflows.",
      rating: 5,
    },
  ];

  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Loved by teams worldwide
          </h2>
          <p className="text-lg text-muted-foreground">
            See what developers and project managers say about ZYNC.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="bg-card rounded-2xl border border-border/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-task-yellow text-task-yellow" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground leading-relaxed mb-6">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
