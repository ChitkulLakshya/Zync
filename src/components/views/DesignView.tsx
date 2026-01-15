import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/utils";

interface DesignItem {
  id: string;
  source: string;
  title: string;
  image: string | null;
  link: string | null;
}

const STORAGE_KEY = "zync-design-view-state";

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
  const [items, setItems] = useState<DesignItem[]>(savedState?.items || []);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      query,
      items,
      scrollTop: scrollRef.current?.scrollTop || 0
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [query, items]);

  // Save scroll position specifically on scroll
  const handleScroll = () => {
    if (scrollRef.current) {
      const currentScroll = scrollRef.current.scrollTop;
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.scrollTop = currentScroll;
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    }
  };

  // Restore scroll position after mount and when items are loaded
  useLayoutEffect(() => {
    if (savedState?.scrollTop && scrollRef.current) {
      scrollRef.current.scrollTop = savedState.scrollTop;
    }
  }, [items]); // Re-run when items populate to ensuring scrolling happens after content exists

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Use the unified endpoint which returns { ok: true, items: [...] } 
      // OR direct array depending on how getInspiration is structured.
      // Based on previous code, getInspiration returns { ok: true, count, items: [] }
      const dToken = localStorage.getItem('dribbble_token');
      const headers: HeadersInit = {};
      if (dToken) headers['x-dribbble-token'] = dToken;

      const response = await fetch(`${API_BASE_URL}/api/design/search?q=${encodeURIComponent(query)}`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch designs: ${response.statusText}`);
      }
      const data = await response.json();

      // Handle both { ok: true, items: [...] } and plain array formats
      let results: DesignItem[] = [];
      if (data.items && Array.isArray(data.items)) {
        results = data.items;
      } else if (Array.isArray(data)) {
        results = data;
      }
      setItems(results);

      if (results.length === 0) {
        toast({
          title: "No results",
          description: "No designs found. Try a different search term.",
        });
      }

      // Reset scroll on new search
      if (scrollRef.current) scrollRef.current.scrollTop = 0;

    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to fetch design inspiration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={scrollRef}
      className="h-full space-y-6 p-6 overflow-y-auto scroll-smooth"
      onScroll={handleScroll}
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Design Inspiration</h1>
        <p className="text-muted-foreground">
          Find the perfect design ideas from Behance and Unsplash.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-4 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for designs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Search
        </Button>
      </form>

      {/* Masonry Layout using simple CSS columns */}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {items.map((item, index) => (
          <div key={`${item.id}-${index}`} className="break-inside-avoid relative group rounded-lg overflow-hidden border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
            <a href={item.link || '#'} target="_blank" rel="noopener noreferrer" className="block">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  style={{ display: "block" }}
                />
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground">
                  No Image
                </div>
              )}

              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <div className="text-white font-medium line-clamp-2 mb-2">{item.title}</div>
                <div className="flex justify-between items-center">
                  <Badge variant="secondary" className="capitalize bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                    {item.source}
                  </Badge>
                  <ExternalLink className="h-4 w-4 text-white" />
                </div>
              </div>
            </a>
          </div>
        ))}
      </div>

      {!loading && items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Search for something to see results.
        </div>
      )}
    </div>
  );
};

export default DesignView;
