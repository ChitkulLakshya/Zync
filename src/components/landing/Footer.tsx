import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { animate } from "framer-motion";

const Footer = () => {
  const scrollToSection = (sectionId: string) => {
    if (window.location.pathname !== '/') {
      window.location.href = `/#${sectionId}`;
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      let top = element.getBoundingClientRect().top + window.scrollY;
      if (sectionId !== 'home') {
        top -= 80; // account for navbar
      }
      if (sectionId === 'mobile' && window.innerWidth >= 1024) {
        top = element.getBoundingClientRect().top + window.scrollY + element.offsetHeight - window.innerHeight;
      }
      animate(window.scrollY, top, {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (value) => window.scrollTo(0, value)
      });
    }
  };

  return (
    <footer className="bg-background relative overflow-hidden pt-20 md:pt-32 pb-6 border-t border-border/10 w-full">
      {/* Main Grid Content */}
      <div className="w-full px-6 md:px-16 lg:px-24 xl:px-32 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-x-6 md:gap-x-8 gap-y-12 md:gap-y-16 mb-24 md:mb-40">
          
          {/* SITEMAP */}
          <div className="col-span-1 lg:col-span-2">
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

          {/* COMPANY */}
          <div className="col-span-1 lg:col-span-2">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-6 font-bold">Company</h4>
            <ul className="space-y-4">
              <li>
                <Link to="/privacy" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Terms of Service</Link>
              </li>
            </ul>
          </div>

          {/* CONTACT */}
          <div className="col-span-1 lg:col-span-2">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-6 font-bold">Contact</h4>
            <ul className="space-y-4">
              <li>
                <a href="mailto:support@zync.meet" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Support</a>
              </li>
              <li>
                <a href="https://github.com/zync-meet/Zync/discussions" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Discussions</a>
              </li>
              <li>
                <a href="https://github.com/zync-meet/Zync/issues/new?labels=bug&title=%5BBUG%5D+" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Report Issue</a>
              </li>
            </ul>
          </div>

          {/* CTA / GET STARTED */}
          <div className="col-span-2 md:col-span-4 lg:col-span-4 lg:col-start-9">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-6 font-bold">Get Started</h4>
            <p className="text-lg font-medium text-foreground mb-6 leading-snug">
              You read this far. Might as well see what Zync can do for your team.
            </p>
            <Link to="/signup" className="text-[10px] font-bold uppercase tracking-widest text-foreground hover:text-primary transition-colors flex items-center gap-1.5 pb-1 border-b border-foreground/30 hover:border-primary w-max mb-6">
              Create an account <ArrowRight className="w-3 h-3" />
            </Link>
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed uppercase tracking-wider font-mono">
              Open source project by 3 students. <br/> Currently under heavy development.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center text-[10px] text-muted-foreground font-mono uppercase tracking-widest border-t border-border/10 pt-8 pb-4 text-center md:text-left">
          <p className="mb-6 md:mb-0">©2026 ZYNC. ALL RIGHTS RESERVED.</p>
          
          <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-6 md:mb-0">
            <a href="https://github.com/zync-meet/Zync" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GITHUB</a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">TWITTER / X</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">LINKEDIN</a>
          </div>
          
          <p>UNDER HEAVY DEVELOPMENT</p>
        </div>
      </div>

      {/* Giant Watermark Logo */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none select-none overflow-hidden -z-0 translate-y-[25%] md:translate-y-[35%] opacity-[0.02]">
        <span className="text-[50vw] md:text-[28vw] lg:text-[32vw] font-black tracking-tighter leading-none text-foreground whitespace-nowrap">
          ZYNC
        </span>
      </div>
    </footer>
  );
};

export default Footer;
