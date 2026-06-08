import { useState, useRef, useCallback } from 'react';
import { API_BASE_URL } from "@/lib/utils";

export interface DesignItem {
    id: string;
    source: string;
    title: string;
    image: string | null;
    link: string | null;
}

interface UseInspirationReturn {
    items: DesignItem[];
    loading: boolean;
    scraping: boolean;
    hasMore: boolean;
    loadMore: () => void;
    search: (query: string) => Promise<void>;
    reset: () => void;
}

const ITEMS_PER_PAGE = 15;

export const useInspiration = (): UseInspirationReturn => {

    const [allItems, setAllItems] = useState<DesignItem[]>([]);
    const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
    const [loading, setLoading] = useState(false);
    const [scraping, setScraping] = useState(false);

    const processedIds = useRef<Set<string>>(new Set());
    const currentSearchId = useRef(0);

    const loadMore = useCallback(() => {
        setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, allItems.length));
    }, [allItems.length]);

    const reset = useCallback(() => {
        setAllItems([]);
        setDisplayCount(ITEMS_PER_PAGE);
        processedIds.current.clear();
    }, []);

    const deduplicate = (items: DesignItem[]): DesignItem[] => {
        return items.filter(item => {
            if (processedIds.current.has(item.id)) { return false; }
            processedIds.current.add(item.id);
            return true;
        });
    };

    const search = useCallback(async (query: string) => {
        const searchId = ++currentSearchId.current;
        setLoading(true);
        setScraping(false);
        reset();

        try {
            // 1) Return cached results instantly
            const cacheRes = await fetch(
                `${API_BASE_URL}/api/inspiration?q=${encodeURIComponent(query)}`
            );
            const cacheData = await cacheRes.json();

            if (searchId !== currentSearchId.current) {return;}

            if (cacheData.ok && Array.isArray(cacheData.items)) {
                setAllItems(deduplicate(cacheData.items));
            }
            setLoading(false);

            // 2) Scrape live results in the background
            setScraping(true);
            const scrapeRes = await fetch(
                `${API_BASE_URL}/api/inspiration/scrape?q=${encodeURIComponent(query)}`
            );
            const scrapeData = await scrapeRes.json();

            if (searchId !== currentSearchId.current) {return;}

            if (scrapeData.ok && Array.isArray(scrapeData.items) && scrapeData.items.length > 0) {
                setAllItems(prev => {
                    const merged = [...prev, ...scrapeData.items];
                    processedIds.current.clear();
                    return deduplicate(merged);
                });
            }
        } catch (err) {
            console.error("Inspiration fetch failed:", err);
        } finally {
            if (searchId === currentSearchId.current) {
                setLoading(false);
                setScraping(false);
            }
        }
    }, [reset]);

    return {
        items: allItems.slice(0, displayCount),
        loading,
        scraping,
        hasMore: displayCount < allItems.length,
        loadMore,
        search,
        reset
    };
};
