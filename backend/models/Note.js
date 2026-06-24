const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, default: 'Untitled' },
    content: { type: mongoose.Schema.Types.Mixed, default: null },

    ownerId: { type: String, required: true },
    folderId: { type: String, default: null },
    projectId: { type: String, default: null },
    sharedWith: { type: [String], default: [] },

    // Yjs collaborative state
    yjsState: { type: Buffer, default: null },
  },
  {
    timestamps: true,
    collection: 'notes',
  }
);

noteSchema.index({ ownerId: 1 });
noteSchema.index({ folderId: 1 });
noteSchema.index({ sharedWith: 1 });

module.exports = mongoose.model('Note', noteSchema);
