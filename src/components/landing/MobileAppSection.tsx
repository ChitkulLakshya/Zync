/**
 * @fileoverview MobileAppSection.tsx
 * @module MobileAppSection
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
 * @license AGPL-3.0-only
 * ============================================================================
 */
import { useRef, useState, useEffect } from "react";
import { Smartphone, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import MobilePreview from "@/components/landing/MobilePreview";

const MobileAppSection = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"]
  });

  const x = useTransform(scrollYProgress, [0, 0.7, 1], [450, 0, 0]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [45, 0, 0]);
  const rotateZ = useTransform(scrollYProgress, [0, 0.5, 1], [-15, 0, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 1], [0.4, 1, 1]);

  const handleNotifyMe = () => {
    navigate("/signup", { state: { source: "mobile-waitlist" } });
  };

  return (
    <section id="mobile" ref={containerRef} className="relative lg:h-[200vh] scroll-mt-20">
      <div className="lg:sticky top-0 lg:h-screen flex items-center py-16 lg:py-0 overflow-visible lg:overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-12 items-center">
          
          <div className="order-1 lg:order-1 text-center lg:text-left">
            <div 
              className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-surface-glass-thin backdrop-blur-md rounded-full mb-6 border border-black/5 dark:border-white/5"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <Smartphone className="w-3.5 h-3.5 text-task-orange" />
              <span className="text-xs font-medium tracking-wide text-foreground/80">
                Coming Soon
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Your workspace, in your pocket
            </h2>

            <p className="text-muted-foreground mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              The Zync mobile app is in development. Check task progress, respond to messages,
              and stay connected with your team—wherever you are.
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 rounded-full"
                onClick={handleNotifyMe}
              >
                <Bell className="w-4 h-4" />
                Notify me when ready
              </Button>
            </div>
          </div>
          {/* Right Side: Mobile App Preview */}
          <div className="relative flex justify-center [perspective:1500px] py-8 lg:py-16 order-2 lg:order-2">
            <motion.div 
              className="relative"
              style={{ 
                rotateX: isMobile ? 0 : rotateX, 
                rotateZ: isMobile ? 0 : rotateZ, 
                scale: isMobile ? 0.95 : scale, 
                opacity: isMobile ? 1 : opacity,
                x: isMobile ? 0 : x,
                transformOrigin: "bottom center"
              }}
              initial={isMobile ? { opacity: 0, y: 40 } : false}
              whileInView={isMobile ? { opacity: 1, y: 0 } : {}}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <MobilePreview />
            </motion.div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
};

export default MobileAppSection;
