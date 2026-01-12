const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  title: { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['Pending', 'Backlog', 'Ready', 'In Progress', 'In Review', 'Completed', 'Done'],
    default: 'Backlog'
  },
  assignedTo: { type: String, default: null }, // User UID
  assignedToName: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  commitInfo: {
    message: String,
    url: String,
    author: String,
    timestamp: Date
  }
});

const StepSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['Pending', 'Backlog', 'In Progress', 'Completed', 'Done'],
    default: 'Pending'
  },
  assignedTo: { type: String, default: null },
  type: { type: String, enum: ['Frontend', 'Backend', 'Database', 'Design', 'Other'], default: 'Other' },
  page: { type: String, default: 'General' },
  tasks: [TaskSchema] // Embedded tasks
});

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  githubRepoIds: { type: [String], default: [] }, // Linked Repositories
  architecture: {
    highLevel: { type: String },
    frontend: { type: Object },
    backend: { type: Object },
    database: { type: Object },
    integrations: { type: Array },
    apiFlow: { type: String },
    flow: { type: String }
  },
  steps: [StepSchema],
  ownerId: { type: String }, // Firebase User ID
  team: [{ type: String }], // Array of User IDs
  meetLink: { type: String }, // Google Meet Link
  githubRepo: { type: String },
  githubRepoName: { type: String }, // NEW
  githubRepoOwner: { type: String }, // NEW
  isTrackingActive: { type: Boolean, default: false }, // NEW
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', ProjectSchema);
