import BetaOnboarding from "@/components/landing/BetaOnboarding";

const CTASection = () => {
  return (
    <section id="cta" className="py-20 lg:py-28 relative overflow-hidden scroll-mt-20">
      {}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
        backgroundSize: '24px 24px'
      }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Be an early <span className="font-serif italic text-primary">builder</span>
          </h2>
          <p className="text-lg text-foreground/70 mb-10 leading-relaxed">
            We are looking for <span className="font-serif italic text-primary">passionate developers</span>, <span className="font-serif italic text-primary">designers</span>, and <span className="font-serif italic text-primary">open-source enthusiasts</span> who want to help shape the future of collaboration. Connect your GitHub, start contributing, and raise pull requests for better changes.
          </p>

          <BetaOnboarding />

          <p className="text-sm text-foreground/50 mt-6">
            Open Source · Build together · Shape the future
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
