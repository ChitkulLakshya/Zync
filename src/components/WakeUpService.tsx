import { useEffect } from 'react';
import { API_BASE_URL } from '@/lib/utils';

export const WakeUpService = () => {
  useEffect(() => {
    const pingBackend = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        await fetch(`${API_BASE_URL}/`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
      } catch (error) {

      }
    };

    pingBackend();
  }, []);

  return null;
};
