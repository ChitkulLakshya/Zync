import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/utils';

export interface Collaborator {
  odId: string;
  displayName: string;
  photoURL?: string;
  color: string;
  blockId?: string; // Which block they're editing
  lastActive: number;
}

// Generate consistent color based on user ID
const getColorForUser = (userId: string): string => {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', 
    '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const useNotePresence = (
  noteId: string | undefined,
  user: { uid: string; displayName?: string; photoURL?: string } | undefined
) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!noteId || !user?.uid) return;

    const newSocket = io(`${API_BASE_URL}/notes`, {
      transports: ['websocket'],
      query: { userId: user.uid }
    });

    newSocket.on('connect', () => {
      // Join the note room
      newSocket.emit('join-note', noteId);
      
      // Announce presence (use odId to match server expectations)
      newSocket.emit('presence-join', {
        noteId,
        odId: user.uid,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL,
        color: getColorForUser(user.uid)
      });
    });

    // Listen for collaborator updates
    newSocket.on('presence-update', (data: Collaborator[]) => {
      // Filter out self and stale users (inactive > 30 seconds)
      const now = Date.now();
      const active = data.filter(c => 
        c.odId !== user.uid && 
        (now - c.lastActive) < 30000
      );
      setCollaborators(active);
    });

    newSocket.on('presence-left', (userId: string) => {
      setCollaborators(prev => prev.filter(c => c.odId !== userId));
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave-note', noteId);
      newSocket.emit('presence-leave', { noteId, odId: user.uid });
      newSocket.disconnect();
    };
  }, [noteId, user?.uid]);

  // Broadcast cursor/block position
  const updateCursorPosition = useCallback((blockId: string | undefined) => {
    if (socket && noteId && user) {
      socket.emit('presence-cursor', {
        noteId,
        odId: user.uid,
        blockId
      });
    }
  }, [socket, noteId, user]);

  return { collaborators, updateCursorPosition };
};
