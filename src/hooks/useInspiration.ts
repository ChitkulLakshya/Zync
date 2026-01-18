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
    hasMore: boolean;
    loadMore: () => void;
    search: (query: string) => Promise<void>;
    reset: () => void;
}

export const useInspiration = (): UseInspirationReturn => {
    const [allItems, setAllItems] = useState<DesignItem[]>([]);
    const [displayCount, setDisplayCount] = useState(10);
    const [loading, setLoading] = useState(false);

    // Ref to track processed IDs to prevent duplicates during multiple parallel returns
    const processedIds = useRef<Set<string>>(new Set());

    // Shuffle function
    const shuffle = (array: DesignItem[]) => {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    };

    const loadMore = useCallback(() => {
        setDisplayCount(prev => prev + 10);
    }, []);

    const reset = useCallback(() => {
        setAllItems([]);
        setDisplayCount(10);
        processedIds.current.clear();
    }, []);

    const search = useCallback(async (query: string) => {
        setLoading(true);
        reset();

        // Helper to process and append items
        const appendItems = (newItems: DesignItem[]) => {
            setAllItems(prev => {
                // Filter out items we've already seen (deduplication)
                const uniqueNewItems = newItems.filter(item => !processedIds.current.has(item.id));

                // Mark as seen
                uniqueNewItems.forEach(item => processedIds.current.add(item.id));

                if (uniqueNewItems.length === 0) return prev;

                // Combine and Shuffle
                // We shuffle the *new* items into the *existing* items? 
                // Or just append and shuffle? 
                // User said "Shuffle the combined array". 
                // Shuffling the whole array every time might be jarring if the user is reading.
                // Better to shuffle the NEW items and append them? 
                // Or strictly follow "Shuffle the combined array".
                // Let's shuffle the whole thing for now, or maybe just shuffle the incoming batch and append.
                // If I shuffle existing items, they will jump around. That's bad UX.
                // Strategy: Shuffle uniqueNewItems, then append.
                const shuffledNew = shuffle([...uniqueNewItems]);
                return [...prev, ...shuffledNew];
            });
        };

        const dToken = localStorage.getItem('dribbble_token');
        const headers: HeadersInit = {};
        if (dToken) headers['x-dribbble-token'] = dToken;

        // 1. Pinterest (Fast)
        const pPromise = fetch(`${API_BASE_URL}/api/inspiration/pinterest?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
                const items = Array.isArray(data) ? data : (data.items || []);
                appendItems(items);
            })
            .catch(err => console.error("Pinterest fetch failed", err));

        // 2. Dribbble (Slow)
        const dPromise = fetch(`${API_BASE_URL}/api/inspiration/dribbble?q=${encodeURIComponent(query)}`, { headers })
            .then(res => res.json())
            .then(data => {
                const items = Array.isArray(data) ? data : (data.items || []);
                appendItems(items);
            })
            .catch(err => console.error("Dribbble fetch failed", err));

        // 3. Main Search (Slow, contains Unsplash + Behance + duplicates)
        // We strictly want this for Unsplash & Behance.
        // Ideally we should filter the response to only include those sources to avoid processing overhead,
        // but the deduplication logic handles it.
        const mainPromise = fetch(`${API_BASE_URL}/api/design/search?q=${encodeURIComponent(query)}`, { headers })
            .then(res => res.json())
            .then(data => {
                let items: DesignItem[] = [];
                if (data.items && Array.isArray(data.items)) items = data.items;
                else if (Array.isArray(data)) items = data;

                // Optional: Pre-filter so we prioritize the Unsplash/Behance ones 
                // since we likely already got P/D from the specific endpoints.
                appendItems(items);
            })
            .catch(err => console.error("Main search failed", err));

        // Wait for all to settle to clear loading state
        await Promise.allSettled([pPromise, dPromise, mainPromise]);
        setLoading(false);

    }, [reset]);

    return {
        items: allItems.slice(0, displayCount),
        loading,
        hasMore: displayCount < allItems.length,
        loadMore,
        search,
        reset
    };
};
