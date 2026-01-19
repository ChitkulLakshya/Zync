import { Github, Twitter, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const footerLinks = {
    Product: [
      { name: "Features", action: () => scrollToSection('features') },
      { name: "Mobile App", action: () => scrollToSection('mobile') },
      { name: "Request Access", action: () => scrollToSection('cta') },
    ],
    Legal: [
      { name: "Privacy Policy", href: "/privacy-policy" },
      { name: "Terms of Service", href: "/privacy-policy" }, // Use same page for now
    ],
  };

  const socialLinks = [
    { icon: Github, href: "https://github.com/ChitkulLakshya/Zync", label: "GitHub" },
    { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
  ];

  return (
    <footer className="bg-background border-t border-border/50">
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-12">
          {/* Logo and Description */}
          <div className="col-span-2 md:col-span-1 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 bg-foreground rounded-lg flex items-center justify-center">
                <span className="text-background font-bold text-sm">Z</span>
              </div>
              <span className="text-lg font-bold font-serif-elegant text-foreground">Zync</span>
              <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded uppercase tracking-wider">Beta</span>
            </div>
            <p className="text-muted-foreground text-sm mb-5 max-w-xs leading-relaxed">
              The focused workspace for software teams. Currently in public beta.
            </p>
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-medium text-foreground mb-4 text-sm">Product</h4>
            <ul className="space-y-2.5">
              {footerLinks.Product.map((link) => (
                <li key={link.name}>
                  <button
                    onClick={link.action}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-medium text-foreground mb-4 text-sm">Legal</h4>
            <ul className="space-y-2.5">
              {footerLinks.Legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 Zync · Public Beta 1.0
          </p>
          <div className="flex gap-5">
            <Link to="/privacy-policy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
