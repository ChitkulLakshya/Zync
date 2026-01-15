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
  const [items, setItems] = useState<DesignItem[]>(savedState?.items || []);
  const [selectedCategory, setSelectedCategory] = useState<string>(savedState?.selectedCategory || "All");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      query,
      items,
      selectedCategory,
      scrollTop: scrollRef.current?.scrollTop || 0
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [query, items, selectedCategory]);

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

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {["All", "Dribbble", "Behance", "Unsplash", "Pinterest"].map((category) => (
          <Badge
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            className="cursor-pointer px-4 py-1.5 text-sm hover:opacity-80 transition-opacity"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Badge>
        ))}
      </div>

      {/* Dribbble Connection Prompt */}
      {selectedCategory === "Dribbble" && !localStorage.getItem('dribbble_token') && (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/30 text-center space-y-4">
          <div className="w-12 h-12 flex items-center justify-center bg-[#ea4c89] text-white rounded-full">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.95-4.675-3.189-5.03A8.458 8.458 0 0112 3.475zm-6.509 3.383c.247.358 1.821 2.68 3.239 5.289a29.866 29.866 0 01-4.496.643c-.02-.349-.033-.7-.033-1.056a8.468 8.468 0 011.29-4.876zm-1.637 6.47c1.764-.08 4.64.212 6.551.681.459 1.258.858 2.505 1.189 3.86a26.04 26.04 0 01-3.996 1.157c-2.486-1.6-4.008-4.226-4.008-7.149 0-.214.015-.424.03-.632.079.03.155.056.234.083zM12 20.53c-2.02 0-3.875-.712-5.327-1.921 1.251-.271 3.201-.849 5.368-1.472.261 1.05.514 2.17.755 3.328A8.466 8.466 0 0112 20.53zm0-18.995V1.53c0-.001-.001 0 0 0zm6.918 10.99l.011.393c.002.046.002.091.002.137 0 1.97-.676 3.784-1.815 5.234-.339-1.527-.678-2.978-1.015-4.329 2.571-.246 4.909.117 5.143.165-.183-.54-.429-1.052-.72-1.523-.424-.047-.98-.073-1.606-.078z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Connect Dribbble</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              To browse Dribbble shots, you need to connect your account. This allows us to fetch your portfolio and inspiration.
            </p>
          </div>
          <Button
            onClick={() => {
              // Direct navigation to settings integration tab would be ideal, 
              // but standard navigation is fine. Since this is a SPA, we might need a router push 
              // but we don't have navigate props here easily without hook.
              // Assuming user can navigate via sidebar.
              // Or we can direct them to the Auth URL directly:
              const clientId = "Z2LzX0DtUkUiTUl1T3ybs-UyTF8YFmYkmMZj1QuWMyU";
              const redirectUri = `${API_BASE_URL}/api/dribbble/callback`;
              window.location.href = `https://dribbble.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=public%20upload`;
            }}
          >
            Connect Dribbble
          </Button>
        </div>
      )}

      {/* Masonry Layout using simple CSS columns */}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {items
          .filter(item => selectedCategory === "All" || item.source.toLowerCase() === selectedCategory.toLowerCase())
          .map((item, index) => (
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
