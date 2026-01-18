import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpRight, Plus } from "lucide-react";
import { useInspiration } from "@/hooks/useInspiration";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ZYNC-design-view-state";

const DesignView = () => {
  const savedState = (() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
  })();

  const [query, setQuery] = useState(savedState?.query || "web design");
  const [selectedCategory, setSelectedCategory] = useState<string>(savedState?.selectedCategory || "All");
  const [hasSearched, setHasSearched] = useState(false);

  const { items, loading, hasMore, loadMore, search } = useInspiration();

  const scrollRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) loadMore();
    }, { threshold: 1.0 });
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // Helper for Source Colors/Icons
  const getSourceStyle = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('dribbble')) return "bg-[#ea4c89] text-white border-[#ea4c89]";
    if (s.includes('lapa')) return "bg-[#6a3ae2] text-white border-[#6a3ae2]"; // Purple for Lapa
    if (s.includes('behance')) return "bg-[#1769ff] text-white border-[#1769ff]";
    if (s.includes('godly')) return "bg-black text-white border-black dark:bg-white dark:text-black";
    if (s.includes('siteinspire')) return "bg-emerald-600 text-white border-emerald-600";
    return "bg-secondary text-secondary-foreground";
  };

  // Persistence
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ query, selectedCategory, scrollTop: scrollRef.current?.scrollTop || 0 }));
  }, [query, selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setHasSearched(true);
    search(query);
  };

  return (
    <div ref={scrollRef} className="h-full bg-background overflow-y-auto w-full">
      {/* Editorial Header */}
      <div className="w-full max-w-[1800px] mx-auto pt-16 pb-12 px-6 md:px-10 flex flex-col items-start gap-8">
        <div className="w-full flex flex-col md:flex-row justify-between items-end gap-6 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-medium tracking-tighter text-foreground">
              Inspiration
            </h1>
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

        {/* Text Filters */}
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

      {/* Experimental Grid - Clean & Sharp */}
      <div className="px-6 md:px-10 pb-20 max-w-[1800px] mx-auto">
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
          {items
            .filter(item => selectedCategory === "All" || item.source.toLowerCase() === selectedCategory.toLowerCase())
            .map((item, index) => (
              <a
                key={`${item.id}-${index}`}
                href={item.link || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block break-inside-avoid mb-6"
              >
                {/* Image Container - No Radius, Sharp Edges or Minimal Radius */}
                <div className="relative overflow-hidden bg-secondary/20">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-auto object-cover transition-transform duration-500 will-change-transform group-hover:scale-[1.02]"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-64 bg-secondary/10 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground/50 uppercase tracking-widest">No Preview</span>
                    </div>
                  )}

                  {/* Minimal Overlay - Only on Hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    <div className="bg-white/90 text-black px-4 py-2 rounded-full flex items-center gap-2 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75">
                      <span className="text-xs font-bold uppercase tracking-wider">{item.source}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>

                {/* Minimal Title below image, not inside */}
                <div className="mt-3 flex justify-between items-start gap-4">
                  <h3 className="text-sm font-medium leading-tight text-foreground/90 line-clamp-1 group-hover:text-foreground transition-colors">
                    {item.title}
                  </h3>
                </div>
              </a>
            ))}
        </div>

        {/* Status States */}
        <div ref={observerTarget} className="py-20 flex justify-center w-full">
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce" />
              </div>
              <p className="text-muted-foreground/60 text-xs uppercase tracking-widest animate-pulse font-medium">
                Please wait patiently, curating inspiration...
              </p>
            </div>
          )}

          {!loading && items.length === 0 && (
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
