import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ActiveUser {
  id: string;
  name: string;
  avatarUrl?: string;
  color: string;
  blockId?: string; // Which block they're currently editing
  lastActive: number;
}

export interface CurrentUser {
  uid: string;
  displayName?: string;
  photoURL?: string;
}

// Legacy type alias for backwards compatibility
export type Collaborator = ActiveUser & { odId: string; displayName: string; photoURL?: string };

// ═══════════════════════════════════════════════════════════════════════════
// COLOR GENERATOR - Consistent color based on user ID
// ═══════════════════════════════════════════════════════════════════════════

const COLLABORATOR_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#a855f7', // purple
];

export const getColorForUser = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: useNotePresence
// ═══════════════════════════════════════════════════════════════════════════

export const useNotePresence = (
  noteId: string | undefined,
  user: CurrentUser | undefined
) => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, ActiveUser>>({});
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!noteId || !user?.uid) {
      setActiveUsers([]);
      return;
    }

    const userColor = getColorForUser(user.uid);
    const socketUrl = import.meta.env.DEV ? 'http://localhost:5000' : API_BASE_URL;

    // Create socket connection to /notes namespace
    const socket = io(`${socketUrl}/notes`, {
      transports: ['websocket', 'polling'],
      query: { userId: user.uid },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // ─────────────────────────────────────────────────────────────────────
    // CONNECTION EVENTS
    // ─────────────────────────────────────────────────────────────────────

    socket.on('connect', () => {
      console.log('[NotePresence] Connected to server');
      setIsConnected(true);

      // Join the note room and announce presence
      socket.emit('join_note', {
        noteId,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userAvatar: user.photoURL,
        userColor,
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('[NotePresence] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[NotePresence] Connection error:', error.message);
    });

    // ─────────────────────────────────────────────────────────────────────
    // PRESENCE EVENTS
    // ─────────────────────────────────────────────────────────────────────

    // Receive full list of active users
    socket.on('presence_update', (users: ActiveUser[]) => {
      // Filter out self and stale users (inactive > 60 seconds)
      const now = Date.now();
      const filteredUsers = users.filter(u =>
        u.id !== user.uid &&
        (now - u.lastActive) < 60000
      );
      setActiveUsers(filteredUsers);
      
      // Rebuild remoteCursors map from filtered users
      const newRemoteCursors: Record<string, ActiveUser> = {};
      filteredUsers.forEach(u => {
        if (u.blockId) {
          newRemoteCursors[u.blockId] = u;
        }
      });
      setRemoteCursors(newRemoteCursors);
    });

    // A specific user left
    socket.on('user_left', (userId: string) => {
      setActiveUsers(prev => prev.filter(u => u.id !== userId));
      setRemoteCursors(prev => {
        const updated = { ...prev };
        // Remove any blocks owned by this user
        Object.keys(updated).forEach(blockId => {
          if (updated[blockId]?.id === userId) {
            delete updated[blockId];
          }
        });
        return updated;
      });
    });

    // A user's cursor position changed
    socket.on('cursor_update', ({ userId, blockId }: { userId: string; blockId: string }) => {
      setActiveUsers(prev => {
        const updatedUsers = prev.map(u =>
          u.id === userId ? { ...u, blockId, lastActive: Date.now() } : u
        );
        
        // Update remoteCursors map: blockId → user
        const newRemoteCursors: Record<string, ActiveUser> = {};
        updatedUsers.forEach(u => {
          if (u.blockId) {
            newRemoteCursors[u.blockId] = u;
          }
        });
        setRemoteCursors(newRemoteCursors);
        
        return updatedUsers;
      });
    });

    // ─────────────────────────────────────────────────────────────────────
    // CLEANUP
    // ─────────────────────────────────────────────────────────────────────

    return () => {
      socket.emit('leave_note', { noteId, userId: user.uid });
      socket.disconnect();
      socketRef.current = null;
      setActiveUsers([]);
      setRemoteCursors({});
      setIsConnected(false);
    };
  }, [noteId, user?.uid, user?.displayName, user?.photoURL]);

  // ─────────────────────────────────────────────────────────────────────────
  // METHODS
  // ─────────────────────────────────────────────────────────────────────────

  // Update cursor/block position
  const updateCursorPosition = useCallback((blockId: string | undefined) => {
    if (socketRef.current?.connected && noteId && user) {
      socketRef.current.emit('cursor_move', {
        noteId,
        userId: user.uid,
        blockId,
      });
    }
  }, [noteId, user]);

  // Get remote user for a specific block (if any)
  const getRemoteUserForBlock = useCallback((blockId: string): ActiveUser | undefined => {
    return remoteCursors[blockId];
  }, [remoteCursors]);

  // Legacy accessor for backwards compatibility
  const collaborators: Collaborator[] = activeUsers.map(u => ({
    ...u,
    odId: u.id,
    displayName: u.name,
    photoURL: u.avatarUrl,
  }));

  return {
    activeUsers,
    collaborators, // Legacy
    remoteCursors,
    isConnected,
    updateCursorPosition,
    getRemoteUserForBlock,
  };
};
