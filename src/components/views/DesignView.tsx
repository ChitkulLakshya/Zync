/**
 * @fileoverview DesignView.tsx
 * @module DesignView
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
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpRight, Plus } from "lucide-react";
import { useInspiration } from "@/hooks/useInspiration";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ZYNC-design-view-state";


const DesignCard = ({ item }: { item: any }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {

    if (imgRef.current && imgRef.current.complete) {
      setLoaded(true);
    }
  }, []);

  return (
    <a
      href={item.link || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block break-inside-avoid mb-6"
    >
      <div className="relative overflow-hidden bg-card/50 backdrop-blur-md border border-border/10 rounded-2xl">
        {}
        <div
          className={cn(
            "absolute inset-0 bg-secondary/10 flex items-center justify-center z-10 transition-opacity duration-500",
            loaded ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
        >
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce" />
          </div>
        </div>

        {}
        {!loaded && <div className="w-full pb-[75%]" />}

        <img
          ref={imgRef}
          src={item.image}
          alt={item.title}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            "w-full h-auto object-cover transition-all duration-700 will-change-transform group-hover:scale-[1.02]",
            loaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]"
          )}
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {}
        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] z-20">
          <div className="bg-card/50 backdrop-blur-md border border-border/10 text-foreground px-4 py-2 rounded-full flex items-center gap-2 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75">
            <span className="text-xs font-bold uppercase tracking-wider">{item.source}</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-between items-start gap-4 px-1">
        <h3 className="text-sm font-medium leading-tight text-foreground/90 line-clamp-1 group-hover:text-foreground transition-colors">
          {item.title}
        </h3>
      </div>
    </a>
  );
};




const DesignView = () => {
  const savedState = (() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
  })();

  const [query, setQuery] = useState(savedState?.query || "web design");
  const [selectedCategory, setSelectedCategory] = useState<string>(savedState?.selectedCategory || "All");
  const [hasSearched, setHasSearched] = useState(false);

  const { items, loading, scraping, hasMore, loadMore, search } = useInspiration();

  const scrollRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);


  useEffect(() => {
    search("web design");
    setHasSearched(true);
  }, [search]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {loadMore();}
    }, { threshold: 1.0 });
    if (observerTarget.current) {observer.observe(observerTarget.current);}
    return () => observer.disconnect();
  }, [hasMore, loadMore]);


  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ query, selectedCategory, scrollTop: scrollRef.current?.scrollTop || 0 }));
  }, [query, selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {return;}
    if (scrollRef.current) {scrollRef.current.scrollTop = 0;}
    setHasSearched(true);
    search(query);
  };

  return (
    <div ref={scrollRef} className="h-full bg-transparent overflow-y-auto w-full">
      {}
      <div className="w-full max-w-7xl mx-auto p-6 md:p-8 flex flex-col items-start gap-8">
        <div className="w-full flex flex-col md:flex-row justify-between items-end gap-6 border-b border-border/10 pb-6">
          <div className="space-y-1">

            <p className="text-muted-foreground text-sm tracking-wide uppercase font-medium">
              Curated Web Design
            </p>
          </div>

          <form onSubmit={handleSearch} className="w-full md:max-w-xs relative group">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
            <input
              className="w-full bg-transparent border-none outline-none pl-6 pr-2 py-2 text-base placeholder:text-muted-foreground/50 focus:placeholder:text-muted-foreground/30 transition-all font-medium"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {/* Minimal animated underline */}
            <div className="absolute bottom-0 left-0 h-[1px] w-full bg-border group-focus-within:bg-foreground transition-colors duration-300" />
          </form>
        </div>

        {}
        <div className="flex flex-wrap gap-8 text-sm font-medium tracking-wide">
          {["All", "Godly", "SiteInspire", "Dribbble", "Lapa Ninja", "Awwwards"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "relative pb-1 uppercase transition-colors hover:text-foreground/80",
                selectedCategory === cat ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {cat}
              {selectedCategory === cat && (
                <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Scraping banner */}
      {scraping && !loading && (
        <div className="px-6 md:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-muted-foreground bg-card/50 backdrop-blur-md border border-border/10 rounded-xl px-4 py-2.5">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce" />
            </div>
            <p className="text-xs uppercase tracking-widest">
              Searching live sources for more results...
            </p>
          </div>
        </div>
      )}

      {}
      <div className="px-6 md:px-8 pb-20 max-w-7xl mx-auto">
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">

          {loading && items.length === 0 && (
            <div className="p-8 text-center text-muted-foreground w-full">Loading inspiration...</div>
          )}

          {/* Actual Items */}
          {items
            .filter(item => selectedCategory === "All" || item.source.toLowerCase() === selectedCategory.toLowerCase())
            .map((item, index) => (
              <DesignCard key={`${item.id}-${index}`} item={item} />
            ))}
        </div>

        {}
        <div ref={observerTarget} className="py-20 flex justify-center w-full">
          {loading && items.length > 0 && (
            <div className="flex gap-1 items-center opacity-50">
              <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce" />
            </div>
          )}

          {!loading && !scraping && items.length === 0 && (
            <div className="text-center space-y-2">
              <p className="text-2xl font-light text-muted-foreground">
                {hasSearched ? `Nothing found for "${query}"` : "Explore the unknown."}
              </p>
              {!hasSearched && <p className="text-sm text-muted-foreground/60 uppercase tracking-widest">Search to begin</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignView;
