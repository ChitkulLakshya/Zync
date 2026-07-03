/**
 * @fileoverview Navbar.tsx
 * @module Navbar
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Client-Side Presentation & Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { animate } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, X } from 'lucide-react';
import { Github } from '@/components/ui/GithubIcon';;

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
    setIsOpen(false);
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          let top = element.getBoundingClientRect().top + window.scrollY - 80;
          
          if (sectionId === 'mobile' && window.innerWidth >= 1024) {
            top = element.getBoundingClientRect().top + window.scrollY + element.offsetHeight - window.innerHeight;
          }

          animate(window.scrollY, top, {
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (value) => window.scrollTo(0, value)
          });
        }
      }, 100);
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      let top = element.getBoundingClientRect().top + window.scrollY - 80;
      
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

  const navItems = [
    { name: "Features", id: 'features' },
    { name: "Mobile App", id: 'mobile' },
    { name: "Contact", id: 'cta' },
  ];

  const isPill = isScrolled && !isOpen;

  return (
    <nav 
      className={`fixed left-1/2 -translate-x-1/2 z-50 box-border transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] border ${
        isPill 
          ? "top-6 w-[90%] max-w-[896px] rounded-full bg-surface-glass-regular backdrop-blur-thick border-border/50"
          : "top-0 w-[100%] max-w-[3000px] rounded-none bg-background/70 backdrop-blur-md border-transparent border-b-border/30"
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
              <>
                <img 
                  src="/zync-white.webp" 
                  alt="Zync Logo" 
                  className="w-8 h-8 rounded-lg relative z-10 block dark:hidden" 
                />
                <img 
                  src="/zync-dark.webp" 
                  alt="Zync Logo" 
                  className="w-8 h-8 rounded-lg relative z-10 hidden dark:block" 
                />
              </>
            ) : (
              <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
                <span className="text-background font-bold text-lg">Z</span>
              </div>
            )}
            <span className="font-serif-elegant font-bold text-xl tracking-tight text-foreground">
              Zync
            </span>
          </Link>

          {}
          <div className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => scrollToSection(item.id)}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {item.name}
              </button>
            ))}
          </div>

          {}
          <div className="hidden lg:flex items-center gap-3">
            <a href="https://github.com/zync-meet/Zync" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="default" className="gap-2 hidden xl:flex">
                <Github className="w-4 h-4" />
                Star on GitHub
              </Button>
              <Button variant="outline" size="icon" className="xl:hidden">
                <Github className="w-4 h-4" />
              </Button>
            </a>
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="default">
                Log In
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="hero" size="default">
                Sign Up
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
                  onClick={() => scrollToSection(item.id)}
                  className="text-left text-muted-foreground hover:text-foreground transition-colors font-medium py-2"
                >
                  {item.name}
                </button>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border/10">
                <a href="https://github.com/zync-meet/Zync" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full justify-center gap-2">
                    <Github className="w-4 h-4" />
                    Star on GitHub
                  </Button>
                </a>
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" className="w-full justify-center">
                    Log In
                  </Button>
                </Link>
                <Link to="/signup" onClick={() => setIsOpen(false)}>
                  <Button variant="hero" className="w-full justify-center">
                    Sign Up
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
