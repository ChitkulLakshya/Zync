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

  useEffect(() => {
    setMounted(true);
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            {mounted ? (
              <img
                src={resolvedTheme === 'dark' ? '/zync-dark.webp' : '/zync-white.webp'}
                alt="Zync Logo"
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">Z</span>
              </div>
            )}
            <span className="font-serif-elegant font-bold text-xl tracking-tight text-foreground">
              Zync
            </span>
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Beta
            </span>
          </Link>

          {/* Desktop Navigation */}
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

          {/* Desktop Auth Buttons */}
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

          {/* Mobile Menu Button */}
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

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden py-4 border-t border-border/50 animate-fade-in">
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
              <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
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
