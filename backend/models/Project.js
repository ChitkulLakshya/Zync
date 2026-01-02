const mongoose = require('mongoose');

const StepSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  assignedTo: { type: String, default: null }, // User ID or Name
  type: { type: String, enum: ['Frontend', 'Backend', 'Database', 'Design', 'Other'], default: 'Other' },
  page: { type: String, default: 'General' } // Related page/module
});

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  architecture: {
    frontend: { type: Object },
    backend: { type: Object },
    database: { type: Object },
    integrations: { type: Array },
    flow: { type: String }
  },
  steps: [StepSchema],
  ownerId: { type: String }, // Firebase User ID
  team: [{ type: String }], // Array of User IDs
  githubRepo: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', ProjectSchema);
