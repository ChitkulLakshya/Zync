module.exports = (io) => {
  const notesNamespace = io.of('/notes'); // Dedicated namespace for notes

  // Track active users per note: noteId -> Map(userId -> userInfo)
  const notePresence = new Map();

  // Helper to broadcast presence update to all users in a note
  const broadcastPresence = (noteId) => {
    if (!notePresence.has(noteId)) return;
    
    const users = notePresence.get(noteId);
    const userList = Array.from(users.values());
    notesNamespace.to(noteId).emit('presence_update', userList);
  };

  notesNamespace.on('connection', (socket) => {
    console.log('[NoteSocket] User connected:', socket.id);

    // ═══════════════════════════════════════════════════════════════════════
    // JOIN NOTE - User joins a note room and announces presence
    // ═══════════════════════════════════════════════════════════════════════
    
    socket.on('join_note', ({ noteId, userId, userName, userAvatar, userColor }) => {
      // Join the socket room
      socket.join(noteId);
      socket.noteId = noteId;
      socket.odId = userId;

      // Initialize presence map for this note if needed
      if (!notePresence.has(noteId)) {
        notePresence.set(noteId, new Map());
      }

      // Add user to presence
      const users = notePresence.get(noteId);
      users.set(userId, {
        id: userId,
        name: userName || 'Anonymous',
        avatarUrl: userAvatar,
        color: userColor || '#3b82f6',
        blockId: null,
        lastActive: Date.now()
      });

      console.log(`[NoteSocket] ${userName} joined note ${noteId}`);
      
      // Broadcast updated presence to all users
      broadcastPresence(noteId);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // LEGACY JOIN (backwards compatibility)
    // ═══════════════════════════════════════════════════════════════════════
    
    socket.on('join-note', (noteId) => {
      socket.join(noteId);
      socket.noteId = noteId;
    });

    socket.on('presence-join', ({ noteId, odId, displayName, photoURL, color }) => {
      socket.odId = odId;
      socket.odId = identifier;

      if (!notePresence.has(noteId)) {
        notePresence.set(noteId, new Map());
      }

      const users = notePresence.get(noteId);
      users.set(identifier, {
        id: identifier,
        name: displayName || 'Anonymous',
        avatarUrl: photoURL,
        color: color || '#3b82f6',
        blockId: null,
        lastActive: Date.now()
      });

      broadcastPresence(noteId);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // CURSOR MOVE - User moves cursor to a different block
    // ═══════════════════════════════════════════════════════════════════════
    
    socket.on('cursor_move', ({ noteId, userId, blockId }) => {
      if (!notePresence.has(noteId)) return;

      const users = notePresence.get(noteId);
      if (users.has(userId)) {
        const user = users.get(userId);
        user.blockId = blockId;
        user.lastActive = Date.now();
        
        // Broadcast cursor update to all users
        broadcastPresence(noteId);
        
        // Also emit specific cursor event for real-time updates
        notesNamespace.to(noteId).emit('cursor_update', { userId, blockId });
      }
    });

    // Legacy cursor event
    socket.on('presence-cursor', ({ noteId, odId, blockId }) => {
      if (!notePresence.has(noteId)) return;

      const users = notePresence.get(noteId);
      if (users.has(odId)) {
        const user = users.get(odId);
        user.blockId = blockId;
        user.lastActive = Date.now();
        broadcastPresence(noteId);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // LEAVE NOTE - User leaves a note
    // ═══════════════════════════════════════════════════════════════════════
    
    socket.on('leave_note', ({ noteId, userId }) => {
      socket.leave(noteId);
      
      if (notePresence.has(noteId)) {
        const users = notePresence.get(noteId);
        users.delete(userId);
        
        broadcastPresence(noteId);
        notesNamespace.to(noteId).emit('user_left', userId);
        
        // Cleanup empty notes
        if (users.size === 0) {
          notePresence.delete(noteId);
        }
      }
    });

    // Legacy leave events
    socket.on('leave-note', (noteId) => {
      socket.leave(noteId);
    });

    socket.on('presence-leave', ({ noteId, odId }) => {
      if (notePresence.has(noteId)) {
        const users = notePresence.get(noteId);
        users.delete(odId);
        broadcastPresence(noteId);
        notesNamespace.to(noteId).emit('user_left', odId);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Y.JS DOCUMENT SYNC (for real-time collaboration)
    // ═══════════════════════════════════════════════════════════════════════
    
    socket.on('note-update', ({ noteId, update }) => {
      socket.to(noteId).emit('note-update', update);
    });

    socket.on('awareness-update', ({ noteId, update }) => {
      socket.to(noteId).emit('awareness-update', update);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // DISCONNECT - Cleanup when socket disconnects
    // ═══════════════════════════════════════════════════════════════════════
    
    socket.on('disconnect', () => {
      const noteId = socket.noteId;
      const odId = socket.odId || socket.handshake?.query?.userId;

      if (noteId && odId && notePresence.has(noteId)) {
        const users = notePresence.get(noteId);
        users.delete(odId);
        
        console.log(`[NoteSocket] User ${odId} disconnected from note ${noteId}`);
        
        broadcastPresence(noteId);
        notesNamespace.to(noteId).emit('user_left', odId);

        // Cleanup empty notes
        if (users.size === 0) {
          notePresence.delete(noteId);
        }
      }
    });
  });

  // Periodic cleanup of stale users (every 30 seconds)
  setInterval(() => {
    const now = Date.now();
    const staleThreshold = 120000; // 2 minutes

    for (const [noteId, users] of notePresence.entries()) {
      let hasStaleUsers = false;
      
      for (const [odId, user] of users.entries()) {
        if (now - user.lastActive > staleThreshold) {
          users.delete(odId);
          hasStaleUsers = true;
        }
      }

      if (hasStaleUsers) {
        broadcastPresence(noteId);
      }

      if (users.size === 0) {
        notePresence.delete(noteId);
      }
    }
  }, 30000);
};
