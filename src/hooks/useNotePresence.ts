import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, SOCKET_BASE_URL } from '@/lib/utils';


export interface ActiveUser {
  id: string;
  name: string;
  avatarUrl?: string;
  color: string;
  blockId?: string;
  lastActive: number;
}

export interface CurrentUser {
  uid: string;
  displayName?: string;
  photoURL?: string;
}


export type Collaborator = ActiveUser & { odId: string; displayName: string; photoURL?: string };


const COLLABORATOR_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#a855f7',
];

export const getColorForUser = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
};


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
      if (import.meta.env.DEV) {
        console.debug('[NotePresence] Missing noteId or user, skipping connection');
      }
      setActiveUsers([]);
      return;
    }

    const userColor = getColorForUser(user.uid);
    const socketUrl = SOCKET_BASE_URL;


    console.log('[NotePresence] 🔌 Socket URL:', socketUrl);
    console.log('[NotePresence] 🔌 Is DEV mode:', import.meta.env.DEV);
    console.log('[NotePresence] 🔌 API_BASE_URL:', API_BASE_URL);
    console.log('[NotePresence] 👤 Current User ID:', user.uid);


    const socket = io(`${socketUrl}/notes`, {
      transports: ['websocket', 'polling'],
      query: { userId: user.uid },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;


    socket.on('connect', () => {
      console.log('[NotePresence] Connected to server');
      setIsConnected(true);


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


    socket.on('presence_update', (users: ActiveUser[]) => {

      console.log('[NotePresence] 📡 Socket received presence_update:', users);
      console.log('[NotePresence] 📡 Raw user IDs:', users.map(u => u.id));
      console.log('[NotePresence] 👤 Current user ID to filter:', user.uid);


      const now = Date.now();
      const usersArray = (Array.isArray(users) ? users : Object.values(users || {})) as ActiveUser[];
      const filteredUsers = usersArray.filter(u => {
        const isSelf = u.id === user.uid;
        const isStale = (now - u.lastActive) >= 60000;

        console.log(`[NotePresence] 🔍 User ${u.id} (${u.name}): isSelf=${isSelf}, isStale=${isStale}, keep=${!isSelf && !isStale}`);
        return !isSelf && !isStale;
      });


      console.log('[NotePresence] ✅ Setting activeUsers state:', filteredUsers);
      console.log('[NotePresence] ✅ Filtered count:', filteredUsers.length);

      setActiveUsers(filteredUsers);


      const newRemoteCursors: Record<string, ActiveUser> = {};
      filteredUsers.forEach(u => {
        if (u.blockId) {
          console.log(`[NotePresence] 🗺️ Mapping blockId "${u.blockId}" → user "${u.name}"`);
          newRemoteCursors[u.blockId] = u;
        }
      });
      console.log('[NotePresence] 🗺️ Final remoteCursors:', Object.keys(newRemoteCursors));
      setRemoteCursors(newRemoteCursors);
    });


    socket.on('user_left', (userId: string) => {
      setActiveUsers(prev => (Array.isArray(prev) ? prev : []).filter(u => u.id !== userId));
      setRemoteCursors(prev => {
        const updated = { ...prev };

        Object.keys(updated).forEach(blockId => {
          if (updated[blockId]?.id === userId) {
            delete updated[blockId];
          }
        });
        return updated;
      });
    });


    socket.on('cursor_update', ({ userId, blockId }: { userId: string; blockId: string }) => {

      console.log('📡 [NotePresence] Received cursor_update:', { userId, blockId });

      setActiveUsers(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        const updatedUsers = prevArray.map(u =>
          u.id === userId ? { ...u, blockId, lastActive: Date.now() } : u
        );


        console.log('📡 [NotePresence] Updated users after cursor_update:', updatedUsers.map(u => ({ id: u.id, name: u.name, blockId: u.blockId })));


        const newRemoteCursors: Record<string, ActiveUser> = {};
        updatedUsers.forEach(u => {
          if (u.blockId) {
            newRemoteCursors[u.blockId] = u;
          }
        });


        console.log('📡 [NotePresence] remoteCursors map:', Object.keys(newRemoteCursors).map(blockId => ({ blockId, user: newRemoteCursors[blockId]?.name })));

        setRemoteCursors(newRemoteCursors);

        return updatedUsers;
      });
    });


    return () => {
      socket.emit('leave_note', { noteId, userId: user.uid });
      socket.disconnect();
      socketRef.current = null;
      setActiveUsers([]);
      setRemoteCursors({});
      setIsConnected(false);
    };
  }, [noteId, user?.uid, user?.displayName, user?.photoURL]);


  const updateCursorPosition = useCallback((blockId: string | undefined) => {

    console.log('📤 [NotePresence] updateCursorPosition called:', { blockId, socketConnected: socketRef.current?.connected, noteId, userId: user?.uid });

    if (socketRef.current?.connected && noteId && user) {
      console.log('📤 [NotePresence] Emitting cursor_move to server');
      socketRef.current.emit('cursor_move', {
        noteId,
        userId: user.uid,
        blockId,
      });
    } else {
      console.log('⚠️ [NotePresence] Cannot emit cursor_move - socket not connected or missing data');
    }
  }, [noteId, user]);


  const getRemoteUserForBlock = useCallback((blockId: string): ActiveUser | undefined => {
    return remoteCursors[blockId];
  }, [remoteCursors]);


  const collaborators: Collaborator[] = (Array.isArray(activeUsers) ? activeUsers : []).map(u => ({
    ...u,
    odId: u.id,
    displayName: u.name,
    photoURL: u.avatarUrl,
  }));

  return {
    activeUsers,
    collaborators,
    remoteCursors,
    isConnected,
    updateCursorPosition,
    getRemoteUserForBlock,
  };
};
