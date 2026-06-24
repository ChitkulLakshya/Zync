const Message = require('../models/Message');
const mongoose = require('mongoose');
const logger = console;

/** Helper: is Mongoose connected? */
const isDbReady = () => mongoose.connection.readyState === 1;

/**
 * Chat Socket Handler — replaces Firebase Firestore for real-time messaging.
 *
 * Protocol:
 *   Client connects to  io.of('/chat')  with query  { userId }
 *   Events IN  → send-message, mark-seen, clear-chat, typing
 *   Events OUT → new-message, message-delivered, message-seen, messages-cleared, user-typing
 */
module.exports = (io) => {
  const chatNamespace = io.of('/chat');
  const DELIVERY_CATCHUP_BATCH_SIZE = Number.parseInt(
    process.env.DELIVERY_CATCHUP_BATCH_SIZE || '200',
    10
  );
  const DELIVERY_CATCHUP_MAX_BATCHES = Number.parseInt(
    process.env.DELIVERY_CATCHUP_MAX_BATCHES || '10',
    10
  );

  // userId → Set<socket.id>  (a user may have several tabs open)
  const userSockets = new Map();

  // ── helpers ───────────────────────────────────────────────────────
  const addSocket = (userId, socketId) => {
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socketId);
  };

  const removeSocket = (userId, socketId) => {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) userSockets.delete(userId);
  };

  /** Emit to every socket that belongs to `userId` */
  const emitToUser = (userId, event, data) => {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    for (const sid of sockets) {
      chatNamespace.to(sid).emit(event, data);
    }
  };

  // ── connection ────────────────────────────────────────────────────
  chatNamespace.on('connection', async (socket) => {
    const userId = socket.handshake.query.userId;
    if (!userId) {
      socket.disconnect();
      return;
    }

    addSocket(userId, socket.id);
    logger.log(`[ChatSocket] ✅ ${userId} connected (${socket.id})`);

    // ── delivery-catchup (mark queued messages as delivered) ─────────
    if (isDbReady()) {
      try {
        for (
          let batchIndex = 0;
          batchIndex < DELIVERY_CATCHUP_MAX_BATCHES;
          batchIndex++
        ) {
          const undelivered = await Message.find({
            receiverId: userId,
            delivered: false,
          })
            .select('_id senderId')
            .sort({ _id: 1 })
            .limit(DELIVERY_CATCHUP_BATCH_SIZE)
            .lean();

          if (undelivered.length === 0) break;

          const ids = undelivered.map((m) => m._id);
          await Message.updateMany(
            { _id: { $in: ids } },
            { $set: { delivered: true, deliveredAt: new Date() } }
          );

          // Notify senders about delivery
          const senderIds = [...new Set(undelivered.map((m) => m.senderId))];
          for (const sid of senderIds) {
            const msgIds = undelivered
              .filter((m) => m.senderId === sid)
              .map((m) => String(m._id));
            emitToUser(sid, 'message-delivered', { messageIds: msgIds });
          }

          if (undelivered.length < DELIVERY_CATCHUP_BATCH_SIZE) break;
        }
      } catch (err) {
        logger.error('[ChatSocket] delivery-catchup error:', err.message);
      }
    }

    // ── send-message ────────────────────────────────────────────────
    socket.on('send-message', async (payload) => {
      if (!isDbReady()) {
        socket.emit('chat-error', { error: 'Database not available' });
        return;
      }
      try {
        const {
          chatId,
          text,
          receiverId,
          senderName,
          senderPhotoURL,
          type = 'text',
          fileUrl,
          fileName,
          fileSize,
          projectId,
          projectName,
          projectOwnerId,
        } = payload;

        const msg = await Message.create({
          chatId,
          text: text || null,
          senderId: userId,
          senderName: senderName || 'User',
          senderPhotoURL: senderPhotoURL || null,
          receiverId,
          type,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          fileSize: fileSize ? parseInt(fileSize, 10) : null,
          projectId: projectId || null,
          projectName: projectName || null,
          projectOwnerId: projectOwnerId || null,
          delivered: userSockets.has(receiverId),
          deliveredAt: userSockets.has(receiverId) ? new Date() : null,
        });

        const msgObj = msg.toObject();
        msgObj.id = String(msgObj._id); // normalize for frontend

        // Echo back to the sender (all tabs)
        emitToUser(userId, 'new-message', msgObj);

        // Deliver to the receiver
        emitToUser(receiverId, 'new-message', msgObj);

        if (userSockets.has(receiverId)) {
          emitToUser(userId, 'message-delivered', { messageId: msgObj.id });
        }
      } catch (err) {
        logger.error('[ChatSocket] send-message error:', err);
        socket.emit('chat-error', { error: 'Failed to send message' });
      }
    });

    // ── mark-seen ───────────────────────────────────────────────────
    socket.on('mark-seen', async ({ messageIds, senderId }) => {
      if (!isDbReady()) return;
      try {
        if (!messageIds || messageIds.length === 0) return;

        await Message.updateMany(
          { _id: { $in: messageIds }, receiverId: userId },
          { $set: { seen: true, seenAt: new Date() } }
        );

        // Notify the original sender
        emitToUser(senderId, 'message-seen', { messageIds });
      } catch (err) {
        logger.error('[ChatSocket] mark-seen error:', err);
      }
    });

    // ── typing indicator ────────────────────────────────────────────
    socket.on('typing', ({ chatId, receiverId, isTyping }) => {
      emitToUser(receiverId, 'user-typing', { chatId, userId, isTyping });
    });

    // ── clear-chat ──────────────────────────────────────────────────
    socket.on('clear-chat', async ({ chatId, otherUserId }) => {
      if (!isDbReady()) {
        socket.emit('chat-error', { error: 'Database not available' });
        return;
      }
      try {
        await Message.deleteMany({ chatId });
        emitToUser(userId, 'messages-cleared', { chatId });
        emitToUser(otherUserId, 'messages-cleared', { chatId });
      } catch (err) {
        logger.error('[ChatSocket] clear-chat error:', err);
      }
    });

    // ── disconnect ──────────────────────────────────────────────────
    socket.on('disconnect', () => {
      removeSocket(userId, socket.id);
      logger.log(`[ChatSocket] ❌ ${userId} disconnected (${socket.id})`);
    });
  });
};
