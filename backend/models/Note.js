const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: 'Untitled'
  },
  content: {
    type: Object, // Stores BlockNote/Prosemirror JSON structure
    default: {}
  },
  ownerId: {
    type: String, // Matches User.uid (Firebase UID)
    required: true,
    index: true
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null // Null implies root level
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isShared: {
    type: Boolean,
    default: false
  },
  collaborators: [{
    type: String // Array of User UIDs
  }],
  tags: [{
    type: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
