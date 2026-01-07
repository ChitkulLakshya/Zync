const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  ownerId: {
    type: String, // Firebase UID
    required: true,
    index: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  type: {
    type: String,
    enum: ['personal', 'team', 'project'],
    default: 'personal' // Default to personal
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  collaborators: [{
    type: String // Array of User UIDs
  }],
  color: {
    type: String,
    default: '#FFFFFF'
  }
}, { timestamps: true });

// Compound index to ensure unique folder names per user at the same level
folderSchema.index({ ownerId: 1, parentId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Folder', folderSchema);
