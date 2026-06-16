import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const Footer = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer className="bg-background relative overflow-hidden pt-24 pb-6 border-t border-border/10">
      {/* Main Grid Content */}
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-x-8 gap-y-16 mb-32">
          
          {/* SITEMAP */}
          <div className="col-span-2 lg:col-span-2">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-6 font-bold">Sitemap</h4>
            <ul className="space-y-4">
              <li>
                <button onClick={() => scrollToSection('home')} className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Home</button>
              </li>
              <li>
                <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Features</button>
              </li>
              <li>
                <button onClick={() => scrollToSection('mobile')} className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Mobile App</button>
              </li>
              <li>
                <button onClick={() => scrollToSection('cta')} className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Get Started</button>
              </li>
            </ul>
          </div>

          {/* LEGAL */}
          <div className="col-span-2 lg:col-span-2">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-6 font-bold">Legal</h4>
            <ul className="space-y-4">
              <li>
                <Link to="/privacy" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link to="/cookies" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Cookie Policy</Link>
              </li>
            </ul>
          </div>

          {/* SOCIALS */}
          <div className="col-span-2 lg:col-span-2">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-6 font-bold">Community</h4>
            <ul className="space-y-4">
              <li>
                <a href="https://github.com/zync-meet/Zync" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">GitHub</a>
              </li>
              <li>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Twitter / X</a>
              </li>
              <li>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">LinkedIn</a>
              </li>
            </ul>
          </div>

          {/* CTA / NEWSLETTER */}
          <div className="col-span-2 md:col-span-4 lg:col-span-4 lg:col-start-9">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-6 font-bold">Join the Beta</h4>
            <p className="text-lg font-medium text-foreground mb-6 leading-snug">
              You read this far. Might as well see what Zync can do for your team.
            </p>
            <form className="flex items-end gap-4 border-b border-border/30 pb-2 focus-within:border-foreground/50 transition-colors" onSubmit={(e) => e.preventDefault()}>
              <div className="flex-1">
                <input 
                  type="email" 
                  placeholder="name@company.com" 
                  className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm placeholder:text-muted-foreground/50 text-foreground px-0"
                  required
                />
              </div>
              <button type="submit" className="text-[10px] font-bold uppercase tracking-widest text-foreground hover:text-task-green transition-colors flex items-center gap-1.5 shrink-0 pb-1">
                Join <ArrowRight className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center text-[10px] text-muted-foreground font-mono uppercase tracking-widest border-t border-border/10 pt-8 pb-4">
          <p className="mb-4 md:mb-0">©2026 ZYNC. ALL RIGHTS RESERVED.</p>
          
          <div className="flex gap-6 mb-4 md:mb-0">
            <a href="https://github.com/zync-meet/Zync" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GITHUB</a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">TWITTER</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">LINKEDIN</a>
          </div>
          
          <p>PUBLIC BETA 1.0</p>
        </div>
      </div>

      {/* Giant Watermark Logo */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none select-none overflow-hidden -z-0 translate-y-[28%] opacity-[0.02]">
        <span className="text-[28vw] font-black tracking-tighter leading-none text-foreground whitespace-nowrap">
          ZYNC
        </span>
      </div>
    </footer>
  );
};

export default Footer;
