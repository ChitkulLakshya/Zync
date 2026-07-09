const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chatId:    { type: String, required: true, index: true },
    text:      { type: String, default: null },
    senderId:  { type: String, required: true },
    senderName: { type: String, default: 'User' },
    senderPhotoURL: { type: String, default: null },
    receiverId: { type: String, required: true, index: true },

    type: {
      type: String,
      enum: ['text', 'image', 'file', 'project-invite', 'request'],
      default: 'text',
    },
    fileUrl:  { type: String, default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: null },

    // project-invite specific
    projectId:      { type: String, default: null },
    projectName:    { type: String, default: null },
    projectOwnerId: { type: String, default: null },

    seen:        { type: Boolean, default: false },
    seenAt:      { type: Date, default: null },
    delivered:   { type: Boolean, default: false },
    deliveredAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    collection: 'messages', // matches Prisma @@map("messages")
  }
);

// Compound indexes matching the Prisma schema
messageSchema.index({ chatId: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, delivered: 1 });
messageSchema.index({ receiverId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
