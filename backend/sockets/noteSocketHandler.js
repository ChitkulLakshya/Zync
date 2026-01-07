module.exports = (io) => {
  const notesNamespace = io.of('/notes'); // Dedicated namespace for notes

  notesNamespace.on('connection', (socket) => {
    // console.log('User connected to note namespace', socket.id);

    socket.on('join-note', (noteId) => {
      socket.join(noteId);
      // console.log(`Socket ${socket.id} joined note ${noteId}`);
    });

    socket.on('leave-note', (noteId) => {
      socket.leave(noteId);
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
      // Cleanup if needed
    });
  });
};
