import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpRight, Plus } from "lucide-react";
import { useInspiration } from "@/hooks/useInspiration";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ZYNC-design-view-state";

// --- Components ---

const DesignCard = ({ item }: { item: any }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Prevent blinking if image is already cached
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
      <div className="relative overflow-hidden bg-secondary/20 rounded-md">
        {/* Loading Placeholder with Dots */}
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

        {/* Aspect Ratio Preserver (Approximate 4:3 default) */}
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

        {/* Minimal Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] z-20">
          <div className="bg-white/90 text-black px-4 py-2 rounded-full flex items-center gap-2 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75">
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

const SkeletonCard = () => (
  <div className="break-inside-avoid mb-6">
    <div className="w-full pb-[75%] bg-secondary/30 animate-pulse rounded-md" />
    <div className="mt-3 h-4 w-2/3 bg-secondary/30 animate-pulse rounded" />
  </div>
);

// --- Main View ---

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

          {/* Skeleton Loaders for Initial Search */}
          {loading && items.length === 0 && Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={`skel-${i}`} />
          ))}

          {/* Actual Items */}
          {items
            .filter(item => selectedCategory === "All" || item.source.toLowerCase() === selectedCategory.toLowerCase())
            .map((item, index) => (
              <DesignCard key={`${item.id}-${index}`} item={item} />
            ))}
        </div>

        {/* Status States */}
        <div ref={observerTarget} className="py-20 flex justify-center w-full">
          {loading && items.length > 0 && (
            // Small spinner for load more only
            <div className="flex gap-1 items-center opacity-50">
              <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce" />
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
