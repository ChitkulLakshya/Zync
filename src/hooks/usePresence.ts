import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '@/lib/utils';

export interface UserStatus {
    status: 'online' | 'offline' | 'away';
    lastSeen: Date | string;
}

export const usePresence = (userId: string | undefined) => {
    const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});

    useEffect(() => {
        if (!userId) {return;}

        const socketUrl = SOCKET_BASE_URL;

        const socket = io(`${socketUrl}/presence`, {
            query: { userId },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 3,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {

        });

        socket.on('initial-status', (users: any[]) => {
            const statusMap: Record<string, UserStatus> = {};
            users.forEach(u => {
                statusMap[u.uid] = {
                    status: u.status,
                    lastSeen: u.lastSeen
                };
            });
            setStatuses(prev => ({ ...prev, ...statusMap }));
        });

        socket.on('user-status-changed', ({ userId: changedUserId, status, lastSeen }: { userId: string, status: 'online' | 'offline' | 'away', lastSeen: Date }) => {

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
