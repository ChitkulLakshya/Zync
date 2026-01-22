import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/utils';

export interface UserStatus {
    status: 'online' | 'offline' | 'away';
    lastSeen: Date | string;
}

export const usePresence = (userId: string | undefined) => {
    const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});

    useEffect(() => {
        if (!userId) return;

        const socketUrl = import.meta.env.DEV ? "http://localhost:5000" : API_BASE_URL;

        const socket = io(`${socketUrl}/presence`, {
            query: { userId },
            transports: ['websocket']
        });

        socket.on('connect', () => {
            // console.log('Connected to presence server');
        });

        socket.on('user-status-changed', ({ userId: changedUserId, status, lastSeen }: { userId: string, status: 'online' | 'offline' | 'away', lastSeen: Date }) => {
            // console.log('Status update:', changedUserId, status);
            setStatuses(prev => ({
                ...prev,
                [changedUserId]: { status, lastSeen }
            }));
        });

        return () => {
            socket.disconnect();
        };
    }, [userId]);

    return statuses;
};
