import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/lib/utils';
import { auth } from '@/lib/firebase';

const IDLE_TIMEOUT = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL = 60 * 1000;

export const useActivityTracker = () => {
  const lastActionRef = useRef<number>(Date.now());
  const activeIncrementRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && !sessionIdRef.current) {


        try {
          const raw = localStorage.getItem('currentSession');
          if (raw) {
            const parsed = JSON.parse(raw);
            sessionIdRef.current = parsed?.id || null;
          }
        } catch {
          sessionIdRef.current = null;
        }
      } else if (!user) {
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
    events.forEach((event) => window.addEventListener(event, handleUserActivity));

    const interval = setInterval(() => {
      if (!sessionIdRef.current) {
        return;
      }

      const now = Date.now();
      const timeSinceLastAction = now - lastActionRef.current;

      let increment = 0;
      if (timeSinceLastAction < IDLE_TIMEOUT) {
        increment = HEARTBEAT_INTERVAL / 1000;
      }

      if (auth.currentUser) {
        auth.currentUser.getIdToken().then((token) => {
          fetch(`${API_BASE_URL}/api/sessions/${sessionIdRef.current}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              lastAction: new Date(lastActionRef.current),
              activeIncrement: increment,
            }),
          }).catch((err) => console.error('Heartbeat failed', err));
        });
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleUserActivity));
      clearInterval(interval);
    };
  }, []);
};
