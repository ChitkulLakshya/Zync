import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from "@/lib/utils";

type Item = {
  id: string;
  source: string;
  title?: string;
  image?: string | null;
  thumb?: string | null;
  photographer?: string;
  photographerProfile?: string;
  link?: string | null;
};

const PLACEHOLDER_IMG = 'https://via.placeholder.com/600x400?text=No+Preview';

export default function DesignGallery({ query = 'web design' }: { query?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    // Use unified inspiration endpoint (Unsplash + Pinterest + Behance)
    const url = `${API_BASE_URL}/api/inspiration?q=${encodeURIComponent(query)}`;
    
    // Explicitly make a simple fetch without custom auth headers
    fetch(url, { headers: { 'Content-Type': 'application/json' } }) 
      .then(res => {
        if (!res.ok) {
          const err = new Error(`Request failed: ${res.status} ${res.statusText}`);
          console.error('DesignGallery fetch error (HTTP):', err);
          throw err;
        }
        return res.json();
      })
      .then(data => {
        if (!mounted) return;
        // Handle array/object response
        const list = Array.isArray(data) ? data : (data.items || []);
        setItems(list);
        if (list.length === 0) {
          console.warn('DesignGallery: No results found for query:', query);
          setError('No results found');
        }
      })
      .catch(err => {
        console.error('DesignGallery fetch error (Exception):', err);
        if (mounted) setError(err.message);
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [query]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Design Inspiration</h2>
        <div style={{ fontSize: 12, color: '#666' }}>{items.length} items</div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={masonryContainerStyle}>
        {items.map(it => (
          <a key={it.id} href={it.link || '#'} target="_blank" rel="noreferrer" style={cardStyle}>
            {it.image ? (
              <img 
                src={it.image} 
                alt={it.title || ''} 
                style={{ width: '100%', display: 'block', borderRadius: 8 }} 
                onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMG; }}
              />
            ) : (
              <img src={PLACEHOLDER_IMG} alt="Placeholder" style={{ width: '100%', display: 'block', borderRadius: 8 }} />
            )}
            <div style={{ padding: '8px 6px' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{it.title}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{it.source}{it.photographer ? ` — ${it.photographer}` : ''}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

const masonryContainerStyle: React.CSSProperties = {
  columnCount: 3,
  columnGap: '1rem',
  // responsive
  // smaller screens handled via media queries inline not available; rely on CSS elsewhere
};

const cardStyle: React.CSSProperties = {
  display: 'inline-block',
  width: '100%',
  marginBottom: '1rem',
  textDecoration: 'none',
  color: 'inherit',
};
