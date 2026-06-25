const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    ownerId:  { type: String, required: true },
    parentId: { type: String, default: null },

    type:  { type: String, default: 'personal' },
    color: { type: String, default: '#FFFFFF' },

    projectId:     { type: String, default: null },
    collaborators: { type: [String], default: [] },
  },
  {
    timestamps: true,
    collection: 'folders',
  }
);

folderSchema.index({ ownerId: 1, parentId: 1, name: 1 }, { unique: true });
folderSchema.index({ collaborators: 1 });

module.exports = mongoose.model('Folder', folderSchema);
