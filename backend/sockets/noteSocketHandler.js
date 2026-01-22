module.exports = (io) => {
  const notesNamespace = io.of('/notes'); // Dedicated namespace for notes

  // Track active users per note
  const notePresence = new Map(); // noteId -> Map(userId -> userInfo)

  notesNamespace.on('connection', (socket) => {
    // console.log('User connected to note namespace', socket.id);

    socket.on('join-note', (noteId) => {
      socket.join(noteId);
      socket.noteId = noteId;
      // console.log(`Socket ${socket.id} joined note ${noteId}`);
    });

    socket.on('leave-note', (noteId) => {
      socket.leave(noteId);
    });

    // Presence: user joined a note
    socket.on('presence-join', ({ noteId, odId, userId, displayName, photoURL, color }) => {
      const odIdentifier = odId || userId; // Accept both for compatibility
      if (!notePresence.has(noteId)) {
        notePresence.set(noteId, new Map());
      }
      
      const users = notePresence.get(noteId);
      users.set(odIdentifier, {
        odId: odIdentifier,
        displayName,
        photoURL,
        color,
        blockId: null,
        lastActive: Date.now()
      });

      // Broadcast updated presence list to all in room
      const userList = Array.from(users.values());
      notesNamespace.to(noteId).emit('presence-update', userList);
    });

    // Presence: cursor/block position update
    socket.on('presence-cursor', ({ noteId, odId, blockId }) => {
      if (notePresence.has(noteId)) {
        const users = notePresence.get(noteId);
        if (users.has(odId)) {
          const user = users.get(odId);
          user.blockId = blockId;
          user.lastActive = Date.now();
          
          const userList = Array.from(users.values());
          notesNamespace.to(noteId).emit('presence-update', userList);
        }
      }
    });

    // Presence: user left
    socket.on('presence-leave', ({ noteId, odId }) => {
      if (notePresence.has(noteId)) {
        const users = notePresence.get(noteId);
        users.delete(odId);
        
        const userList = Array.from(users.values());
        notesNamespace.to(noteId).emit('presence-update', userList);
        notesNamespace.to(noteId).emit('presence-left', odId);
      }
    });

    // Relay Y.js document updates
    // The client sends { noteId, update } where update is the binary Uint8Array (or base64 string)
    socket.on('note-update', ({ noteId, update }) => {
      // Broadcast to everyone else in the room
      socket.to(noteId).emit('note-update', update);
    });

    // Relay cursor/awareness updates
    socket.on('awareness-update', ({ noteId, update }) => {
      socket.to(noteId).emit('awareness-update', update);
    });

    socket.on('disconnect', () => {
      // Cleanup presence on disconnect
      if (socket.noteId && socket.handshake?.query?.userId) {
        const noteId = socket.noteId;
        const odId = socket.handshake.query.userId;
        
        if (notePresence.has(noteId)) {
          const users = notePresence.get(noteId);
          users.delete(odId);
          
          const userList = Array.from(users.values());
          notesNamespace.to(noteId).emit('presence-update', userList);
          notesNamespace.to(noteId).emit('presence-left', odId);
        }
      }
    });
  });
};
