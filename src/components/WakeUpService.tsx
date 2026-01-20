import { useEffect } from 'react';
import { API_BASE_URL } from "@/lib/utils";

/**
 * Service to wake up the Render backend on app load.
 * This sends a lightweight request to the API root/health endpoint.
 */
export const WakeUpService = () => {
    useEffect(() => {
        const pingBackend = async () => {
            try {
                // Using a short timeout so we don't keep a pending request for too long
                // if the backend is completely down.
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s max for wakeup

                await fetch(`${API_BASE_URL}/`, { // Assuming root serves something, or /api/health
                    method: 'GET',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
            } catch (error) {
                // Silently fail - this is just a best-effort wakeup
                // preventing logs from cluttering console
            }
        };

        pingBackend();
    }, []);

    return null; // Renderless component
};
