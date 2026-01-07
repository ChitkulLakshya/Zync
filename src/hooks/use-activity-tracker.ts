import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/lib/utils';
import { auth } from '@/lib/firebase';

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL = 60 * 1000; // 1 minute

export const useActivityTracker = () => {
  const lastActionRef = useRef<number>(Date.now());
  const activeIncrementRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Start session when user logs in
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/sessions/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid }),
          });
          if (res.ok) {
            const session = await res.json();
            sessionIdRef.current = session._id;
          }
        } catch (e) {
          console.error("Failed to start session:", e);
        }
      } else {
        sessionIdRef.current = null;
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleUserActivity = () => {
      const now = Date.now();
      lastActionRef.current = now;
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleUserActivity));
    
    // Heartbeat to sync with backend
    const interval = setInterval(() => {
        if (!sessionIdRef.current) return;
        
        const now = Date.now();
        const timeSinceLastAction = now - lastActionRef.current;
        
        // If user has been active recently (less than IDLE_TIMEOUT)
        // We consider them active for this interval (HEARTBEAT_INTERVAL)
        
        let increment = 0;
        if (timeSinceLastAction < IDLE_TIMEOUT) {
            increment = HEARTBEAT_INTERVAL / 1000; // Seconds
        }

        // Send heartbeat
        fetch(`${API_BASE_URL}/api/sessions/${sessionIdRef.current}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lastAction: new Date(lastActionRef.current),
                activeIncrement: increment
            })
        }).catch(err => console.error("Heartbeat failed", err));

    }, HEARTBEAT_INTERVAL);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
      clearInterval(interval);
    };
  }, []);
};
