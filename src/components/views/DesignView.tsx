import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, Loader2, ArrowUpRight, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL, cn } from "@/lib/utils";
import { useInspiration } from "@/hooks/useInspiration";

const STORAGE_KEY = "ZYNC-design-view-state";

const DesignView = () => {
  // Initialize state from sessionStorage if available
  const savedState = (() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const [query, setQuery] = useState(savedState?.query || "web design");
  const [selectedCategory, setSelectedCategory] = useState<string>(savedState?.selectedCategory || "All");

  // Use custom parallel fetching hook
  const { items, loading, hasMore, loadMore, search, reset } = useInspiration();

  const scrollRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Initial fetch if empty
  useEffect(() => {
    if (items.length === 0 && query) {
      search(query);
    }
  }, []); // Run once on mount

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // Save state to sessionStorage
  useEffect(() => {
    const stateToSave = {
      query,
      selectedCategory,
      scrollTop: scrollRef.current?.scrollTop || 0
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [query, selectedCategory]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    search(query);
  };

  // Helper for Source Colors/Icons
  const getSourceStyle = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('dribbble')) return "bg-[#ea4c89] text-white border-[#ea4c89]";
    if (s.includes('pinterest')) return "bg-[#bd081c] text-white border-[#bd081c]";
    if (s.includes('behance')) return "bg-[#1769ff] text-white border-[#1769ff]";
    if (s.includes('godly')) return "bg-black text-white border-black dark:bg-white dark:text-black";
    if (s.includes('siteinspire')) return "bg-emerald-600 text-white border-emerald-600";
    return "bg-secondary text-secondary-foreground";
  };

  return (
    <div
      ref={scrollRef}
      className="h-full bg-background relative overflow-y-auto scroll-smooth"
    >
      {/* Sticky Header with Glassmorphism */}
      <div className="sticky top-0 z-20 w-full bg-background/80 backdrop-blur-md border-b supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-7xl p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                Inspiration Hub
              </h1>
              <p className="text-xs text-muted-foreground hidden md:block">
                Curated form Godly, SiteInspire, Dribbble & Pinterest
              </p>
            </div>

            <form onSubmit={handleSearch} className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search UI, landing pages, interactions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 transition-all rounded-full"
              />
            </form>
          </div>

          {/* Category Filters (Scrollable) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {["All", "Godly", "SiteInspire", "Dribbble", "Pinterest"].map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "secondary"}
                className={cn(
                  "cursor-pointer px-4 py-1.5 text-xs font-medium transition-all hover:scale-105 active:scale-95 whitespace-nowrap rounded-full",
                  selectedCategory === category ? "shadow-md" : "hover:bg-muted-foreground/10"
                )}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl p-4 min-h-screen">
        {/* Dribbble Connection Prompt */}
        {selectedCategory === "Dribbble" && !localStorage.getItem('dribbble_token') && (
          <div className="mb-8 p-6 border border-dashed rounded-xl bg-muted/30 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 flex items-center justify-center bg-[#ea4c89] text-white rounded-full shadow-lg shadow-pink-500/20">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.95-4.675-3.189-5.03A8.458 8.458 0 0112 3.475zm-6.509 3.383c.247.358 1.821 2.68 3.239 5.289a29.866 29.866 0 01-4.496.643c-.02-.349-.033-.7-.033-1.056a8.468 8.468 0 011.29-4.876zm-1.637 6.47c1.764-.08 4.64.212 6.551.681.459 1.258.858 2.505 1.189 3.86a26.04 26.04 0 01-3.996 1.157c-2.486-1.6-4.008-4.226-4.008-7.149 0-.214.015-.424.03-.632.079.03.155.056.234.083zM12 20.53c-2.02 0-3.875-.712-5.327-1.921 1.251-.271 3.201-.849 5.368-1.472.261 1.05.514 2.17.755 3.328A8.466 8.466 0 0112 20.53zm0-18.995V1.53c0-.001-.001 0 0 0zm6.918 10.99l.011.393c.002.046.002.091.002.137 0 1.97-.676 3.784-1.815 5.234-.339-1.527-.678-2.978-1.015-4.329 2.571-.246 4.909.117 5.143.165-.183-.54-.429-1.052-.72-1.523-.424-.047-.98-.073-1.606-.078z" /></svg>
            </div>
            <h3 className="text-lg font-semibold">Unlock Dribbble</h3>
            <Button
              className="rounded-full px-6"
              onClick={() => {
                const clientId = "Z2LzX0DtUkUiTUl1T3ybs-UyTF8YFmYkmMZj1QuWMyU";
                const redirectUri = `${API_BASE_URL}/api/dribbble/callback`;
                window.location.href = `https://dribbble.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=public%20upload`;
              }}
            >
              Connect Account
            </Button>
          </div>
        )}

        {/* Masonry Layout */}
        <div className="columns-1 xs:columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4 pb-10">
          {items
            .filter(item => selectedCategory === "All" || item.source.toLowerCase() === selectedCategory.toLowerCase())
            .map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="break-inside-avoid relative group rounded-2xl overflow-hidden bg-muted/20 mb-4 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
              >
                <a href={item.link || '#'} target="_blank" rel="noopener noreferrer" className="block relative cursor-zoom-in">
                  {/* Image */}
                  <div className="relative overflow-hidden w-full bg-muted">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                        onLoad={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.opacity = '1';
                        }}
                        style={{ opacity: 0, transition: 'opacity 0.3s ease-in-out' }}
                      />
                    ) : (
                      <div className="w-full h-64 bg-secondary flex items-center justify-center text-muted-foreground flex-col gap-2">
                        <div className="w-10 h-10 rounded-full bg-background/50 animate-pulse" />
                        <span className="text-xs font-medium">No Preview</span>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Hover Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                    <h3 className="text-white font-bold text-sm line-clamp-2 mb-2 leading-tight drop-shadow-md">
                      {item.title}
                    </h3>

                    <div className="flex justify-between items-center mt-1">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-2 py-0.5 border-0 backdrop-blur-md uppercase tracking-wider font-bold shadow-lg", getSourceStyle(item.source))}
                      >
                        {item.source}
                      </Badge>

                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white text-white hover:text-black transition-colors shadow-lg">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </a>
              </div>
            ))}

          {/* Skeleton Loaders (Show when loading AND when fetching initial data) */}
          {(loading) && Array.from({ length: 8 }).map((_, i) => (
            <div key={`skel-${i}`} className="break-inside-avoid relative rounded-2xl overflow-hidden bg-muted mb-4 animate-pulse">
              <div style={{ height: `${Math.floor(Math.random() * (400 - 200) + 200)}px` }} className="w-full bg-muted-foreground/10" />
              <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
                <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>

        {/* Load More Trigger */}
        <div ref={observerTarget} className="h-20 w-full flex items-center justify-center">
          {loading && <p className="text-muted-foreground text-sm animate-pulse font-medium">Gathering inspiration...</p>}
        </div>

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Search className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-lg font-medium">No results found for "{query}"</p>
            <p className="text-sm">Try checking your spelling or using broader keywords.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignView;
