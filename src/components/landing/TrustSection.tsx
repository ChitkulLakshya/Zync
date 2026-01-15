import { Star } from "lucide-react";

const TrustSection = () => {
  const companies = [
    "Google",
    "Dropbox",
    "Uber",
    "Microsoft",
    "Zendesk",
  ];

  return (
    <section className="py-12 bg-background border-y border-border/50">
      <div className="container mx-auto px-4">
        <p className="text-center text-muted-foreground text-sm mb-8">
          Today <span className="font-semibold text-foreground">14,297</span> companies worldwide are using Zync to increase their productivity
        </p>

        {/* Company Logos */}
        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16 mb-8">
          {companies.map((company) => (
            <div
              key={company}
              className="text-xl lg:text-2xl font-bold text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              {company}
            </div>
          ))}
        </div>

        {/* Rating */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-card rounded-full border border-border/50 shadow-sm">
            <span className="text-sm font-semibold text-foreground">Rating</span>
            <span className="text-sm font-bold text-foreground">4.6</span>
            <div className="flex gap-0.5 ml-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < 4 ? "fill-task-yellow text-task-yellow" : i === 4 ? "fill-task-yellow/50 text-task-yellow/50" : "text-border"}`}
                />
              ))}
            </div>
          </div>
          <span className="text-sm text-muted-foreground">based on 1,540 reviews</span>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
