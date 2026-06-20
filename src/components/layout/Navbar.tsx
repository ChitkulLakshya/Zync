import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsOpen(false);
  };

  const navItems = [
    { name: "Features", action: () => scrollToSection('features') },
    { name: "Mobile App", action: () => scrollToSection('mobile') },
    { name: "Contact", action: () => scrollToSection('cta') },
  ];

  const isPill = isScrolled && !isOpen;

  return (
    <nav 
      className={`fixed left-1/2 -translate-x-1/2 z-50 box-border transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] border ${
        isPill 
          ? "top-6 w-[90%] max-w-[896px] rounded-full bg-surface-glass-regular backdrop-blur-thick border-white/10"
          : "top-0 w-[100%] max-w-[3000px] rounded-none bg-background/70 backdrop-blur-md border-transparent border-b-white/5"
      }`}
      style={{
        boxShadow: isPill ? '0 16px 40px -8px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)' : 'none'
      }}
    >
      <div className={`mx-auto w-full transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isPill ? "max-w-4xl px-6 lg:px-8" : "max-w-7xl px-4 lg:px-8"
      }`}>
        <div className="flex items-center justify-between h-16 lg:h-20 w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            {mounted ? (
              <img
                src={resolvedTheme === "dark" ? "/zync-dark.webp" : "/zync-white.webp"}
                alt="Zync Logo"
                className="h-8 w-auto object-contain rounded-lg"
              />
            ) : (
              <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
                <span className="text-background font-bold text-lg">Z</span>
              </div>
            )}
            <span className="font-serif-elegant font-bold text-xl tracking-tight text-foreground">
              Zync
            </span>
            <span className="text-[10px] font-medium text-foreground bg-secondary/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Beta
            </span>
          </Link>

          {}
          <div className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={item.action}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {item.name}
              </button>
            ))}
          </div>

          {}
          <div className="hidden lg:flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="default">
                Log In
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="hero" size="default">
                Join Beta
              </Button>
            </Link>
          </div>

          {}
          <div className="flex lg:hidden items-center gap-2">
            <ThemeToggle />
            <button
              className="p-2 text-foreground"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {}
        {isOpen && (
          <div className="lg:hidden py-4 border-t border-border/10 animate-fade-in">
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={item.action}
                  className="text-left text-muted-foreground hover:text-foreground transition-colors font-medium py-2"
                >
                  {item.name}
                </button>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border/10">
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" className="w-full justify-center">
                    Log In
                  </Button>
                </Link>
                <Link to="/signup" onClick={() => setIsOpen(false)}>
                  <Button variant="hero" className="w-full justify-center">
                    Join Beta
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
