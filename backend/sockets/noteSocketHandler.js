const logger = require('../utils/logger');

module.exports = (io) => {
  const notesNamespace = io.of('/notes');

  const notePresence = new Map();

  const broadcastPresence = (noteId) => {
    if (!notePresence.has(noteId)) return;

    const users = notePresence.get(noteId);
    const userList = Array.from(users.values());

    logger.debug(
      `[NoteSocket] 📡 Broadcasting presence_update for note ${noteId}:`
    );
    logger.debug(`[NoteSocket] 📡 User count: ${userList.length}`);
    logger.debug(
      `[NoteSocket] 📡 Users:`,
      userList.map((u) => ({ id: u.id, name: u.name }))
    );

    notesNamespace.to(noteId).emit('presence_update', userList);
  };

  notesNamespace.on('connection', (socket) => {
    logger.info('[NoteSocket] ✅ User connected:', socket.id);

    socket.on(
      'join_note',
      ({ noteId, userId, userName, userAvatar, userColor }) => {
        logger.debug(`[NoteSocket] 🚪 join_note received:`, {
          noteId,
          userId,
          userName,
        });

        socket.join(noteId);
        socket.noteId = noteId;
        socket.odId = userId;

        if (!notePresence.has(noteId)) {
          notePresence.set(noteId, new Map());
        }

        const users = notePresence.get(noteId);
        users.set(userId, {
          id: userId,
          name: userName || 'Anonymous',
          avatarUrl: userAvatar,
          color: userColor || '#3b82f6',
          blockId: null,
          lastActive: Date.now(),
        });

        logger.info(
          `[NoteSocket] ✅ ${userName} (${userId}) joined note ${noteId}`
        );
        logger.debug(
          `[NoteSocket] 📊 Total users in note ${noteId}: ${users.size}`
        );

        broadcastPresence(noteId);
      }
    );

    socket.on('join-note', (noteId) => {
      socket.join(noteId);
      socket.noteId = noteId;
      socket.to(noteId).emit('user-joined-yjs');
    });

    socket.on(
      'presence-join',
      ({ noteId, odId, displayName, photoURL, color }) => {
        socket.odId = odId;

        if (!notePresence.has(noteId)) {
          notePresence.set(noteId, new Map());
        }

        const users = notePresence.get(noteId);
        users.set(odId, {
          id: odId,
          name: displayName || 'Anonymous',
          avatarUrl: photoURL,
          color: color || '#3b82f6',
          blockId: null,
          lastActive: Date.now(),
        });

        broadcastPresence(noteId);
      }
    );

    socket.on('cursor_move', ({ noteId, userId, blockId }) => {
      logger.debug(`[NoteSocket] 📍 cursor_move received:`, {
        noteId,
        userId,
        blockId,
      });

      if (!notePresence.has(noteId)) {
        logger.warn(`[NoteSocket] ⚠️ No presence map for note ${noteId}`);
        return;
      }

      const users = notePresence.get(noteId);
      if (users.has(userId)) {
        const user = users.get(userId);
        user.blockId = blockId;
        user.lastActive = Date.now();

        logger.debug(
          `[NoteSocket] 📍 Updated ${user.name}'s cursor to block ${blockId}`
        );
        logger.debug(
          `[NoteSocket] 📍 Emitting cursor_update to all users in note ${noteId}`
        );

        broadcastPresence(noteId);

        notesNamespace.to(noteId).emit('cursor_update', { userId, blockId });
      } else {
        logger.warn(`[NoteSocket] ⚠️ User ${userId} not found in presence map`);
      }
    });

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

    socket.on('leave_note', ({ noteId, userId }) => {
      socket.leave(noteId);

      if (notePresence.has(noteId)) {
        const users = notePresence.get(noteId);
        users.delete(userId);

        broadcastPresence(noteId);
        notesNamespace.to(noteId).emit('user_left', userId);

        if (users.size === 0) {
          notePresence.delete(noteId);
        }
      }
    });

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

    socket.on('note-update', ({ noteId, update }) => {
      socket.to(noteId).emit('note-update', update);
    });

    socket.on('awareness-update', ({ noteId, update }) => {
      socket.to(noteId).emit('awareness-update', update);
    });

    socket.on('disconnect', () => {
      const noteId = socket.noteId;
      const odId = socket.odId || socket.handshake?.query?.userId;

      if (noteId && odId && notePresence.has(noteId)) {
        const users = notePresence.get(noteId);
        users.delete(odId);

        logger.info(
          `[NoteSocket] User ${odId} disconnected from note ${noteId}`
        );

        broadcastPresence(noteId);
        notesNamespace.to(noteId).emit('user_left', odId);

        if (users.size === 0) {
          notePresence.delete(noteId);
        }
      }
    });
  });

  const cleanupInterval = setInterval(() => {
    if (notePresence.size === 0) {
      return;
    }

    const now = Date.now();
    const staleThreshold = 120000;

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

  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }
};
